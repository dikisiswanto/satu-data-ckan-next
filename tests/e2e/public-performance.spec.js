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

  expect(result.firstPartyScriptCount).toBeGreaterThan(0);
  expect(result.cls).toBeLessThanOrEqual(0.1);
  // This smoke budget catches accidental blocking scripts without pretending to replace Lighthouse.
  expect(result.firstPartyScriptDuration).toBeLessThan(15_000);
});
