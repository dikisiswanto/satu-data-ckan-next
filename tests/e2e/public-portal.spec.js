import { expect, test } from "@playwright/test";

test("homepage exposes CKAN-driven category cards with exact public dataset counts", async ({
  page,
}) => {
  await page.goto("/");
  const categories = page.locator(".home-topic-card");
  await expect(categories).toHaveCount(1);
  const education = categories.filter({ hasText: "Pendidikan" });
  await expect(education).toContainText("1 dataset");
  await expect(education).toHaveAttribute(
    "href",
    "/dataset?kategori=pendidikan",
  );
  // Editorial content lives in its own public catalogue and must not inflate
  // the ordinary dataset category facets.
  await expect(categories.filter({ hasText: "Kesehatan" })).toHaveCount(0);
  await expect(
    categories.filter({ hasText: "Publikasi Statistik" }),
  ).toHaveCount(0);
});

test("homepage shows accurate public dataset, resource and indicator totals", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const metrics = page.locator(".home-stats .home-stat");
  await expect(metrics).toHaveCount(5);
  await expect(metrics.nth(0)).toContainText("1");
  await expect(metrics.nth(0)).toContainText("Dataset terbuka");
  await expect(metrics.nth(1)).toContainText("7");
  await expect(metrics.nth(1)).toContainText("Resource publik");
  await expect(metrics.nth(3)).toContainText("1");
  await expect(metrics.nth(3)).toContainText("Indikator statistik");
});

test("homepage category cards are unique and use semantically matched icons", async ({
  page,
}) => {
  await page.goto("/");
  const categories = page.locator(".home-topic-card");
  const names = await categories.locator(".home-topic-name").allTextContents();
  const normalized = names.map((name) =>
    name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLocaleLowerCase("id-ID"),
  );
  expect(new Set(normalized).size).toBe(names.length);
  await expect(categories).toHaveCount(1);
  await expect(
    categories
      .filter({ hasText: "Pendidikan" })
      .locator("[data-category-icon='graduation-cap']"),
  ).toHaveCount(1);
  await expect(categories.filter({ hasText: "Kesehatan" })).toHaveCount(0);
  await expect(
    categories.filter({ hasText: "Publikasi Statistik" }),
  ).toHaveCount(0);
});

test("hero artwork and summary counts never duplicate each other across breakpoints", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator(".home-hero-visual")).toBeVisible();
  await expect(page.locator(".home-stats-wrap")).toBeHidden();

  await page.setViewportSize({ width: 900, height: 900 });
  await expect(page.locator(".home-hero-visual")).toBeHidden();
  await expect(page.locator(".home-stats-wrap")).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".home-hero-visual")).toBeHidden();
  await expect(page.locator(".home-stats-wrap")).toBeVisible();
});

test("information page keeps a compact title and description rhythm", async ({
  page,
}) => {
  await page.goto("/informasi");
  const heading = page.locator(
    ".informasi-directory-page .public-page-heading",
  );
  await expect(
    heading.getByRole("heading", { name: "Informasi" }),
  ).toBeVisible();
  const titleDescriptionGap = await heading.evaluate((element) => {
    const title = element.querySelector("h1");
    const description = element.querySelector("p:not(.eyebrow)");
    if (!title || !description) return Number.POSITIVE_INFINITY;
    return (
      description.getBoundingClientRect().top -
      title.getBoundingClientRect().bottom
    );
  });
  expect(titleDescriptionGap).toBeGreaterThanOrEqual(0);
  expect(titleDescriptionGap).toBeLessThanOrEqual(8);
});

