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

function notFound() {
  return new Response(null, {
    status: 404,
    headers: {
      "Cache-Control": "public, max-age=60",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

async function handleMedia(request, context) {
  const params = await context.params;
  const target = createCkanGroupMediaTarget(params?.path);
  if (!target) return notFound();

  const requestHeaders = new Headers({
    Accept: "image/png, image/jpeg, image/gif, image/webp",
  });
  for (const header of ["if-none-match", "if-modified-since"]) {
    const value = request.headers.get(header);
    if (value) requestHeaders.set(header, value);
  }

  try {
    const upstream = await fetch(target, {
      method: request.method === "HEAD" ? "HEAD" : "GET",
      headers: requestHeaders,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    // Never follow a redirect to an arbitrary host from CKAN's file endpoint.
    if (upstream.status >= 300 && upstream.status < 400) return notFound();
    if (upstream.status === 404 || upstream.status === 410) return notFound();
    if (upstream.status === 304) {
      return new Response(null, {
        status: 304,
        headers: {
          ETag: upstream.headers.get("etag") || "",
          "Last-Modified": upstream.headers.get("last-modified") || "",
          "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    if (!upstream.ok) {
      return new Response(null, {
        status: 502,
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    const contentType = String(upstream.headers.get("content-type") || "")
      .split(";", 1)[0]
      .trim()
      .toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
      return new Response(null, {
        status: 415,
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    const headers = new Headers({
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
      "Cross-Origin-Resource-Policy": "same-site",
    });
    for (const header of ["content-length", "etag", "last-modified"]) {
      const value = upstream.headers.get(header);
      if (value)
        headers.set(
          header === "content-length"
            ? "Content-Length"
            : header === "etag"
              ? "ETag"
              : "Last-Modified",
          value,
        );
    }

    return new Response(request.method === "HEAD" ? null : upstream.body, {
      status: 200,
      headers,
    });
  } catch {
    return new Response(null, {
      status: 502,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
}

export async function GET(request, context) {
  return handleMedia(request, context);
}

export async function HEAD(request, context) {
  return handleMedia(request, context);
}
