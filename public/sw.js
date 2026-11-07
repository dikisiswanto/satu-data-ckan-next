const CACHE_NAME = "portal-satu-data-static-v6";
const OFFLINE_URL = "/offline.html";
const STATIC_PREFIXES = ["/icons/", "/_next/static/"];
const PUBLIC_IMAGE_ASSETS = new Set([
  "/icons/portal.svg",
  "/portal-social.svg",
]);
const PUBLIC_IMAGE_EXTENSION = /\.(?:avif|gif|jpe?g|png|svg|webp)$/i;
const MAX_CACHED_ASSETS = 140;
const MAX_CACHEABLE_ASSET_BYTES = 2 * 1024 * 1024;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll([OFFLINE_URL]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                (key.startsWith("satu-data-portal-") ||
                  key.startsWith("satu-data-static-") ||
                  key.startsWith("portal-satu-data-static-")) &&
                key !== CACHE_NAME,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isPublicAsset(url) {
  return (
    STATIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix)) ||
    PUBLIC_IMAGE_ASSETS.has(url.pathname) ||
    PUBLIC_IMAGE_EXTENSION.test(url.pathname)
  );
}

function isImmutableChunk(url) {
  return url.pathname.startsWith("/_next/static/");
}

async function trimStaticCache(cache) {
  const requests = await cache.keys();
  const assetRequests = requests.filter((request) => {
    const pathname = new URL(request.url).pathname;
    return isPublicAsset(new URL(request.url)) && pathname !== OFFLINE_URL;
  });
  const excess = assetRequests.length - MAX_CACHED_ASSETS;
  if (excess > 0) {
    // Cache.keys() preserves insertion order in supported browsers; remove the
    // oldest entries first. Hashed Next.js chunks are immutable and safe to reuse.
    await Promise.all(
      assetRequests.slice(0, excess).map((request) => cache.delete(request)),
    );
  }
}

async function fetchAndCacheAsset(request, { requireImmutable = false } = {}) {
  const response = await fetch(request);
  if (!response.ok || response.type !== "basic") return response;

  const cacheControl = (
    response.headers.get("cache-control") || ""
  ).toLowerCase();
  const contentType = (
    response.headers.get("content-type") || ""
  ).toLowerCase();
  const responseLengthHeader = response.headers.get("content-length");
  const responseLength =
    responseLengthHeader === null ? NaN : Number(responseLengthHeader);
  const immutable = cacheControl.includes("immutable");
  const supportedType =
    /^(?:image\/(?:avif|gif|jpeg|png|svg\+xml|webp)|text\/(?:css|javascript)|application\/(?:javascript|font-woff2?))/.test(
      contentType,
    ) || /^(?:font\/|application\/font-)/.test(contentType);
  const storable =
    supportedType &&
    !cacheControl.includes("no-store") &&
    !cacheControl.includes("private") &&
    Number.isSafeInteger(responseLength) &&
    responseLength > 0 &&
    responseLength <= MAX_CACHEABLE_ASSET_BYTES &&
    (!requireImmutable || immutable);

  if (storable) {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
      await trimStaticCache(cache);
    } catch {
      // Storage/quota failures must not break a successful asset request.
    }
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache HTML, API responses, authenticated pages, or user-specific data.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async (error) => {
        // Next.js cancels obsolete navigation requests when the user changes
        // routes quickly. Do not turn that normal AbortError into a synthetic
        // 503 shown in DevTools as if the server were unavailable.
        if (request.signal.aborted || error?.name === "AbortError") throw error;
        try {
          const cache = await caches.open(CACHE_NAME);
          const offline = await cache.match(OFFLINE_URL);
          if (offline) return offline;
        } catch {
          // Storage failures should not disguise the original connection issue.
        }
        return Response.error();
      }),
    );
    return;
  }

  if (!isPublicAsset(url)) return;

  if (isImmutableChunk(url)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          return await fetchAndCacheAsset(request, { requireImmutable: true });
        } catch {
          return Response.error();
        }
      }),
    );
    return;
  }

  // Small same-origin public image assets use stale-while-revalidate: show a
  // cached image immediately, but refresh it in the background while online.
  // The response MIME/size/cache-control checks below prevent HTML, API routes,
  // private responses, and oversized files from entering the static cache.
  const refresh = fetchAndCacheAsset(request).catch(() => Response.error());
  event.waitUntil(refresh.then(() => undefined));
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      return refresh;
    }),
  );
});