test("organization directory searches, filters and sorts CKAN organizations by dataset count", async ({
  page,
}) => {
  await page.goto("/organisasi");
  await expect(
    page.getByRole("heading", { name: "Temukan perangkat daerah" }),
  ).toBeVisible();
  await expect(page.getByText("3", { exact: true }).first()).toBeVisible();

  const search = page.getByRole("searchbox", { name: "Cari perangkat daerah" });
  await search.fill("kesehatan dinas");
  await expect(
    page.getByRole("heading", { name: "Dinas Kesehatan Kabupaten Wajo" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bappeda Wajo" })).toHaveCount(
    0,
  );
  await expect(page.getByText(/Ditemukan 1 perangkat daerah/)).toBeVisible();

  await search.fill("");
  await page.getByRole("button", { name: /Belum menerbitkan/ }).click();
  await expect(
    page.getByRole("heading", { name: "Sekretariat Daerah Kabupaten Wajo" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bappeda Wajo" })).toHaveCount(
    0,
  );

  await page.getByRole("button", { name: /Memiliki dataset/ }).click();
  await page.getByLabel("Urutkan daftar").selectOption("datasets-desc");
  const cards = page.locator(".organization-directory-card");
  await expect(cards).toHaveCount(2);
  await expect(cards.first()).toContainText("Bappeda Wajo");
  await expect(cards.first()).toContainText("2 dataset");
  await expect(cards.nth(1)).toContainText("Dinas Kesehatan Kabupaten Wajo");
});

test("homepage exposes public catalog, statistics, and infographic routes", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: /jelajahi statistik/i }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /lihat infografik/i }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /dataset/i }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Logo Satu Data Indonesia" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Sorotan statistik" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Infografik terbaru" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Publikasi terbaru" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /indeks pembangunan manusia/i }).first(),
  ).toBeVisible();
});

test("primary browsing flow works from home through the catalog and back from dataset detail", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('a[href="/dataset"]').first().click();
  await expect(page).toHaveURL(/\/dataset$/);
  await expect(
    page.getByRole("heading", { name: "Katalog dataset" }),
  ).toBeVisible();

  await page
    .getByRole("link", { name: "Data Sekolah Kabupaten Wajo" })
    .first()
    .click();
  await expect(page).toHaveURL(/\/dataset\/data-sekolah-wajo$/);
  await expect(
    page.getByRole("heading", { name: "Data Sekolah Kabupaten Wajo" }),
  ).toBeVisible();

  await page.getByRole("link", { name: /kembali ke katalog/i }).click();
  await expect(page).toHaveURL(/\/dataset$/);
  await expect(
    page.getByRole("heading", { name: "Katalog dataset" }),
  ).toBeVisible();
});

