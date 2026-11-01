import { isPrivateMarker } from "@/lib/ckan/privacy";
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
  let authorizationPhase = "resource_show";
  try {
    const resource = await ckanAction(
      "resource_show",
      { id: resourceId },
      ckanOptions,
    );
    // CKAN's built-in Resource privacy is inherited from its parent dataset.
    // A custom resource.private flag is not an independent CKAN ACL and must
    // never be bypassed merely because a session cookie is present.
    if (
      !resource ||
      resource.id !== resourceId ||
      resource.state !== "active" ||
      isPrivateMarker(resource.private) ||
      !resource.package_id
    ) {
      console.warn("public_resource_download_denied", {
        resourceId,
        phase: authorizationPhase,
        reason: isPrivateMarker(resource?.private)
          ? "unsupported_resource_private_acl"
          : "resource_not_visible",
        sessionForwarded: Boolean(sessionCookie),
      });
      return errorResponse(404, "Berkas tidak ditemukan.");
    }

    authorizationPhase = "package_show";
    const dataset = await ckanAction(
      "package_show",
      { id: resource.package_id },
      ckanOptions,
    );
    if (
      !dataset ||
      dataset.id !== resource.package_id ||
      (!sessionCookie && isPrivateMarker(dataset.private)) ||
      dataset.state !== "active" ||
      (dataset.name !== datasetSlug && dataset.id !== datasetSlug)
    ) {
      console.warn("public_resource_download_denied", {
        resourceId,
        phase: authorizationPhase,
        reason:
          !sessionCookie && isPrivateMarker(dataset?.private)
            ? "session_cookie_missing"
            : "dataset_not_visible_or_mismatched",
        sessionForwarded: Boolean(sessionCookie),
      });
      return errorResponse(404, "Berkas tidak tersedia untuk publik.");
    }
    // CKAN's resource_show auth delegates to package_show for the parent
    // dataset. The explicit package_show also validates the dataset slug/id.
    // package_show.resources is only a metadata summary and is not an ACL gate.

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
      authorizationPhase = "file_show";
      try {
        file = await ckanAction("file_show", { id: fileId }, ckanOptions);
      } catch (error) {
        const status = Number(error?.status || 0);
        if ([401, 403, 404].includes(status)) {
          console.warn("public_resource_download_denied", {
            resourceId,
            phase: authorizationPhase,
            upstreamStatus: status,
            sessionForwarded: Boolean(sessionCookie),
          });
          return errorResponse(
            404,
            "Berkas tidak ditemukan pada metadata FileStore CKAN.",
          );
        }
        throw error;
      }
      if (
        !file ||
        file.id !== fileId ||
        isPrivateMarker(file.private) ||
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
      if (ownerType === "resource") {
        if (!ownerId || ownerId !== resourceId)
          return errorResponse(
            404,
            "Berkas bukan milik resource yang diminta.",
          );
      } else if (ownerType === "package") {
        if (!ownerId || ownerId !== dataset.id)
          return errorResponse(404, "Berkas bukan milik dataset yang diminta.");
      } else {
        // Editorial media, group logos, user files and unknown owner types use
        // separate policies. Missing owner metadata is never a reason to trust
        // legacy file.resource_id/file.package_id hints.
        return errorResponse(
          404,
          "Kepemilikan berkas tidak dapat diverifikasi.",
        );
      }
      // The FileStore download endpoint performs CKAN's final
      // permission_download_file check using the same forwarded user session.
      upstreamPath = `/file/download/${encodeURIComponent(fileId)}`;
    } else {
      return errorResponse(404, "Alamat berkas tidak valid.");
    }

    // Fetch only the validated CKAN path against the private service origin.
    // Never fetch the public hostname here: that would loop through Caddy/Next.
    authorizationPhase = "file_download";
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
    if ([401, 403, 404, 410].includes(upstream.status))
      return errorResponse(
        404,
        "Berkas tidak ditemukan atau tidak diizinkan oleh CKAN.",
      );
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
      "Cache-Control": "private, no-store",
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
    if (
      upstreamStatus === 401 ||
      upstreamStatus === 403 ||
      upstreamStatus === 404
    ) {
      console.warn("public_resource_download_denied", {
        resourceId,
        phase: authorizationPhase,
        upstreamStatus,
        sessionForwarded: Boolean(sessionCookie),
      });
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
