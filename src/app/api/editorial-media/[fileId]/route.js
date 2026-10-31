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

function validSignature(bytes, mime) {
  if (!bytes || bytes.length < 12) return false;
  const ascii = (start, end) => String.fromCharCode(...bytes.slice(start, end));
  if (mime === "image/png") return ascii(0, 8) === "\x89PNG\r\n\x1a\n";
  if (mime === "image/jpeg")
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/gif") return ["GIF87a", "GIF89a"].includes(ascii(0, 6));
  if (mime === "image/webp")
    return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  return false;
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

  const owner = file?.owner_info || {};
  const ownerType = owner.owner_type || file?.owner_type;
  const ownerId = owner.owner_id || file?.owner_id;
  if (
    file?.id !== fileId ||
    ownerType !== "wajo_media" ||
    ownerId !== "public-editorial-media"
  )
    return empty(404);
  const mime = String(file.content_type || file.mimetype || "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (!ALLOWED_TYPES.has(mime)) return empty(415);
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
    upstream = await fetch(
      new URL(`/file/download/${encodeURIComponent(fileId)}`, internalOrigin),
      {
        method: "GET",
        cache: "no-store",
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { Accept: mime },
      },
    );
  } catch {
    return empty(502);
  }
  if (upstream.status >= 300 && upstream.status < 400) return empty(502);
  if (!upstream.ok) return empty(upstream.status === 404 ? 404 : 502);

  const upstreamMime = String(upstream.headers.get("content-type") || mime)
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (upstreamMime !== mime || !ALLOWED_TYPES.has(upstreamMime))
    return empty(415);
  const bytes = await readBounded(upstream.body);
  if (!bytes) return empty(413);
  if (!validSignature(bytes, mime)) return empty(415);

  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": mime,
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
