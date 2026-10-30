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

function matchesImageSignature(bytes, contentType) {
  if (!bytes || bytes.length < 12) return false;
  const ascii = (start, end) => String.fromCharCode(...bytes.slice(start, end));
  if (contentType === "image/png") return ascii(0, 8) === "\x89PNG\r\n\x1a\n";
  if (contentType === "image/jpeg")
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === "image/gif")
    return ["GIF87a", "GIF89a"].includes(ascii(0, 6));
  if (contentType === "image/webp")
    return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  if (contentType === "image/avif")
    return ascii(4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(8, 12));
  return false;
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
    upstream = await fetch(mediaUrl, {
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
      headers: {
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif",
      },
    });
  } catch {
    return response(502, "CMS media upstream unavailable");
  }
  if (!upstream.ok || upstream.status >= 300) return response(404);
  const contentType = (upstream.headers.get("content-type") || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  const contentLength = Number(upstream.headers.get("content-length") || 0);
  if (!IMAGE_TYPES.has(contentType)) return response(415);
  if (contentLength > 0 && contentLength > MAX_IMAGE_BYTES)
    return response(413);
  const body = await readBoundedBody(upstream.body, MAX_IMAGE_BYTES);
  if (!body) return response(413);
  if (!matchesImageSignature(body, contentType))
    return response(415, "CMS media is not a supported image");

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
