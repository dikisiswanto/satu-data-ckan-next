import { expect, test } from "@playwright/test";

const PUBLIC_ROUTES = [
  "/",
  "/dataset",
  "/dataset/data-sekolah-wajo",
  "/statistik",
  "/statistik/indikator-ipm",
  "/infografik",
  "/infografik/infografik-stunting-wajo",
  "/publikasi",
  "/publikasi/publikasi-wajo-dalam-angka",
  "/organisasi",
  "/organisasi/bappeda-wajo",
  "/informasi",
  "/informasi/tentang-satu-data",
  "/informasi/panduan-portal",
  "/berita",
  "/berita/warta-data-wajo",
  "/berita/pembaruan-katalog-data",
];

async function installLayoutShiftObserver(page) {
  await page.addInitScript(() => {
    let sessionValue = 0;
    let sessionStart = 0;
    let lastShiftTime = 0;
    let maxSessionValue = 0;
    let shiftCount = 0;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.hadRecentInput) continue;
          const gap = entry.startTime - lastShiftTime;
          const sessionExpired =
            gap > 1_000 || entry.startTime - sessionStart > 5_000;
          if (!lastShiftTime || sessionExpired) {
            sessionStart = entry.startTime;
            sessionValue = entry.value;
          } else {
            sessionValue += entry.value;
          }
          lastShiftTime = entry.startTime;
          maxSessionValue = Math.max(maxSessionValue, sessionValue);
          shiftCount += 1;
        }
      });
      observer.observe({ type: "layout-shift", buffered: true });
    } catch {
      // Older browser engines may not expose layout-shift entries.
    }

    Object.defineProperty(window, "__publicLayoutShift", {
      configurable: false,
      value: () => ({ value: maxSessionValue, entries: shiftCount }),
    });
  });
}

async function measureRoute(page, route, viewportName) {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await page.locator("main").first().waitFor({ state: "visible" });
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    await Promise.all(
      Array.from(document.images).map((image) =>
        image.decode().catch(() => undefined),
      ),
    );
    await new Promise((resolve) => window.setTimeout(resolve, 700));
  });
  const result = await page.evaluate(
    () => window.__publicLayoutShift?.() || { value: 0, entries: 0 },
  );
  expect(
    result.value,
    `${route} (${viewportName}) produced CLS ${result.value.toFixed(4)} across ${result.entries} layout shifts`,
  ).toBeLessThanOrEqual(0.1);
}

test.describe("public route layout stability", () => {
  test.setTimeout(120_000);

  test("public routes keep CLS at or below 0.10 on desktop", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await installLayoutShiftObserver(page);

    for (const route of PUBLIC_ROUTES) {
      await measureRoute(page, route, "desktop");
    }
  });

  test("public routes keep CLS at or below 0.10 on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await installLayoutShiftObserver(page);

    for (const route of PUBLIC_ROUTES) {
      await measureRoute(page, route, "mobile");
    }
  });
});