test("catalog search and filter controls submit a consistent, bookmarkable URL", async ({
  page,
}) => {
  await page.goto("/dataset");
  await page.getByLabel("Kata kunci").fill("sekolah");
  await page.getByRole("button", { name: /cari dataset/i }).click();
  await expect(page).toHaveURL(/q=sekolah/);
  await expect(
    page.getByRole("heading", { name: "Data Sekolah Kabupaten Wajo" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Buka filter katalog" }).click();
  await page.getByLabel("Topik").selectOption("pendidikan");
  await page.getByRole("button", { name: /cari dataset/i }).click();
  await expect(page).toHaveURL(/q=sekolah/);
  await expect(page).toHaveURL(/kategori=pendidikan/);
  await expect(
    page.getByRole("heading", { name: "Data Sekolah Kabupaten Wajo" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Infografik Stunting Kabupaten Wajo" }),
  ).toHaveCount(0);
});

test("multi-term dataset search can match any meaningful keyword instead of requiring all words", async ({
  page,
}) => {
  await page.goto("/dataset?q=puskesmas%20sekolah");
  await expect(
    page.getByRole("heading", { name: "Katalog dataset" }),
  ).toBeVisible();
  await expect(
    page.getByText("Data Sekolah Kabupaten Wajo").first(),
  ).toBeVisible();
  await expect(
    page.getByText("Infografik Stunting Kabupaten Wajo"),
  ).toHaveCount(0);
});

test("CKAN-native dataset is rendered on the public catalog and detail page", async ({
  page,
}) => {
  await page.goto("/dataset");
  await expect(
    page.getByText("Data Sekolah Kabupaten Wajo").first(),
  ).toBeVisible();
  await page.goto("/dataset/data-sekolah-wajo");
  await expect(
    page.getByRole("heading", { name: "Data Sekolah Kabupaten Wajo" }),
  ).toBeVisible();
  await expect(page.getByText("Pendidikan").first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Riwayat perubahan CKAN" }),
  ).toBeVisible();
  await expect(page.getByText("Metadata diperbarui").first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Data Sekolah CSV" }),
  ).toBeVisible();
  await expect(page.getByText("SMP Negeri 1 Sengkang")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Akses API dataset" }),
  ).toBeVisible();
  await expect(
    page.getByText(/package_show\?id=data-sekolah-wajo/),
  ).toBeVisible();
  await expect(
    page.getByText(/datastore_search\?resource_id=resource-sekolah/),
  ).toBeVisible();
});

test("CSV preview remains visible before DataStore indexing and uses a bounded file preview", async ({
  page,
}) => {
  await page.goto("/dataset/data-sekolah-wajo");
  await expect(
    page.getByRole("heading", { name: "Data Sekolah Menunggu Indeks" }),
  ).toBeVisible();
  await expect(page.getByText("SD Negeri 2 Sengkang")).toBeVisible();
  await expect(
    page.getByText(/Pratinjau sementara dibaca langsung dari berkas CSV/),
  ).toBeVisible();
});

test("CKAN DataStore powers the public indicator listing and chart page", async ({
  page,
}) => {
  await page.goto("/statistik");
  await expect(
    page.getByRole("heading", { name: "Statistik dan indikator" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /indeks pembangunan manusia/i }).first(),
  ).toBeVisible();
  await expect(page.getByText("74,02").first()).toBeVisible();
  await page.goto("/statistik/indikator-ipm");
  await expect(
    page.getByRole("heading", { name: "Indeks Pembangunan Manusia" }),
  ).toBeVisible();
  await expect(page.getByRole("img", { name: /nilai terkini/i })).toBeVisible();
  await expect(page.getByText("2024").first()).toBeVisible();
});

test("CKAN infographic dataset and public image resource appear on the infographic page", async ({
  page,
}) => {
  await page.goto("/infografik");
  await expect(page.getByRole("heading", { name: "Infografik" })).toBeVisible();
  await expect(
    page
      .getByRole("link", { name: /infografik stunting kabupaten wajo/i })
      .first(),
  ).toBeVisible();
  await page.goto("/infografik/infografik-stunting-wajo");
  await expect(
    page.getByRole("heading", { name: "Infografik Stunting Kabupaten Wajo" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /informasi publikasi/i }),
  ).toBeVisible();
});

test("dataset image previews open in a zoomable lightbox", async ({ page }) => {
  await page.route("https://images.example.test/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pVQAAAAASUVORK5CYII=",
        "base64",
      ),
    }),
  );
  await page.goto("/dataset/data-sekolah-wajo");

  const trigger = page.getByRole("button", {
    name: "Perbesar gambar: Denah titik sekolah Kabupaten Wajo",
  });
  await expect(trigger).toBeVisible();
  await trigger.click();

  const dialog = page.getByRole("dialog", {
    name: /Denah titik sekolah Kabupaten Wajo/,
  });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("100%");
  await dialog.getByRole("button", { name: "Perbesar gambar" }).click();
  await expect(dialog).toContainText("150%");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("image lightbox supports gallery navigation, focus containment and view reset", async ({
  page,
}) => {
  await page.route("https://images.example.test/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pVQAAAAASUVORK5CYII=",
        "base64",
      ),
    }),
  );
  await page.goto("/dataset/data-sekolah-wajo");

  const trigger = page.getByRole("button", {
    name: "Perbesar gambar: Denah titik sekolah Kabupaten Wajo",
  });
  await trigger.evaluate((element) => {
    const second = element.cloneNode(true);
    second.dataset.imageLightboxSrc =
      "https://images.example.test/denah-sekolah-kedua.png";
    second.dataset.imageLightboxAlt = "Pratinjau peta sekolah kedua";
    second.dataset.imageLightboxCaption = "Lampiran kedua";
    element.parentElement.appendChild(second);
  });
  await trigger.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("1 / 2");
  await expect(
    dialog.getByRole("button", { name: "Tutup pratinjau gambar" }),
  ).toBeFocused();
  await expect(
    dialog.getByRole("navigation", { name: "Pilih gambar dalam galeri" }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: /Tampilkan gambar 1:/ }),
  ).toHaveAttribute("aria-pressed", "true");

  await dialog.getByRole("button", { name: "Gambar berikutnya" }).click();
  await expect(
    page.getByRole("dialog", { name: /Pratinjau peta sekolah kedua/ }),
  ).toBeVisible();
  await expect(dialog).toContainText("2 / 2");
  await expect(
    dialog.getByRole("button", { name: /Tampilkan gambar 2:/ }),
  ).toHaveAttribute("aria-pressed", "true");

  await page.keyboard.press("ArrowLeft");
  await expect(dialog).toContainText("1 / 2");
  await dialog.getByRole("button", { name: "Perbesar gambar" }).click();
  await expect(dialog).toContainText("150%");
  await dialog
    .getByRole("button", { name: "Atur ulang ukuran gambar" })
    .click();
  await expect(dialog).toContainText("100%");

  await dialog.getByRole("button", { name: "Gambar berikutnya" }).focus();
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("button", { name: "Perkecil gambar" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("image lightbox shows a recovery action when the source image fails", async ({
  page,
}) => {
  await page.route("https://images.example.test/**", (route) => route.abort());
  await page.goto("/dataset/data-sekolah-wajo");

  await page
    .getByRole("button", {
      name: "Perbesar gambar: Denah titik sekolah Kabupaten Wajo",
    })
    .click();
  const dialog = page.getByRole("dialog", {
    name: /Denah titik sekolah Kabupaten Wajo/,
  });
  await expect(dialog.getByRole("alert")).toContainText(
    "Gambar tidak dapat dimuat",
  );
  await expect(
    dialog.getByRole("alert").getByRole("link", { name: /Buka gambar asli/ }),
  ).toHaveAttribute("href", "https://images.example.test/denah-sekolah.png");
  await page.keyboard.press("Escape");
});

test("infographic previews open in a zoomable lightbox", async ({ page }) => {
  await page.route("https://images.example.test/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pVQAAAAASUVORK5CYII=",
        "base64",
      ),
    }),
  );
  await page.goto("/infografik/infografik-stunting-wajo");

  const trigger = page.getByRole("button", {
    name: "Perbesar gambar: Infografik utama stunting",
  });
  await expect(trigger).toBeVisible();
  await trigger.click();

  const dialog = page.getByRole("dialog", {
    name: /Infografik utama stunting/,
  });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("100%");
  await dialog.getByRole("button", { name: "Perbesar gambar" }).click();
  await expect(dialog).toContainText("150%");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("CKAN publication package drives its listing, revision metadata, and PDF resource", async ({
  page,
}) => {
  await page.goto("/publikasi");
  await expect(
    page.getByRole("heading", { name: "Publikasi dan laporan" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("link", { name: /kabupaten wajo dalam angka 2025/i })
      .first(),
  ).toBeVisible();
  await page.goto("/publikasi/publikasi-wajo-dalam-angka");
  await expect(
    page.getByRole("heading", { name: "Kabupaten Wajo Dalam Angka 2025" }),
  ).toBeVisible();
  await expect(
    page.getByText("Rilis pertama untuk periode 2025."),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Pratinjau dokumen" }),
  ).toBeVisible();
});

test("API documentation explains the public endpoint contract in plain language", async ({
  page,
}) => {
  await page.goto("/api-data");
  await expect(
    page.getByRole("heading", { name: "API data terbuka" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "API itu cara aplikasi mengambil data secara otomatis",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Coba pencarian contoh/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Cek status API/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Daftar endpoint" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Cari dataset berdasarkan kata kunci" }),
  ).toBeVisible();
  await expect(
    page.getByText("/datastore_search", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Dataset", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/Parameter yang tidak tercantum ditolak/i),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Buka katalog/i }),
  ).toHaveAttribute("href", "/dataset");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("navigation", {
      name: "Navigasi dokumentasi API pada layar kecil",
    }),
  ).toBeVisible();
});

test("catalog filters are reflected in the result set and combine without leaking unrelated datasets", async ({
  page,
}) => {
  await page.goto("/dataset?organisasi=dinas-kesehatan");
  await expect(
    page.getByRole("heading", { name: "Infografik Stunting Kabupaten Wajo" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Data Sekolah Kabupaten Wajo" }),
  ).toHaveCount(0);

  await page.goto("/dataset?kategori=pendidikan");
  await expect(
    page.getByRole("heading", { name: "Data Sekolah Kabupaten Wajo" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Infografik Stunting Kabupaten Wajo" }),
  ).toHaveCount(0);

  await page.goto("/dataset?tahun=2024");
  await expect(
    page.getByRole("heading", { name: "Indeks Pembangunan Manusia" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Kabupaten Wajo Dalam Angka 2025" }),
  ).toHaveCount(0);

  await page.goto("/dataset?format=csv");
  await expect(
    page.getByRole("heading", { name: "Data Sekolah Kabupaten Wajo" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Indeks Pembangunan Manusia" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Kabupaten Wajo Dalam Angka 2025" }),
  ).toHaveCount(0);
});

test("public breadcrumbs and shared navigation make every section discoverable", async ({
  page,
}) => {
  await page.goto("/dataset");
  const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
  await expect(breadcrumb).toBeVisible();
  await expect(
    breadcrumb.getByRole("link", { name: "Beranda" }),
  ).toHaveAttribute("href", "/");
  await expect(breadcrumb.getByText("Dataset", { exact: true })).toBeVisible();

  await page.goto("/dataset/data-sekolah-wajo");
  const detailBreadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
  await expect(
    detailBreadcrumb.getByRole("link", { name: "Dataset" }),
  ).toHaveAttribute("href", "/dataset");
  await expect(
    detailBreadcrumb.getByText("Detail dataset", { exact: true }),
  ).toBeVisible();

  await page.goto("/api-data");
  await expect(
    page.getByRole("heading", {
      name: "Laman lain yang mungkin Anda perlukan",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /salin contoh kode/i }).first(),
  ).toBeVisible();
  const primaryHeader = page.locator(".site-header");
  for (const [, href] of [
    ["Dataset", "/dataset"],
    ["Statistik", "/statistik"],
    ["Infografik", "/infografik"],
    ["Publikasi", "/publikasi"],
    ["Perangkat Daerah", "/organisasi"],
    ["Bantuan", "/bantuan"],
    ["API data", "/api-data"],
  ]) {
    await expect(
      primaryHeader.locator(`a[href="${href}"]`).first(),
    ).toBeAttached();
  }
  const footerPages = page.locator('footer nav[aria-label="Tautan laman"]');
  await expect(footerPages).toBeVisible();
  await expect(footerPages.locator("a")).toHaveCount(3);
  await expect(
    footerPages.getByRole("link", { name: "Tentang Satu Data Wajo" }),
  ).toHaveAttribute("href", "/informasi/tentang-satu-data");
  await expect(
    footerPages.getByRole("link", {
      name: "Panduan Lengkap Menggunakan Portal Satu Data Kabupaten Wajo untuk Menemukan, Memahami, dan Memanfaatkan Data Terbuka",
    }),
  ).toBeVisible();
  await expect(
    footerPages.getByRole("link", { name: "Tentang", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.locator('footer a[href="https://data.go.id"]'),
  ).toBeVisible();
});

test("same-origin Action API is read-only and marked noindex", async ({
  request,
}) => {
  const search = await request.get(
    "/api/3/action/package_search?q=pendidikan&rows=10",
  );
  expect(search.ok()).toBeTruthy();
  expect(search.headers()["x-robots-tag"]).toContain("noindex");
  expect((await search.json()).success).toBe(true);

  // Compatibility subset used by CKAN Harvester: stable sort + incremental metadata filter.
  const harvestSearch = await request.get(
    "/api/3/action/package_search?rows=100&start=0&sort=id%20asc&fq=metadata_modified%3A%5B2026-01-01T00%3A00%3A00Z%20TO%20*%5D",
  );
  expect(harvestSearch.ok()).toBeTruthy();
  expect((await harvestSearch.json()).success).toBe(true);
  const unsafeHarvestFilter = await request.get(
    "/api/3/action/package_search?rows=100&start=0&sort=id%20asc&fq=title%3Asecret",
  );
  expect(unsafeHarvestFilter.status()).toBe(400);
  const unsafeHarvestSort = await request.get(
    "/api/3/action/package_search?sort=score%20desc",
  );
  expect(unsafeHarvestSort.status()).toBe(400);

  const advancedCatalogQuery = await request.get(
    "/api/3/action/package_search?q=title%3A*",
  );
  expect(advancedCatalogQuery.status()).toBe(400);
  expect((await advancedCatalogQuery.json()).success).toBe(false);

  const advancedDataStoreSearch = await request.get(
    "/api/3/action/datastore_search?resource_id=resource-ipm&q=malicious-query",
  );
  expect(advancedDataStoreSearch.status()).toBe(400);
  expect((await advancedDataStoreSearch.json()).success).toBe(false);
  const unexpectedDatasetParameter = await request.get(
    "/api/3/action/package_show?id=data-sekolah-wajo&include_private=true",
  );
  expect(unexpectedDatasetParameter.status()).toBe(400);
  expect((await unexpectedDatasetParameter.json()).success).toBe(false);

  const duplicateSearchParameter = await request.get(
    "/api/3/action/package_search?q=pendidikan&q=sekolah",
  );
  expect(duplicateSearchParameter.status()).toBe(400);
  expect((await duplicateSearchParameter.json()).error.__type).toBe(
    "Validation Error",
  );

  const malformedNumericParameter = await request.get(
    "/api/3/action/package_search?rows=1.5",
  );
  expect(malformedNumericParameter.status()).toBe(400);
  expect((await malformedNumericParameter.json()).success).toBe(false);

  const malformedBooleanParameter = await request.get(
    "/api/3/action/package_search?facets=perhaps",
  );
  expect(malformedBooleanParameter.status()).toBe(400);
  expect((await malformedBooleanParameter.json()).success).toBe(false);

  const missingIdentifier = await request.get("/api/3/action/package_show");
  expect(missingIdentifier.status()).toBe(400);
  expect((await missingIdentifier.json()).success).toBe(false);

  const unexpectedStatusParameter = await request.get(
    "/api/3/action/status_show?debug=true",
  );
  expect(unexpectedStatusParameter.status()).toBe(400);
  expect((await unexpectedStatusParameter.json()).success).toBe(false);
  const dataPageOne = await request.get(
    "/api/3/action/datastore_search?resource_id=resource-ipm&limit=1&offset=0",
  );
  const dataPageTwo = await request.get(
    "/api/3/action/datastore_search?resource_id=resource-ipm&limit=1&offset=1",
  );
  expect((await dataPageOne.json()).result.records[0]._id).not.toBe(
    (await dataPageTwo.json()).result.records[0]._id,
  );
  expect((await dataPageTwo.json()).result.offset).toBe(1);

  const packageDetail = await request.get(
    "/api/3/action/package_show?id=data-sekolah-wajo",
  );
  expect(packageDetail.ok()).toBeTruthy();
  expect(packageDetail.headers()["cache-control"]).toContain("no-store");

  const activity = await request.get(
    "/api/3/action/package_activity_list?id=data-sekolah-wajo&limit=8&offset=0",
  );
  expect(activity.ok()).toBeTruthy();
  expect(activity.headers()["cache-control"]).toContain("no-store");
  expect((await activity.json()).success).toBe(true);
  const activitySnapshot = await request.get(
    "/api/3/action/package_activity_list?id=data-sekolah-wajo&include_hidden_activity=true",
  );
  expect(activitySnapshot.status()).toBe(400);
  expect((await activitySnapshot.json()).error.__type).toBe("Validation Error");
  const legacyActivityParam = await request.get(
    "/api/3/action/package_activity_list?id=data-sekolah-wajo&include_data=true",
  );
  expect(legacyActivityParam.status()).toBe(400);

  const resource = await request.get(
    "/api/3/action/resource_show?id=resource-ipm",
  );
  expect(resource.ok()).toBeTruthy();
  expect(resource.headers()["cache-control"]).toContain("no-store");

  const dataStore = await request.get(
    "/api/3/action/datastore_search?resource_id=resource-ipm&limit=1",
  );
  expect(dataStore.ok()).toBeTruthy();
  expect(dataStore.headers()["cache-control"]).toContain("no-store");

  const mutation = await request.get("/api/3/action/package_create");
  expect(mutation.status()).toBe(404);
  expect(mutation.headers()["x-robots-tag"]).toContain("noindex");
  const post = await request.post("/api/3/action/package_search");
  expect(post.status()).toBe(404);
});

test("internal CKAN cache revalidation webhook rejects unsigned public requests", async ({
  request,
}) => {
  const response = await request.post("/api/internal/ckan/revalidate", {
    data: { event: "manual.revalidate", event_id: "public-forgery" },
  });
  expect([401, 503]).toContain(response.status());
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["x-robots-tag"]).toContain("noindex");
});

test("public API omits private resource metadata embedded in a public package", async ({
  request,
}) => {
  const detail = await request.get(
    "/api/3/action/package_show?id=data-sekolah-wajo",
  );
  expect(detail.ok()).toBeTruthy();
  const detailResources = (await detail.json()).result.resources;
  expect(detailResources.map((resource) => resource.id)).toContain(
    "resource-sekolah",
  );
  expect(detailResources.map((resource) => resource.id)).not.toContain(
    "resource-private-on-public-package",
  );

  const search = await request.get(
    "/api/3/action/package_search?q=sekolah&rows=10",
  );
  const dataset = (await search.json()).result.results.find(
    (item) => item.name === "data-sekolah-wajo",
  );
  expect(dataset.resources.map((resource) => resource.id)).not.toContain(
    "resource-private-on-public-package",
  );

  const activity = await request.get(
    "/api/3/action/package_activity_list?id=data-sekolah-wajo",
  );
  const activities = (await activity.json()).result;
  expect(activities[0]).not.toHaveProperty("user");
  expect(activities[0]).not.toHaveProperty("user_id");
  expect(activities[0]).not.toHaveProperty("data");
});

test("public API does not disclose private package or resource records", async ({
  request,
}) => {
  for (const path of [
    "/api/3/action/package_show?id=internal-draft-dataset",
    "/api/3/action/package_activity_list?id=internal-draft-dataset",
    "/api/3/action/resource_show?id=resource-private",
    "/api/3/action/file_show?id=resource-private",
    "/api/3/action/datastore_search?resource_id=resource-private",
  ]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(404);
    expect((await response.json()).success, path).toBe(false);
  }
});

test("CORS preflight is available only for published read-only actions", async ({
  request,
}) => {
  const allowed = await request.fetch("/api/3/action/package_search", {
    method: "OPTIONS",
    headers: {
      Origin: "http://127.0.0.1:3100",
      "Access-Control-Request-Method": "GET",
    },
  });
  expect(allowed.status()).toBe(204);
  expect(allowed.headers()["access-control-allow-origin"]).toBe(
    "http://127.0.0.1:3100",
  );

  const rejected = await request.fetch("/api/3/action/package_create", {
    method: "OPTIONS",
    headers: {
      Origin: "http://127.0.0.1:3100",
      "Access-Control-Request-Method": "POST",
    },
  });
  expect(rejected.status()).toBe(404);
});

test("CKAN Pages feeds the public information hub, structured page blocks, and internal dataset links", async ({
  page,
}) => {
  await page.goto("/informasi");
  await expect(
    page.getByRole("heading", { name: "Informasi", exact: true }),
  ).toBeVisible();
  const informationNav = page.getByRole("navigation", {
    name: "Navigasi informasi",
  });
  await expect(
    informationNav.getByRole("link", { name: "Tentang" }),
  ).toHaveAttribute("href", "/informasi/tentang-satu-data");
  await expect(
    page.getByRole("link", { name: /Tentang Satu Data Wajo/i }).first(),
  ).toBeVisible();

  await page.goto("/informasi/tentang-satu-data");
  await expect(
    page.getByRole("heading", { name: "Tentang Satu Data Wajo" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Prinsip layanan" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Lihat dataset sekolah/i }),
  ).toHaveAttribute("href", "/dataset/data-sekolah-wajo");
  await expect(
    page.locator('script[type="application/ld+json"]'),
  ).toContainText('"@type":"WebPage"');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "Mengenal Portal Satu Data Kabupaten Wajo.",
  );
});

test("CKAN Pages blog posts drive the news archive, detail SEO, and referenced media proxy", async ({
  page,
  request,
}) => {
  await page.goto("/berita");
  await expect(
    page.getByRole("heading", { name: "Berita dan artikel" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Warta Data Wajo" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Baca artikel/i }),
  ).toHaveAttribute("href", "/berita/warta-data-wajo");

  await page.goto("/berita/warta-data-wajo");
  await expect(
    page.getByRole("heading", { name: "Warta Data Wajo" }),
  ).toBeVisible();
  await expect(
    page.locator('script[type="application/ld+json"]'),
  ).toContainText('"@type":"NewsArticle"');
  await expect(
    page.locator(
      'meta[name="article:published_time"], meta[property="article:published_time"]',
    ),
  ).toHaveAttribute("content", "2026-10-28");

  const media = await request.get("/api/cms/media/cms-cover.png");
  expect(media.status()).toBe(200);
  expect(media.headers()["content-type"]).toContain("image/png");
  expect(media.headers()["cache-control"]).toContain("no-store");

  const unreferencedMedia = await request.get("/api/cms/media/private-doc.png");
  expect(unreferencedMedia.status()).toBe(404);
});

test("private and not-yet-published CKAN Pages records never appear on public routes", async ({
  page,
}) => {
  const privatePage = await page.goto("/informasi/halaman-internal");
  expect(privatePage.status()).toBe(404);
  const scheduledPage = await page.goto("/berita/artikel-terjadwal");
  expect(scheduledPage.status()).toBe(404);
  await page.goto("/berita");
  await expect(
    page.getByRole("heading", { name: "Artikel Terjadwal" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Halaman Internal" }),
  ).toHaveCount(0);
});

test("public robots and sitemap expose CMS routes without indexing private records", async ({
  request,
}) => {
  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBeTruthy();
  const robotsText = await robots.text();
  expect(robotsText).toContain("/informasi");
  expect(robotsText).toContain("/berita");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBeTruthy();
  const sitemapText = await sitemap.text();
  expect(sitemapText).toContain("/informasi/tentang-satu-data");
  expect(sitemapText).toContain("/berita/warta-data-wajo");
  expect(sitemapText).not.toContain("halaman-internal");
  expect(sitemapText).not.toContain("artikel-terjadwal");
});
