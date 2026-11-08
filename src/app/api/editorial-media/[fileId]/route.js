import { ckanAction } from "@/lib/ckan/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FILE_ID = /^[a-f0-9-]{32,36}$/i;
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);
const MAX_BYTES = 8 * 1024 * 1024;
const TIMEOUT_MS = 10_000;
const GENERIC_MIME_TYPES = new Set(["", "application/octet-stream"]);
const MEDIA_OWNER_TYPE =
  process.env.CKAN_EDITORIAL_MEDIA_OWNER_TYPE || "portal_media";
const MEDIA_OWNER_ID =
  process.env.CKAN_EDITORIAL_MEDIA_OWNER_ID || "public-editorial-media";

function empty(status) {
  return new Response(null, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}

async function readBounded(body) {
  if (!body) return null;
  const reader = body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

function detectImageMime(bytes) {
  if (!bytes || bytes.length < 12) return false;
  const ascii = (start, end) => String.fromCharCode(...bytes.slice(start, end));
  if (ascii(0, 8) === "\x89PNG\r\n\x1a\n") return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "image/jpeg";
  if (["GIF87a", "GIF89a"].includes(ascii(0, 6))) return "image/gif";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return "";
}

function sameOriginRedirect(response, currentUrl, origin) {
  if (response.status < 300 || response.status >= 400) return null;
  const location = response.headers.get("location");
  if (!location) return null;
  try {
    const target = new URL(location, currentUrl);
    if (
      target.origin !== origin ||
      target.username ||
      target.password ||
      !["http:", "https:"].includes(target.protocol)
    )
      return null;
    return target;
  } catch {
    return null;
  }
}

async function fetchFile(url, mime) {
  let target = url;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch(target, {
      method: "GET",
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: mime },
    });
    if (response.status < 300 || response.status >= 400) return response;
    const redirect = sameOriginRedirect(response, target, url.origin);
    if (!redirect) return response;
    await response.body?.cancel().catch(() => {});
    target = redirect;
  }
  return null;
}

async function handle(request, context) {
  const { fileId } = await context.params;
  if (!FILE_ID.test(String(fileId || ""))) return empty(404);

  let file;
  try {
    file = await ckanAction("file_show", { id: fileId }, { revalidate: 0 });
  } catch (error) {
    return empty(
      error?.status === 404 ? 404 : error?.status === 403 ? 404 : 502,
    );
  }

  // CKAN may expose ownership as API `owner_info` or as a nested `owner`
  // record. Read both shapes while still requiring an exact configured owner
  // match before making any file public.
  const ownerRecords = [file?.owner_info, file?.owner].filter(
    (value) => value && typeof value === "object",
  );
  const ownerType =
    ownerRecords.map((owner) => owner.owner_type || owner.type).find(Boolean) ||
    file?.owner_type;
  const ownerId =
    ownerRecords.map((owner) => owner.owner_id || owner.id).find(Boolean) ||
    file?.owner_id;
  if (
    file?.id !== fileId ||
    ownerType !== MEDIA_OWNER_TYPE ||
    ownerId !== MEDIA_OWNER_ID
  )
    return empty(404);
  const declaredMime = String(file.content_type || file.mimetype || "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (!ALLOWED_TYPES.has(declaredMime) && !GENERIC_MIME_TYPES.has(declaredMime))
    return empty(415);
  const mime = ALLOWED_TYPES.has(declaredMime)
    ? declaredMime
    : "application/octet-stream";
  if (Number(file.size || 0) > MAX_BYTES) return empty(413);

  if (request.method === "HEAD") {
    return new Response(null, {
      status: 200,
      headers: {
        "Content-Type": mime,
        ...(file.size ? { "Content-Length": String(file.size) } : {}),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Cross-Origin-Resource-Policy": "same-site",
      },
    });
  }

  let internalOrigin;
  try {
    internalOrigin = new URL(
      process.env.CKAN_API_INTERNAL_URL || "http://ckan:5000/api/3/action",
    ).origin;
  } catch {
    return empty(503);
  }

  let upstream;
  try {
    upstream = await fetchFile(
      new URL(`/file/download/${encodeURIComponent(fileId)}`, internalOrigin),
      mime,
    );
  } catch {
    return empty(502);
  }
  if (!upstream) return empty(502);
  if (upstream.status >= 300 && upstream.status < 400) return empty(502);
  if (!upstream.ok) return empty(upstream.status === 404 ? 404 : 502);

  const upstreamMime = String(upstream.headers.get("content-type") || mime)
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (!ALLOWED_TYPES.has(upstreamMime) && !GENERIC_MIME_TYPES.has(upstreamMime))
    return empty(415);
  const bytes = await readBounded(upstream.body);
  if (!bytes) return empty(413);
  const detectedMime = detectImageMime(bytes);
  if (!detectedMime) return empty(415);

  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": detectedMime,
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": "inline",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cross-Origin-Resource-Policy": "same-site",
    },
  });
}

export async function GET(request, context) {
  return handle(request, context);
}
export async function HEAD(request, context) {
  return handle(request, context);
}
