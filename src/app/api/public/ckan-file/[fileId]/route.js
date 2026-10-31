import { ckanAction } from "@/lib/ckan/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FILE_ID = /^[a-f0-9-]{32,36}$/i;
const TIMEOUT_MS = 120_000;
const MAX_INLINE_IMAGE_BYTES = 20 * 1024 * 1024;
const INLINE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
]);
const DOWNLOAD_TYPES = new Set([
  "application/pdf",
  "application/json",
  "application/geo+json",
  "application/vnd.geo+json",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.text",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-parquet",
  "application/vnd.apache.parquet",
  "application/octet-stream",
  "text/csv",
  "text/plain",
  "text/tab-separated-values",
  "application/xml",
  "application/vnd.google-earth.kml+xml",
]);

function errorResponse(status, message = "Berkas publik tidak ditemukan.") {
  return new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}

function isPublicRecord(record) {
  return Boolean(
    record && record.state === "active" && record.private !== true,
  );
}

function safeFilename(value, fallback) {
  const candidate = String(value || fallback || "public-file.bin")
    .replace(/[\\/\r\n"\u0000]/g, "_")
    .replace(/[^\p{L}\p{N}._() -]/gu, "_")
    .trim()
    .slice(0, 180);
  return candidate || "public-file.bin";
}

function fileMime(file) {
  return String(
    file?.content_type || file?.mimetype || "application/octet-stream",
  )
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
}

async function verifyPublicFileOwner(file, fileId) {
  if (
    !file ||
    file.id !== fileId ||
    file.private === true ||
    (file.state && file.state !== "active")
  )
    return false;

  const owner =
    file.owner_info && typeof file.owner_info === "object"
      ? file.owner_info
      : {};
  const ownerType = String(
    owner.owner_type || file.owner_type || "",
  ).toLowerCase();
  const ownerId = String(owner.owner_id || file.owner_id || "");

  // The dedicated editorial media route has a separate owner check, and group
  // logos use CKAN's public-download/groups FileStore path. Do not broaden this
  // generic proxy to those owner types.
  if (
    ownerType === "wajo_media" ||
    ownerType === "group" ||
    ownerType === "user" ||
    ownerType === "organization"
  )
    return false;

  const resourceId =
    ownerType === "resource" ? ownerId : String(file.resource_id || "");
  const packageId =
    ownerType === "package" ? ownerId : String(file.package_id || "");

  if (resourceId) {
    if (ownerType === "package" && packageId && ownerId !== packageId)
      return false;
    const resource = await ckanAction(
      "resource_show",
      { id: resourceId },
      { revalidate: 0 },
    );
    if (
      !isPublicRecord(resource) ||
      resource.id !== resourceId ||
      !resource.package_id
    )
      return false;
    if (packageId && resource.package_id !== packageId) return false;
    const dataset = await ckanAction(
      "package_show",
      { id: resource.package_id },
      { revalidate: 0 },
    );
    if (!isPublicRecord(dataset) || dataset.id !== resource.package_id)
      return false;
    const matchingResource = (
      Array.isArray(dataset.resources) ? dataset.resources : []
    ).find((item) => item?.id === resourceId);
    return Boolean(matchingResource && isPublicRecord(matchingResource));
  }

  if (packageId) {
    const dataset = await ckanAction(
      "package_show",
      { id: packageId },
      { revalidate: 0 },
    );
    return Boolean(isPublicRecord(dataset) && dataset.id === packageId);
  }

  return false;
}

function imageSignatureMatches(bytes, mime) {
  if (!bytes || bytes.length < 12) return false;
  const ascii = (start, end) => String.fromCharCode(...bytes.slice(start, end));
  if (mime === "image/png") return ascii(0, 8) === "\x89PNG\r\n\x1a\n";
  if (mime === "image/jpeg")
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/gif") return ["GIF87a", "GIF89a"].includes(ascii(0, 6));
  if (mime === "image/webp")
    return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  if (mime === "image/avif")
    return ascii(4, 12).includes("ftyp") || ascii(4, 12).includes("avif");
  return false;
}

async function readBoundedImage(body) {
  if (!body) return null;
  const reader = body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_INLINE_IMAGE_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function handle(request, context) {
  const params = await context.params;
  const fileId = String(params?.fileId || "");
  if (!FILE_ID.test(fileId)) return errorResponse(404);

  let file;
  try {
    file = await ckanAction("file_show", { id: fileId }, { revalidate: 0 });
    if (!(await verifyPublicFileOwner(file, fileId))) return errorResponse(404);
  } catch (error) {
    return errorResponse(
      [403, 404].includes(Number(error?.status)) ? 404 : 502,
      "Berkas tidak tersedia untuk publik.",
    );
  }

  const mime = fileMime(file);
  if (!INLINE_TYPES.has(mime) && !DOWNLOAD_TYPES.has(mime))
    return errorResponse(415, "Format berkas publik tidak didukung.");
  if (INLINE_TYPES.has(mime) && Number(file.size || 0) > MAX_INLINE_IMAGE_BYTES)
    return errorResponse(413, "Ukuran gambar melebihi batas layanan.");

  let internalOrigin;
  try {
    internalOrigin = new URL(
      process.env.CKAN_API_INTERNAL_URL || "http://ckan:5000/api/3/action",
    ).origin;
  } catch {
    return errorResponse(503, "Penyimpanan CKAN belum dikonfigurasi.");
  }

  const requestHeaders = new Headers({ Accept: mime });
  for (const name of [
    "range",
    "if-range",
    "if-none-match",
    "if-modified-since",
  ]) {
    const value = request.headers.get(name);
    if (value)
      requestHeaders.set(
        name === "range"
          ? "Range"
          : name === "if-range"
            ? "If-Range"
            : name === "if-none-match"
              ? "If-None-Match"
              : "If-Modified-Since",
        value,
      );
  }

  let upstream;
  try {
    upstream = await fetch(
      new URL(`/file/${encodeURIComponent(fileId)}`, internalOrigin),
      {
        method: request.method === "HEAD" ? "HEAD" : "GET",
        headers: requestHeaders,
        cache: "no-store",
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
  } catch {
    return errorResponse(502, "Penyimpanan CKAN tidak dapat dihubungi.");
  }
  if (upstream.status >= 300 && upstream.status < 400)
    return errorResponse(
      502,
      "CKAN mengembalikan pengalihan berkas yang tidak diizinkan.",
    );
  if (![200, 206, 304, 416].includes(upstream.status)) {
    return errorResponse(
      upstream.status === 404 || upstream.status === 410 ? 404 : 502,
      "Berkas tidak ditemukan di FileStore CKAN.",
    );
  }

  const upstreamMime = String(upstream.headers.get("content-type") || mime)
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (
    upstreamMime !== mime ||
    upstreamMime === "text/html" ||
    upstreamMime === "image/svg+xml"
  ) {
    return errorResponse(
      415,
      "Jenis konten berkas tidak sesuai metadata CKAN.",
    );
  }

  let body =
    request.method === "HEAD" || upstream.status === 304 ? null : upstream.body;
  if (INLINE_TYPES.has(mime) && body) {
    const bytes = await readBoundedImage(body);
    if (!bytes)
      return errorResponse(413, "Ukuran gambar melebihi batas layanan.");
    if (!imageSignatureMatches(bytes, mime))
      return errorResponse(415, "Konten gambar tidak valid.");
    body = bytes;
  }

  const fallbackName = file.name || file.filename || `${fileId}.bin`;
  const filename = safeFilename(fallbackName, `${fileId}.bin`);
  const disposition =
    INLINE_TYPES.has(mime) || mime === "application/pdf"
      ? "inline"
      : "attachment";
  const headers = new Headers({
    "Content-Type": mime,
    "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(filename)}`,
    "Cache-Control": "public, max-age=300, stale-while-revalidate=1800",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    "Cross-Origin-Resource-Policy": "same-site",
    "Content-Security-Policy": "default-src 'none'; sandbox",
  });
  if (body && INLINE_TYPES.has(mime))
    headers.set("Content-Length", String(body.byteLength));
  else {
    for (const key of [
      "content-length",
      "content-range",
      "accept-ranges",
      "etag",
      "last-modified",
    ]) {
      const value = upstream.headers.get(key);
      if (value) headers.set(key, value);
    }
  }

  return new Response(body, { status: upstream.status, headers });
}

export async function GET(request, context) {
  return handle(request, context);
}
export async function HEAD(request, context) {
  return handle(request, context);
}
