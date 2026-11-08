import {
  getPublicCmsBlogPostsResult,
  getPublicCmsPagesResult,
} from "@/lib/cms/pages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const GENERIC_MIME_TYPES = new Set(["", "application/octet-stream"]);

function response(status, body = "Not Found") {
  return new Response(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}

function recordReferencesImage(page, filename) {
  const marker = `/uploads/page_images/${filename}`;
  const candidates = [
    page.content,
    page.ogImage,
    page.image,
    JSON.stringify(page.contentBlocks || []),
  ];
  return candidates.some(
    (value) => typeof value === "string" && value.includes(marker),
  );
}

async function readBoundedBody(body, maxBytes) {
  if (!body) return null;
  const reader = body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
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
  if (ascii(4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(8, 12)))
    return "image/avif";
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

async function fetchPageImage(url) {
  let target = url;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch(target, {
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
      headers: {
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif",
      },
    });
    if (response.status < 300 || response.status >= 400) return response;
    const redirect = sameOriginRedirect(response, target, url.origin);
    if (!redirect) return response;
    await response.body?.cancel().catch(() => {});
    target = redirect;
  }
  return null;
}

export async function GET(_request, { params }) {
  const { filename } = await params;
  if (
    typeof filename !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,179}$/.test(filename) ||
    filename.includes("..")
  ) {
    return response(404);
  }

  // CKAN Pages' upload action stores images globally. Only serve a file while
  // at least one currently-public page/blog references it, so a private or
  // unpublished page cannot make its uploaded image public by URL guessing.
  const [pagesResult, postsResult] = await Promise.all([
    getPublicCmsPagesResult(),
    getPublicCmsBlogPostsResult(),
  ]);
  if (pagesResult.unavailable || postsResult.unavailable)
    return response(503, "CMS media temporarily unavailable");
  const referenced = [...pagesResult.data, ...postsResult.data].some((page) =>
    recordReferencesImage(page, filename),
  );
  if (!referenced) return response(404);

  const apiBase =
    process.env.CKAN_API_INTERNAL_URL || "http://ckan:5000/api/3/action";
  let internalOrigin;
  try {
    internalOrigin = new URL(apiBase).origin;
  } catch {
    return response(503);
  }
  const mediaUrl = new URL(
    `/uploads/page_images/${encodeURIComponent(filename)}`,
    internalOrigin,
  );
  let upstream;
  try {
    upstream = await fetchPageImage(mediaUrl);
  } catch {
    return response(502, "CMS media upstream unavailable");
  }
  if (!upstream) return response(502, "CMS media upstream unavailable");
  if (!upstream.ok || upstream.status >= 300) return response(404);
  const upstreamType = (upstream.headers.get("content-type") || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  const contentLength = Number(upstream.headers.get("content-length") || 0);
  if (!IMAGE_TYPES.has(upstreamType) && !GENERIC_MIME_TYPES.has(upstreamType))
    return response(415);
  if (contentLength > 0 && contentLength > MAX_IMAGE_BYTES)
    return response(413);
  const body = await readBoundedBody(upstream.body, MAX_IMAGE_BYTES);
  if (!body) return response(413);
  const contentType = detectImageMime(body);
  if (!contentType) return response(415, "CMS media is not a supported image");

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${filename.replace(/["\\]/g, "")}"`,
      "Content-Length": String(body.byteLength),
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}

export async function HEAD(request, context) {
  const result = await GET(request, context);
  return new Response(null, { status: result.status, headers: result.headers });
}
