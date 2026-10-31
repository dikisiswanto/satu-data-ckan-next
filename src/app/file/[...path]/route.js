import { createCkanGroupMediaTarget } from "@/lib/ckan/media-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);
const UPSTREAM_TIMEOUT_MS = 12_000;

function emptyResponse(status, cacheControl = "no-store") {
  return new Response(null, {
    status,
    headers: {
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
      "Cross-Origin-Resource-Policy": "same-site",
    },
  });
}

async function handle(request, context) {
  const params = await context.params;
  // This route deliberately exposes only CKAN's public group-image storage.
  // It is not a generic File API proxy and cannot retrieve resource/user files.
  const target = createCkanGroupMediaTarget(
    params?.path,
    process.env.CKAN_API_INTERNAL_URL,
  );
  if (!target || !target.pathname.startsWith("/file/public-download/groups/")) {
    return emptyResponse(404, "public, max-age=60");
  }

  const headers = new Headers({
    Accept: "image/png, image/jpeg, image/gif, image/webp",
  });
  for (const name of ["if-none-match", "if-modified-since"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  try {
    const upstream = await fetch(target, {
      method: request.method === "HEAD" ? "HEAD" : "GET",
      headers,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    if (upstream.status === 304) {
      const responseHeaders = new Headers({
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
        "X-Content-Type-Options": "nosniff",
      });
      for (const [source, destination] of [
        ["etag", "ETag"],
        ["last-modified", "Last-Modified"],
      ]) {
        const value = upstream.headers.get(source);
        if (value) responseHeaders.set(destination, value);
      }
      return new Response(null, { status: 304, headers: responseHeaders });
    }
    if (upstream.status === 404 || upstream.status === 410)
      return emptyResponse(404, "public, max-age=60");
    if (upstream.status >= 300 && upstream.status < 400)
      return emptyResponse(404, "public, max-age=60");
    if (!upstream.ok) return emptyResponse(502);

    const contentType = String(upstream.headers.get("content-type") || "")
      .split(";", 1)[0]
      .trim()
      .toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(contentType)) return emptyResponse(415);

    const responseHeaders = new Headers({
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
      "Cross-Origin-Resource-Policy": "same-site",
    });
    for (const [source, destination] of [
      ["content-length", "Content-Length"],
      ["etag", "ETag"],
      ["last-modified", "Last-Modified"],
    ]) {
      const value = upstream.headers.get(source);
      if (value) responseHeaders.set(destination, value);
    }
    return new Response(request.method === "HEAD" ? null : upstream.body, {
      status: 200,
      headers: responseHeaders,
    });
  } catch {
    return emptyResponse(502);
  }
}

export async function GET(request, context) {
  return handle(request, context);
}
export async function HEAD(request, context) {
  return handle(request, context);
}
