const CACHE_NAME = "portal-satu-data-static-v4";
const OFFLINE_URL = "/offline.html";
const STATIC_PREFIXES = ["/icons/", "/_next/static/"];
const MAX_CACHED_ASSETS = 120;
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
                (key.startsWith("satu-data-wajo-") || key.startsWith("satu-data-static-") || key.startsWith("portal-satu-data-static-")) &&
                key !== CACHE_NAME,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function trimStaticCache(cache) {
  const requests = await cache.keys();
  const assetRequests = requests.filter((request) => {
    const pathname = new URL(request.url).pathname;
    return STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  });
  const excess = assetRequests.length - MAX_CACHED_ASSETS;
  if (excess > 0) {
    // Cache.keys() preserves insertion order in supported browsers; remove the
    // oldest cached chunks first. Hashed Next.js asset URLs are immutable.
    await Promise.all(
      assetRequests.slice(0, excess).map((request) => cache.delete(request)),
    );
  }
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
        // Do not synthesize an HTTP 503 for an offline/cancelled navigation:
        // it looks like an application or rate-limit error in DevTools. If the
        // offline document is unavailable, let the browser report a network
        // failure rather than inventing an HTTP status the server never sent.
        return Response.error();
      }),
    );
    return;
  }

  const isStaticAsset = STATIC_PREFIXES.some((prefix) =>
    url.pathname.startsWith(prefix),
  );
  if (!isStaticAsset) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;

      try {
        const response = await fetch(request);
        const cacheControl = (
          response.headers.get("cache-control") || ""
        ).toLowerCase();
        const responseLengthHeader = response.headers.get("content-length");
        const responseLength =
          responseLengthHeader === null ? NaN : Number(responseLengthHeader);
        const immutable = cacheControl.includes("immutable");
        const storable =
          response.ok &&
          response.type === "basic" &&
          immutable &&
          !cacheControl.includes("no-store") &&
          Number.isSafeInteger(responseLength) &&
          responseLength > 0 &&
          responseLength <= MAX_CACHEABLE_ASSET_BYTES;

        if (storable) {
          try {
            await cache.put(request, response.clone());
            await trimStaticCache(cache);
          } catch {
            // Storage/quota failures must not break a successful asset request.
          }
        }
        return response;
      } catch {
        return Response.error();
      }
    }),
  );
});
