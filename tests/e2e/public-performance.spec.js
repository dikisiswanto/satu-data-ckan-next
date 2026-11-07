import { expect, test } from "@playwright/test";

/** Collect browser-native performance evidence without treating dev-server timing as production Lighthouse. */
test("public homepage exposes measurable LCP, CLS, and bounded first-party resources", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const metrics = { lcp: null, cls: 0 };
    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length) metrics.lcp = entries.at(-1).startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
      let sessionValue = 0;
      let sessionStart = 0;
      let lastShift = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.hadRecentInput) continue;
          const gap = entry.startTime - lastShift;
          if (
            !lastShift ||
            gap > 1000 ||
            entry.startTime - sessionStart > 5000
          ) {
            sessionStart = entry.startTime;
            sessionValue = entry.value;
          } else {
            sessionValue += entry.value;
          }
          lastShift = entry.startTime;
          metrics.cls = Math.max(metrics.cls, sessionValue);
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {
      // Unsupported browser timing entries remain null and are not misreported.
    }
    Object.defineProperty(window, "__portalPerfMetrics", { value: metrics });
  });

  await page.goto("/", { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    await new Promise((resolve) => window.setTimeout(resolve, 600));
  });
  const result = await page.evaluate(() => {
    const resources = performance.getEntriesByType("resource");
    const firstPartyScripts = resources.filter((entry) => {
      try {
        return (
          new URL(entry.name).origin === location.origin &&
          /\.js(?:\?|$)/.test(entry.name)
        );
      } catch {
        return false;
      }
    });
    return {
      ...window.__portalPerfMetrics,
      firstPartyScriptCount: firstPartyScripts.length,
      firstPartyScriptDuration: firstPartyScripts.reduce(
        (sum, entry) => sum + entry.duration,
        0,
      ),
    };
  });

  const heroImage = await page
    .locator(".home-hero-background img")
    .evaluate((image) => ({
      loading: image.loading,
      complete: image.complete,
      naturalWidth: image.naturalWidth,
      hasPreloadHint: Boolean(
        document.querySelector('link[rel="preload"][as="image"]'),
      ),
    }));
  expect(heroImage.hasPreloadHint).toBeTruthy();
  expect(heroImage.loading).not.toBe("lazy");
  expect(heroImage.complete).toBeTruthy();
  expect(heroImage.naturalWidth).toBeGreaterThan(0);

  expect(result.firstPartyScriptCount).toBeGreaterThan(0);
  if (result.lcp !== null) expect(result.lcp).toBeGreaterThan(0);
  expect(result.cls).toBeLessThanOrEqual(0.1);
  // This smoke budget catches accidental blocking scripts without pretending to replace Lighthouse.
  expect(result.firstPartyScriptDuration).toBeLessThan(15_000);
});

test("PWA manifest, install icons, offline page, and service worker are served", async ({
  request,
}) => {
  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBeTruthy();
  const manifest = await manifestResponse.json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.scope).toBe("/");
  expect(manifest.start_url).toBe("/");
  expect(typeof manifest.theme_color).toBe("string");
  expect(manifest.theme_color.length).toBeGreaterThan(0);
  expect(typeof manifest.background_color).toBe("string");
  expect(manifest.background_color.length).toBeGreaterThan(0);
  expect(manifest.icons.length).toBeGreaterThanOrEqual(2);

  for (const size of ["192x192", "512x512"]) {
    const icon = manifest.icons.find(
      (entry) => entry.sizes === size || entry.sizes === "any",
    );
    expect(
      icon,
      `PWA manifest must include ${size} or a scalable SVG`,
    ).toBeTruthy();
    const iconResponse = await request.get(icon.src);
    expect(
      iconResponse.ok(),
      `${icon.src} must be publicly accessible`,
    ).toBeTruthy();
  }

  for (const iconPath of [
    "/favicon.ico",
    "/icons/icon.svg",
    "/icons/portal.svg",
    "/icons/icon-192.png",
    "/icons/icon-512.png",
    "/apple-icon.png",
    "/icon.png",
  ]) {
    const iconResponse = await request.get(iconPath);
    expect(
      iconResponse.ok(),
      `${iconPath} must be served as a browser/app icon`,
    ).toBeTruthy();
  }

  const [offlineResponse, workerResponse] = await Promise.all([
    request.get("/offline.html"),
    request.get("/sw.js"),
  ]);
  expect(offlineResponse.ok()).toBeTruthy();
  expect(workerResponse.ok()).toBeTruthy();
  expect(await workerResponse.text()).toContain("portal-satu-data-static-v6");
});

test("PWA install promotion waits for a second visit and multiple public pages", async ({
  page,
  context,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const promotion = page.locator('[data-pwa-install-promotion="true"]');
  await expect(promotion).toHaveCount(0);

  await page.goto("/dataset", { waitUntil: "domcontentloaded" });
  await page.goto("/organisasi", { waitUntil: "domcontentloaded" });
  await expect(promotion).toHaveCount(0);

  const secondVisit = await context.newPage();
  await secondVisit.goto("/statistik", { waitUntil: "domcontentloaded" });
  await expect(
    secondVisit.locator('[data-pwa-install-promotion="true"]'),
  ).toBeVisible();
  await secondVisit.close();
});

test("PWA install promotion waits for engagement and respects a manual dismissal", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const key = "portal:pwa-install-promotion:v1";
    if (!localStorage.getItem(key)) {
      localStorage.setItem(
        key,
        JSON.stringify({
          visitCount: 2,
          pageViews: 3,
          dismissedUntil: 0,
          installed: false,
        }),
      );
    }
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  const promotion = page.locator('[data-pwa-install-promotion="true"]');
  await expect(promotion).toBeVisible();
  await expect(promotion).toContainText("Pemasangan aplikasi");
  await expect(promotion).toContainText("Buka katalog dan informasi data");

  await promotion
    .getByRole("button", { name: "Tutup promosi pemasangan aplikasi" })
    .click();
  await expect(promotion).toHaveCount(0);

  await page.goto("/dataset", { waitUntil: "domcontentloaded" });
  await expect(promotion).toHaveCount(0);
});

test("PWA install promotion stays hidden when the app is already installed", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "portal:pwa-install-promotion:v1",
      JSON.stringify({
        visitCount: 8,
        pageViews: 24,
        dismissedUntil: 0,
        installed: true,
      }),
    );
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-pwa-install-promotion="true"]')).toHaveCount(
    0,
  );
});
