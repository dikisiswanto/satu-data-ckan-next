import { expect, test } from "@playwright/test";

const ROUTES = [
  "/",
  "/dataset",
  "/statistik",
  "/infografik",
  "/publikasi",
  "/organisasi",
  "/berita",
  "/informasi",
  "/api-data",
  "/berita/pembaruan-katalog-data",
  "/informasi/panduan-portal",
];

test.describe("public accessibility baseline", () => {
  for (const route of ROUTES) {
    test(`${route} has clear landmarks, headings, labels, and image alternatives`, async ({
      page,
    }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.locator("main").first()).toBeVisible();

      const audit = await page.evaluate(() => {
        const issues = [];
        const mains = document.querySelectorAll("main");
        if (mains.length !== 1)
          issues.push(`expected one main landmark, found ${mains.length}`);

        const headings = [...document.querySelectorAll("h1")];
        if (headings.length !== 1)
          issues.push(`expected one h1, found ${headings.length}`);
        if (headings.some((heading) => !heading.textContent.trim()))
          issues.push("empty h1");

        for (const control of document.querySelectorAll(
          'input:not([type="hidden"]), select, textarea',
        )) {
          const hasName = Boolean(
            control.labels?.length ||
            control.getAttribute("aria-label") ||
            control.getAttribute("aria-labelledby") ||
            control.getAttribute("title"),
          );
          if (!hasName)
            issues.push(
              `unnamed form control: ${control.outerHTML.slice(0, 120)}`,
            );
        }

        for (const control of document.querySelectorAll("a, button")) {
          const hasName = Boolean(
            control.getAttribute("aria-label") ||
            control.getAttribute("aria-labelledby") ||
            control.getAttribute("title") ||
            control.innerText?.trim() ||
            [...control.querySelectorAll("img[alt]")].some((image) =>
              image.alt.trim(),
            ),
          );
          if (!hasName)
            issues.push(
              `unnamed interactive control: ${control.outerHTML.slice(0, 120)}`,
            );
        }

        for (const image of document.querySelectorAll("img")) {
          if (!image.hasAttribute("alt"))
            issues.push(`image missing alt: ${image.currentSrc || image.src}`);
        }

        for (const reference of document.querySelectorAll(
          "[aria-labelledby], [aria-describedby]",
        )) {
          for (const id of `${reference.getAttribute("aria-labelledby") || ""} ${reference.getAttribute("aria-describedby") || ""}`
            .trim()
            .split(/\s+/)
            .filter(Boolean)) {
            if (!document.getElementById(id))
              issues.push(`broken ARIA ID reference: ${id}`);
          }
        }

        const ids = [...document.querySelectorAll("[id]")]
          .map((item) => item.id)
          .filter(Boolean);
        const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
        for (const id of new Set(duplicates))
          issues.push(`duplicate id: ${id}`);
        return issues;
      });

      expect(audit, `Accessibility baseline failed on ${route}`).toEqual([]);
    });
  }

  test("keyboard navigation reaches the skip-to-content link first", async ({
    page,
  }) => {
    await page.goto("/dataset");
    await page.keyboard.press("Tab");
    await expect(page.locator("a.skip-link")).toBeFocused();
    await expect(page.locator("a.skip-link")).toHaveAttribute(
      "href",
      "#konten-utama",
    );
  });

  test("back-to-top is named, keyboard-operable, and returns the page to its start", async ({
    page,
  }) => {
    await page.goto("/dataset");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const control = page.getByRole("button", {
      name: "Kembali ke bagian atas halaman",
    });
    await expect(control).toBeVisible();
    await control.focus();
    await expect(control).toBeFocused();
    await page.keyboard.press("Enter");
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeLessThan(80);
  });

  test("news and information details do not add a bordered padded card around CMS copy", async ({
    page,
  }) => {
    for (const route of [
      "/berita/pembaruan-katalog-data",
      "/informasi/panduan-portal",
    ]) {
      await page.goto(route);
      const article = page.locator("article.cms-document");
      await expect(article).toBeVisible();
      const style = await article.evaluate((element) => {
        const computed = getComputedStyle(element);
        return {
          borderTopWidth: computed.borderTopWidth,
          borderRightWidth: computed.borderRightWidth,
          borderBottomWidth: computed.borderBottomWidth,
          borderLeftWidth: computed.borderLeftWidth,
          paddingTop: computed.paddingTop,
          paddingRight: computed.paddingRight,
          paddingBottom: computed.paddingBottom,
          paddingLeft: computed.paddingLeft,
        };
      });
      expect(Object.values(style)).toEqual([
        "0px",
        "0px",
        "0px",
        "0px",
        "0px",
        "0px",
        "0px",
        "0px",
      ]);
    }
  });

  test("API documentation metadata identifies developer and organization integrations", async ({
    page,
  }) => {
    await page.goto("/api-data");
    await expect(page).toHaveTitle(/API Data Terbuka/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /pengembang dan organisasi/,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/api-data$/,
    );
  });
});
