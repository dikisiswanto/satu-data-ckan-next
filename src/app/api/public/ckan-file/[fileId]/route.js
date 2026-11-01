import { ckanAction } from "@/lib/ckan/client";
import {
  buildCkanSessionCookieHeader,
  getCkanSessionCookieFromRequest,
} from "@/lib/ckan/session";
import { isPrivateMarker } from "@/lib/ckan/privacy";

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

function isActiveRecord(record) {
  return Boolean(record && record.state === "active");
}

function isVisiblePackageToViewer(record, sessionCookie) {
  // A forwarded session identifies the user; CKAN's successful package_show
  // call below is the authorization decision for private datasets.
  return (
    isActiveRecord(record) &&
    (Boolean(sessionCookie) || !isPrivateMarker(record.private))
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

async function verifyFileOwner(file, fileId, sessionCookie) {
  if (
    !file ||
    file.id !== fileId ||
    isPrivateMarker(file.private) ||
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
  if (!ownerId || (ownerType !== "resource" && ownerType !== "package"))
    return false;

  const ckanOptions = { revalidate: 0, sessionCookie };
  if (ownerType === "resource") {
    const resource = await ckanAction(
      "resource_show",
      { id: ownerId },
      ckanOptions,
    );
    // CKAN core Resource visibility inherits Package visibility. A custom
    // resource.private flag has no built-in ACL and is therefore always denied.
    if (
      !isActiveRecord(resource) ||
      isPrivateMarker(resource.private) ||
      resource.id !== ownerId ||
      !resource.package_id
    )
      return false;
    const dataset = await ckanAction(
      "package_show",
      { id: resource.package_id },
      ckanOptions,
    );
    return Boolean(
      isVisiblePackageToViewer(dataset, sessionCookie) &&
      dataset.id === resource.package_id,
    );
  }

  const dataset = await ckanAction(
    "package_show",
    { id: ownerId },
    ckanOptions,
  );
  return Boolean(
    isVisiblePackageToViewer(dataset, sessionCookie) && dataset.id === ownerId,
  );
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

  const sessionCookie = getCkanSessionCookieFromRequest(request);
  let file;
  try {
    file = await ckanAction(
      "file_show",
      { id: fileId },
      { revalidate: 0, sessionCookie },
    );
    if (!(await verifyFileOwner(file, fileId, sessionCookie)))
      return errorResponse(404);
  } catch (error) {
    return errorResponse(
      [401, 403, 404].includes(Number(error?.status)) ? 404 : 502,
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
  const forwardedCookie = buildCkanSessionCookieHeader(sessionCookie);
  if (forwardedCookie) requestHeaders.set("Cookie", forwardedCookie);
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

  // CKAN's generic FileStore endpoint performs the final permission_download_file
  // check. Metadata authorization above is necessary but is not sufficient.
  let upstream;
  try {
    upstream = await fetch(
      new URL(`/file/download/${encodeURIComponent(fileId)}`, internalOrigin),
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
      [401, 403, 404, 410].includes(upstream.status) ? 404 : 502,
      "Berkas tidak ditemukan atau tidak diizinkan oleh FileStore CKAN.",
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
    "Cache-Control": "private, no-store",
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
