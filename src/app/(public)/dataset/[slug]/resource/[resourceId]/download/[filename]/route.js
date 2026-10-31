import { ckanAction } from "@/lib/ckan/client";

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

  try {
    const resource = await ckanAction(
      "resource_show",
      { id: resourceId },
      { revalidate: 0 },
    );
    if (
      !resource ||
      resource.id !== resourceId ||
      resource.state !== "active" ||
      resource.private === true ||
      !resource.package_id
    ) {
      return errorResponse(404, "Berkas tidak ditemukan.");
    }

    const dataset = await ckanAction(
      "package_show",
      { id: resource.package_id },
      { revalidate: 0 },
    );
    if (
      !dataset ||
      dataset.private === true ||
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
      publicResource.private === true
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
    if (!pathMatch) return errorResponse(404, "Alamat berkas tidak valid.");
    let sourceFilename = "";
    try {
      sourceFilename = decodeURIComponent(pathMatch[1]);
    } catch {
      return errorResponse(404, "Nama berkas tidak valid.");
    }
    const requestedFilename = String(params?.filename || "");
    if (!sourceFilename || sourceFilename !== requestedFilename) {
      return errorResponse(
        404,
        "Nama berkas tidak sesuai dengan resource CKAN.",
      );
    }

    // Fetch only the validated CKAN path against the private service origin.
    // Never fetch the public hostname here: that would loop through Caddy/Next.
    const upstreamUrl = new URL(source.pathname, apiBase.origin);
    const headers = new Headers();
    const range = request.headers.get("range");
    const ifRange = request.headers.get("if-range");
    if (range) headers.set("Range", range);
    if (ifRange) headers.set("If-Range", ifRange);

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
      "Cache-Control": "public, max-age=300, stale-while-revalidate=1800",
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
    console.error("public_resource_download_failed", {
      resourceId,
      status: error?.status || null,
    });
    return errorResponse(
      error?.status === 404 ? 404 : 502,
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
