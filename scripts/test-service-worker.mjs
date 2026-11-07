#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const origin = "https://portal.test";
const source = await readFile("public/sw.js", "utf8");
const listeners = new Map();
const stores = new Map();
const responses = new Map();
const failures = new Set();
const fetchCounts = new Map();

function makeResponse(body, headers = {}, type = "basic", ok = true) {
  const normalizedHeaders = new Map(
    Object.entries(headers).map(([name, value]) => [
      name.toLowerCase(),
      String(value),
    ]),
  );
  return {
    ok,
    type,
    headers: {
      get(name) {
        return normalizedHeaders.get(name.toLowerCase()) ?? null;
      },
    },
    clone() {
      return makeResponse(body, headers, type, ok);
    },
    async text() {
      return body;
    },
  };
}

function request(pathname, { method = "GET", mode = "cors" } = {}) {
  return {
    url: new URL(pathname, origin).href,
    method,
    mode,
    signal: { aborted: false },
  };
}

function cacheKey(requestLike) {
  return typeof requestLike === "string"
    ? new URL(requestLike, origin).href
    : requestLike.url;
}

const cacheApi = {
  async open(name) {
    if (!stores.has(name)) {
      const entries = new Map();
      stores.set(name, {
        async match(requestLike) {
          return entries.get(cacheKey(requestLike))?.clone();
        },
        async put(requestLike, response) {
          entries.set(cacheKey(requestLike), response.clone());
        },
        async keys() {
          return [...entries.keys()].map((url) => ({ url }));
        },
        async delete(requestLike) {
          return entries.delete(cacheKey(requestLike));
        },
      });
    }
    return stores.get(name);
  },
};

async function mockedFetch(requestLike) {
  const pathname = new URL(cacheKey(requestLike)).pathname;
  fetchCounts.set(pathname, (fetchCounts.get(pathname) || 0) + 1);
  if (failures.has(pathname)) {
    throw new TypeError("offline");
  }
  return (
    responses.get(pathname) ||
    (() =>
      makeResponse("network", {
        "cache-control": "public, max-age=3600, immutable",
        "content-length": "7",
        "content-type": "text/javascript",
      }))
  )();
}

const self = {
  location: { origin },
  clients: { claim: async () => undefined },
  addEventListener(type, handler) {
    listeners.set(type, handler);
  },
  skipWaiting: async () => undefined,
};

vm.runInNewContext(source, {
  self,
  caches: cacheApi,
  fetch: mockedFetch,
  URL,
  Response: { error: () => makeResponse("", {}, "error", false) },
});

async function dispatchFetch(fetchRequest) {
  let responsePromise = null;
  const pendingTasks = [];
  listeners.get("fetch")({
    request: fetchRequest,
    respondWith(promise) {
      responsePromise = Promise.resolve(promise);
    },
    waitUntil(promise) {
      pendingTasks.push(Promise.resolve(promise));
    },
  });
  const result = responsePromise ? await responsePromise : null;
  await Promise.all(pendingTasks);
  return result;
}

const apiResult = await dispatchFetch(request("/api/3/action/package_search"));
assert.equal(
  apiResult,
  null,
  "API requests must bypass the service worker cache",
);
assert.equal(
  fetchCounts.size,
  0,
  "API requests must not be fetched by the worker",
);

await dispatchFetch(request("/icons/write.png", { method: "POST" }));
assert.equal(
  fetchCounts.size,
  0,
  "Non-GET requests must bypass the service worker",
);

await dispatchFetch(request("https://cdn.example.test/icons/logo.svg"));
assert.equal(
  fetchCounts.size,
  0,
  "Cross-origin requests must bypass the service worker",
);

responses.set("/icons/private.css", () =>
  makeResponse("private", {
    "cache-control": "private, max-age=3600",
    "content-length": "7",
    "content-type": "text/css",
  }),
);
const privateRequest = request("/icons/private.css");
await dispatchFetch(privateRequest);
await dispatchFetch(privateRequest);
assert.equal(
  fetchCounts.get("/icons/private.css"),
  2,
  "Private cache-control responses must never be retained, even from an allowlisted path",
);

responses.set("/portal-hero-panorama.webp", () =>
  makeResponse("image-v1", {
    "cache-control": "public, max-age=3600",
    "content-length": "8",
    "content-type": "image/webp",
  }),
);
const heroRequest = request("/portal-hero-panorama.webp");
const firstHeroResponse = await dispatchFetch(heroRequest);
assert.equal(await firstHeroResponse.text(), "image-v1");
responses.set("/portal-hero-panorama.webp", () =>
  makeResponse("image-v2", {
    "cache-control": "public, max-age=3600",
    "content-length": "8",
    "content-type": "image/webp",
  }),
);
const staleHeroResponse = await dispatchFetch(heroRequest);
assert.equal(
  await staleHeroResponse.text(),
  "image-v1",
  "Public images should serve the cached response while refreshing in the background",
);
const workerCache = await cacheApi.open("portal-satu-data-static-v6");
const refreshedHero = await workerCache.match(heroRequest);
assert.equal(await refreshedHero.text(), "image-v2");

responses.set("/_next/static/chunks/app.js", () =>
  makeResponse("immutable-js", {
    "cache-control": "public, max-age=31536000, immutable",
    "content-length": "12",
    "content-type": "text/javascript",
  }),
);
const chunkRequest = request("/_next/static/chunks/app.js");
await dispatchFetch(chunkRequest);
await dispatchFetch(chunkRequest);
assert.equal(
  fetchCounts.get("/_next/static/chunks/app.js"),
  1,
  "Immutable Next.js chunks must use cache-first after the first successful fetch",
);

responses.set("/_next/static/chunks/unstable.js", () =>
  makeResponse("not-immutable", {
    "cache-control": "public, max-age=60",
    "content-length": "13",
    "content-type": "text/javascript",
  }),
);
const unstableChunk = request("/_next/static/chunks/unstable.js");
await dispatchFetch(unstableChunk);
await dispatchFetch(unstableChunk);
assert.equal(
  fetchCounts.get("/_next/static/chunks/unstable.js"),
  2,
  "Next.js chunks without immutable cache-control must not be cached",
);

await workerCache.put(
  request("/offline.html"),
  makeResponse("offline fallback", {
    "content-length": "16",
    "content-type": "text/html",
  }),
);
failures.add("/dataset");
const offlinePage = await dispatchFetch(
  request("/dataset", { mode: "navigate" }),
);
assert.equal(
  await offlinePage.text(),
  "offline fallback",
  "Failed document navigations must return the precached offline page",
);

process.stdout.write(
  "Service worker runtime tests passed: private/API bypass, public-image stale-while-revalidate, immutable chunk cache-first, and offline navigation fallback.\n",
);
