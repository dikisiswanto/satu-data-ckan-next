import { ckanAction } from "@/lib/ckan/client";
import {
  buildCkanSessionCookieHeader,
  getCkanSessionCookieFromRequest,
} from "@/lib/ckan/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIMEOUT_MS = 120_000;
const ID_PATTERN = /^[a-f0-9-]{16,64}$/i;
const FILENAME_PATTERN = /^[\p{L}\p{N}._() -]{1,180}$/u;

function safeFilename(value, fallback) {
  const candidate = String(value || "")
    .replace(/[\r\n"\\/]/g, "_")
    .trim();
  return FILENAME_PATTERN.test(candidate) ? candidate : fallback;
}

function errorResponse(status, message) {
  return new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}

async function handle(request, context) {
  const params = await context.params;
  const resourceId = String(params?.resourceId || "");
  const datasetSlug = String(params?.slug || "");
  if (
    !ID_PATTERN.test(resourceId) ||
    !datasetSlug ||
    datasetSlug.length > 200
  ) {
    return errorResponse(404, "Berkas tidak ditemukan.");
  }

  const sessionCookie = getCkanSessionCookieFromRequest(request);
  const ckanOptions = { revalidate: 0, sessionCookie };
  try {
    const resource = await ckanAction(
      "resource_show",
      { id: resourceId },
      ckanOptions,
    );
    if (
      !resource ||
      resource.id !== resourceId ||
      resource.state !== "active" ||
      (!sessionCookie && resource.private === true) ||
      !resource.package_id
    ) {
      return errorResponse(404, "Berkas tidak ditemukan.");
    }

    const dataset = await ckanAction(
      "package_show",
      { id: resource.package_id },
      ckanOptions,
    );
    if (
      !dataset ||
      (!sessionCookie && dataset.private === true) ||
      dataset.state !== "active" ||
      (dataset.name !== datasetSlug && dataset.id !== datasetSlug)
    ) {
      return errorResponse(404, "Berkas tidak tersedia untuk publik.");
    }
    const publicResource = (dataset.resources || []).find(
      (item) => item.id === resourceId,
    );
    if (
      !publicResource ||
      publicResource.state !== "active" ||
      (!sessionCookie && publicResource.private === true)
    ) {
      return errorResponse(404, "Berkas tidak tersedia untuk publik.");
    }

    // CKAN may return an absolute public URL or a relative download path.
    // Only its validated pathname is reused; the original host is never fetched.
    const apiBase = new URL(
      process.env.CKAN_API_INTERNAL_URL || "http://ckan:5000/api/3/action",
    );
    const source = new URL(String(resource.url || ""), apiBase.origin);
    const escapeRegex = (value) =>
      String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const datasetPathIds = [dataset.id, dataset.name]
      .filter(Boolean)
      .map(escapeRegex)
      .join("|");
    const expectedPath = new RegExp(
      `^/dataset/(?:${datasetPathIds})/resource/${resourceId}/download/([^/]+)/?$`,
    );
    const pathMatch = source.pathname.match(expectedPath);
    const genericFileMatch = source.pathname.match(
      /^\/file\/(?:download\/)?([a-f0-9-]{32,36})\/?$/i,
    );
    const requestedFilename = String(params?.filename || "");
    let upstreamPath = "";

    if (pathMatch) {
      let sourceFilename = "";
      try {
        sourceFilename = decodeURIComponent(pathMatch[1]);
      } catch {
        return errorResponse(404, "Nama berkas tidak valid.");
      }
      if (!sourceFilename || sourceFilename !== requestedFilename) {
        return errorResponse(
          404,
          "Nama berkas tidak sesuai dengan resource CKAN.",
        );
      }
      upstreamPath = source.pathname;
    } else if (genericFileMatch) {
      if (resource.name && requestedFilename !== String(resource.name)) {
        return errorResponse(
          404,
          "Nama berkas tidak sesuai dengan metadata resource CKAN.",
        );
      }
      // Some CKAN resources expose their FileStore record URL instead of the
      // dataset/resource download URL. file_show is metadata only; verify the
      // owner chain before using CKAN 2.12's /file/download/<id> endpoint.
      const fileId = genericFileMatch[1];
      let file;
      try {
        file = await ckanAction("file_show", { id: fileId }, ckanOptions);
      } catch {
        return errorResponse(
          404,
          "Berkas tidak ditemukan pada metadata FileStore CKAN.",
        );
      }
      if (
        !file ||
        file.id !== fileId ||
        (!sessionCookie && file.private === true) ||
        (file.state && file.state !== "active")
      ) {
        return errorResponse(404, "Berkas tidak tersedia untuk publik.");
      }
      const owner =
        file.owner_info && typeof file.owner_info === "object"
          ? file.owner_info
          : {};
      const ownerType = String(
        owner.owner_type || file.owner_type || "",
      ).toLowerCase();
      const ownerId = String(owner.owner_id || file.owner_id || "");
      const fileResourceId =
        ownerType === "resource" ? ownerId : String(file.resource_id || "");
      const filePackageId =
        ownerType === "package" ? ownerId : String(file.package_id || "");
      if (
        ownerType === "wajo_media" ||
        ownerType === "group" ||
        ownerType === "user" ||
        ownerType === "organization"
      ) {
        return errorResponse(
          404,
          "Berkas bukan milik resource dataset publik.",
        );
      }
      if (fileResourceId && fileResourceId !== resourceId) {
        return errorResponse(404, "Berkas bukan milik resource yang diminta.");
      }
      if (filePackageId && filePackageId !== dataset.id) {
        return errorResponse(404, "Berkas bukan milik dataset yang diminta.");
      }
      if (!fileResourceId && !filePackageId) {
        return errorResponse(
          404,
          "Kepemilikan berkas tidak dapat diverifikasi.",
        );
      }
      // A package-owned file must belong to the same dataset. A resource-owned
      // file must refer to this exact resource. The resource_show/package_show
      // checks above establish that the requested resource is public.
      upstreamPath = `/file/download/${encodeURIComponent(fileId)}`;
    } else {
      return errorResponse(404, "Alamat berkas tidak valid.");
    }

    // Fetch only the validated CKAN path against the private service origin.
    // Never fetch the public hostname here: that would loop through Caddy/Next.
    const upstreamUrl = new URL(upstreamPath, apiBase.origin);
    const headers = new Headers();
    const range = request.headers.get("range");
    const ifRange = request.headers.get("if-range");
    if (range) headers.set("Range", range);
    if (ifRange) headers.set("If-Range", ifRange);
    const forwardedCookie = buildCkanSessionCookieHeader(sessionCookie);
    if (forwardedCookie) headers.set("Cookie", forwardedCookie);

    const upstream = await fetch(upstreamUrl, {
      method: request.method === "HEAD" ? "HEAD" : "GET",
      headers,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (upstream.status === 404 || upstream.status === 410)
      return errorResponse(404, "Berkas tidak ditemukan di penyimpanan CKAN.");
    if (upstream.status >= 300 && upstream.status < 400)
      return errorResponse(
        502,
        "CKAN mengembalikan pengalihan unduhan yang tidak diizinkan.",
      );
    if (![200, 206, 304, 416].includes(upstream.status))
      return errorResponse(502, "Layanan berkas CKAN sedang tidak tersedia.");

    const filename = safeFilename(
      params?.filename,
      safeFilename(resource.name, `${resourceId}.bin`),
    );
    const contentType = String(
      upstream.headers.get("content-type") ||
        resource.mimetype ||
        "application/octet-stream",
    )
      .split(";", 1)[0]
      .trim()
      .toLowerCase();
    // CKAN login/error HTML returned with HTTP 200 is not a downloadable file.
    // JSON and plain text are legitimate resource formats, so reject JSON only
    // when it contradicts the resource filename (e.g. an XLSX URL returning an API error).
    const isJsonFile = /\.(?:json|geojson|topojson)$/i.test(filename);
    if (
      ["text/html", "application/xhtml+xml"].includes(contentType) ||
      ((contentType === "application/json" || contentType.endsWith("+json")) &&
        !isJsonFile)
    ) {
      return errorResponse(
        502,
        "CKAN tidak mengirimkan berkas. Periksa akses FileStore dan jalur unduhan publik.",
      );
    }
    const responseHeaders = new Headers({
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": sessionCookie
        ? "private, no-store"
        : "public, max-age=300, stale-while-revalidate=1800",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    });
    for (const key of [
      "content-length",
      "content-range",
      "accept-ranges",
      "etag",
      "last-modified",
    ]) {
      const value = upstream.headers.get(key);
      if (value) responseHeaders.set(key, value);
    }
    return new Response(
      request.method === "HEAD" || upstream.status === 304
        ? null
        : upstream.body,
      {
        status: upstream.status,
        headers: responseHeaders,
      },
    );
  } catch (error) {
    const upstreamStatus = Number(error?.status || 0);
    // CKAN intentionally denies package/resource metadata for private or
    // unpublished records. On a public route this is an expected visibility
    // result, not an infrastructure failure. Return 404 to avoid disclosing
    // whether a private dataset/resource exists and do not attempt a file stream.
    if (upstreamStatus === 403 || upstreamStatus === 404) {
      return errorResponse(
        404,
        "Dataset atau resource tidak tersedia untuk publik.",
      );
    }
    console.error("public_resource_download_failed", {
      resourceId,
      status: upstreamStatus || null,
    });
    return errorResponse(
      502,
      "Unduhan belum dapat disiapkan. Silakan coba kembali.",
    );
  }
}

export async function GET(request, context) {
  return handle(request, context);
}
export async function HEAD(request, context) {
  return handle(request, context);
}
