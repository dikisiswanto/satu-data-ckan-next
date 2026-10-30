import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures = [];
const read = (path) => readFileSync(join(root, path), "utf8");
const requireText = (path, token, message = token) => {
  if (!read(path).includes(token)) failures.push(`${path}: ${message}`);
};

const sharedCopyRoutes = [
  "dataset",
  "infografik",
  "organisasi",
  "publikasi",
  "statistik",
  "berita",
  "informasi",
];
for (const route of sharedCopyRoutes) {
  const page = `src/app/(public)/${route}/page.jsx`;
  const loading = `src/app/(public)/${route}/loading.jsx`;
  if (!existsSync(join(root, page)) || !existsSync(join(root, loading))) {
    failures.push(`${route}: public page and loading boundary must both exist`);
    continue;
  }
  requireText(
    page,
    `publicPageCopy.${route}`,
    `route copy must use shared ${route} wording`,
  );
  requireText(
    loading,
    `publicPageCopy.${route}`,
    `loading copy must use shared ${route} wording`,
  );
}

for (const route of ["berita", "informasi"]) {
  const page = `src/app/(public)/${route}/[slug]/page.jsx`;
  const loading = `src/app/(public)/${route}/[slug]/loading.jsx`;
  requireText(
    page,
    "reserveTitle reserveDescription",
    "dynamic title and description must reserve geometry",
  );
  requireText(
    page,
    "public-cms-cover",
    "CMS details must reserve the cover image frame",
  );
  requireText(
    loading,
    "public-cms-cover",
    "CMS detail fallback must reserve the same cover frame",
  );
  requireText(
    loading,
    "public-dynamic-heading",
    "CMS detail fallback must reserve the heading geometry",
  );
}

requireText(
  "src/app/(public)/publikasi/[slug]/page.jsx",
  "min-h-[460px]",
  "PDF viewer must reserve its final minimum height",
);
requireText(
  "src/app/(public)/publikasi/[slug]/loading.jsx",
  "min-h-[460px]",
  "PDF loading fallback must match the final frame height",
);
requireText(
  "src/app/(public)/informasi/loading.jsx",
  "aspect-[16/9]",
  "CMS card fallback must reserve the final image area",
);
requireText(
  "src/app/(public)/berita/loading.jsx",
  "aspect-[16/9]",
  "News card fallback must reserve the final image area",
);
requireText(
  "src/app/styles/public-layout-stability.css",
  ".public-loading-grid-md > :nth-child(n + 2)",
  "mobile skeletons must not stack several rows when only the first row is initially visible",
);
requireText(
  "src/app/(public)/berita/page.jsx",
  "const remaining = featured ? posts.filter",
  "the news archive must not truncate published articles to fit a skeleton",
);
requireText(
  "src/app/(public)/informasi/page.jsx",
  "const generalPages = pages.filter",
  "the information hub must not truncate published pages to fit a skeleton",
);
requireText(
  "src/app/(public)/berita/loading.jsx",
  "mt-2 h-4 w-3/4",
  "Featured-news fallback must reserve the final excerpt lines",
);
requireText(
  "src/app/(public)/informasi/loading.jsx",
  "length: 3",
  "Information fallback must match the first visible CMS card group",
);
requireText(
  "src/app/(public)/dataset/[slug]/loading.jsx",
  "Diperbarui",
  "Dataset detail fallback must use the resolved publication-date wording",
);
requireText(
  "src/app/(public)/statistik/[slug]/loading.jsx",
  "public-heading-description-reserved",
  "indicator detail fallback must reserve its real heading copy",
);
requireText(
  "src/app/styles/public-layout-stability.css",
  "-webkit-line-clamp: 2",
  "dynamic page titles must have a stable maximum line count",
);
requireText(
  "src/app/(public)/dataset/[slug]/page.jsx",
  "dataset-detail-title",
  "dataset detail title must reserve space",
);
requireText(
  "src/app/(public)/dataset/[slug]/loading.jsx",
  "dataset-detail-description-skeleton",
  "dataset detail fallback must reserve the description block",
);
requireText(
  "src/app/(public)/page.jsx",
  "HomeCKANHighlightsSkeleton",
  "homepage CKAN section needs a geometry-matched fallback",
);
requireText(
  "src/app/(public)/page.jsx",
  "HomeCmsNewsHighlightsSkeleton",
  "homepage CMS section needs a geometry-matched fallback",
);
requireText(
  "src/app/styles/public-responsive.css",
  ".public-app-shell .home-feature-visualization .home-data-art",
  "mobile Pahami Data illustration needs a dedicated responsive layout",
);
requireText(
  "src/app/styles/public-responsive.css",
  "position: relative;",
  "mobile Pahami Data artwork must remain in document flow",
);
requireText(
  "src/app/styles/public-responsive.css",
  "grid-template-columns: minmax(0, 1fr) minmax(0, 0.9fr)",
  "mobile artwork must use a readable two-column composition",
);

requireText(
  "src/app/(public)/page.jsx",
  "home-metric-value",
  "homepage dynamic numbers must use tabular reserved-width metrics",
);
requireText(
  "src/app/styles/public-layout-stability.css",
  ".public-heading-title-reserved",
  "layout stability stylesheet must define heading reservations",
);
requireText(
  "src/app/globals.css",
  "public-layout-stability.css",
  "layout stability stylesheet must be imported",
);
requireText(
  "playwright.config.js",
  "E2E_CKAN_DELAY_MS",
  "E2E CKAN mock must delay API responses to expose loading states",
);
requireText(
  "tests/e2e/public-layout-stability.spec.js",
  "toBeLessThanOrEqual(0.1)",
  "public CLS regression test must enforce the 0.10 target",
);
requireText(
  "src/app/styles/public-home-hero.css",
  "body:has(.public-home) .home-hero {",
  "homepage hero must have one canonical layout owner",
);
requireText(
  "src/app/styles/public-home-hero.css",
  ".home-hero-visual {",
  "hero illustration must have explicit layout dimensions",
);
requireText(
  "src/app/styles/public-home-hero.css",
  "z-index: 0;",
  "hero visual pattern must stay above the background and below content",
);
requireText(
  "src/components/public-breadcrumbs.jsx",
  'className="page-container py-2.5 sm:py-3"',
  "breadcrumb container must share the public content max width",
);
requireText(
  "src/components/public-breadcrumbs.jsx",
  "inline-flex w-fit max-w-full",
  "breadcrumb surface must size to its content, not stretch across the full container",
);
requireText(
  "src/app/styles/public-layout-stability.css",
  ".public-breadcrumb-band {",
  "breadcrumb background must be separated from the content-width breadcrumb control",
);
const homePage = read("src/app/(public)/page.jsx");
for (const token of [
  "PORTAL DATA TERPADU",
  "Temukan Data,",
  "Pahami {siteConfig.regionShortName}.",
  "Cari dataset, tema, atau kata kunci…",
  'submitLabel="Cari"',
  "Coba cari",
  "Data daerah, terhubung dalam satu portal",
  "Organisasi aktif",
  "Indikator publik",
  "Dataset terbuka",
  "Ringkasan dihitung dari data yang tersedia untuk publik.",
]) {
  if (!homePage.includes(token))
    failures.push(`homepage hero: reference content missing "${token}"`);
}
requireText(
  "src/app/styles/public-home-hero.css",
  "grid-template-columns: minmax(0, 1.08fr) minmax(19rem, 0.92fr)",
  "hero must use a balanced two-column desktop composition",
);
for (const token of [
  "home-visual-chip-top-left",
  "home-visual-chip-top-right",
  "home-visual-chip-bottom-left",
  "home-visual-chip-bottom-right",
]) {
  if (!homePage.includes(token))
    failures.push(`homepage hero: missing clickable metric position ${token}`);
}
requireText(
  "src/components/public-scroll-manager.jsx",
  "IntersectionObserver",
  "homepage sections must reveal in response to scroll position",
);
requireText(
  "src/app/styles/public-pages-motion.css",
  "is-scroll-visible",
  "scroll reveal must have a visible transition state",
);
requireText(
  "src/app/styles/public-layout-stability.css",
  "flex-direction: column",
  "empty information state must use one vertical column",
);
requireText(
  "src/app/styles/public-home-hero.css",
  "background-position: center, center, center 47%",
  "Wajo panorama crop must be deliberate and stable",
);
requireText(
  "src/app/styles/public-home-hero.css",
  ".home-hero-visual {",
  "hero data illustration must keep an explicit frame",
);
if (
  homePage.includes("Topik populer") ||
  homePage.includes("Satu portal untuk menemukan data daerah")
)
  failures.push("homepage hero: outdated reference copy must not return");
if (
  read("src/app/styles/quality-pass.css").includes(
    "padding-top: 9rem !important",
  ) ||
  read("src/app/styles/quality-pass.css").includes(
    "padding-top: 7.5rem !important",
  )
) {
  failures.push(
    "hero: legacy oversized top-padding overrides must not compete with the canonical layout",
  );
}
requireText(
  "src/app/styles/public-layout-stability.css",
  ".public-app-shell main.public-interior-page.section-space",
  "interior pages must use the compact shared vertical rhythm",
);
requireText(
  "src/app/styles/public-layout-stability.css",
  "min-block-size: 17.5rem",
  "statistics cards must not reserve excessive empty height",
);

requireText(
  "src/components/indicator-trend-chart.jsx",
  "public-indicator-chart-frame",
  "indicator chart must reserve the same plot frame with and without numeric data",
);
requireText(
  "src/components/indicator-trend-chart.jsx",
  "min-h-10",
  "indicator chart heading must reserve two lines for copy differences",
);
requireText(
  "src/components/indicator-trend-chart.jsx",
  "public-indicator-chart-empty",
  "sparse indicators must keep a chart placeholder instead of collapsing the plot area",
);
requireText(
  "src/app/(public)/statistik/[slug]/loading.jsx",
  "xl:grid-cols-[minmax(0,1fr)_320px]",
  "indicator loading must preserve the desktop main/sidebar grid",
);
if (
  read("src/app/(public)/statistik/[slug]/loading.jsx").includes(
    "Pilih tampilan data",
  )
) {
  failures.push(
    "statistik/[slug]: fallback must not show a filter panel that does not exist on the resolved page",
  );
}
requireText(
  "src/app/(public)/statistik/[slug]/loading.jsx",
  "Metodologi dan sumber",
  "indicator loading must reserve the methodology sidebar",
);
requireText(
  "src/app/(public)/statistik/[slug]/loading.jsx",
  "indicator-metadata-card",
  "indicator loading summary must use the resolved metadata card geometry",
);
requireText(
  "src/app/(public)/statistik/[slug]/loading.jsx",
  "public-indicator-table-frame",
  "indicator loading must reserve the final bounded table frame",
);
if (
  !read("src/app/(public)/statistik/[slug]/loading.jsx").includes(
    'className="page-container section-space public-interior-page" aria-busy="true"',
  )
) {
  failures.push(
    "statistik/[slug]: loading root must use the same top-level spacing as the resolved page",
  );
}
requireText(
  "src/app/(public)/statistik/[slug]/loading.jsx",
  "Tabel menampilkan hingga 100 baris data terbaru.",
  "indicator loading must use the resolved table summary copy",
);
requireText(
  "src/app/(public)/statistik/[slug]/page.jsx",
  "public-indicator-table-frame",
  "resolved indicator table must retain a bounded scroll frame",
);
requireText(
  "src/app/(public)/statistik/[slug]/page.jsx",
  "indicator-metadata-card",
  "resolved indicator metadata cards must share reserved dimensions with skeletons",
);
requireText(
  "tests/unit/indicator-trend-chart.test.js",
  "only one numeric period",
  "chart unit tests must cover sparse numeric observations",
);
requireText(
  "tests/e2e/public-layout-stability.spec.js",
  "resolve, 700",
  "CLS E2E test must observe delayed layout settling after async content and fonts load",
);
requireText(
  "tests/e2e/public-layout-stability.spec.js",
  "/informasi/panduan-portal",
  "CLS E2E coverage must exercise long CMS titles and descriptions",
);
requireText(
  "tests/e2e/public-layout-stability.spec.js",
  "/berita/pembaruan-katalog-data",
  "CLS E2E coverage must exercise long article copy",
);
requireText(
  "scripts/e2e-mock-ckan.mjs",
  "memanfaatkan data resmi Kabupaten Wajo secara tepat",
  "CKAN mock must exercise long CMS card descriptions",
);

for (const route of ["infografik", "publikasi"]) {
  const loading = `src/app/(public)/${route}/[slug]/loading.jsx`;
  const page = `src/app/(public)/${route}/[slug]/page.jsx`;
  if (read(loading).includes("public-interior-page space-y-6"))
    failures.push(
      `${route}/[slug]: loading root spacing must match the resolved page`,
    );
  requireText(
    loading,
    "mb-7",
    `${route}/[slug] fallback must reserve the same return-link margin`,
  );
  requireText(
    loading,
    "mt-7 grid items-start",
    `${route}/[slug] fallback must reserve the resolved details grid margin`,
  );
  if (route === "infografik") {
    requireText(
      page,
      "public-infographic-gallery",
      "infographic gallery must reserve image/empty-state geometry",
    );
    requireText(
      loading,
      "public-infographic-gallery",
      "infographic gallery fallback must match the resolved image frame",
    );
    requireText(
      page,
      "public-infographic-download-list",
      "infographic downloads must use a bounded list frame",
    );
    requireText(
      loading,
      "public-infographic-download-list",
      "infographic download fallback must reserve the list frame",
    );
  } else {
    requireText(
      page,
      "public-publication-resource-list",
      "publication files must use a bounded list frame",
    );
    requireText(
      loading,
      "public-publication-resource-list",
      "publication loading must reserve the file list frame",
    );
    requireText(
      page,
      "h-[68vh] min-h-[460px]",
      "publication empty preview must reserve the same height as an embedded PDF",
    );
  }
}

if (failures.length) {
  process.stderr.write(
    `Layout stability checks failed:\n${failures.map((item) => `- ${item}`).join("\n")}\n`,
  );
  process.exit(1);
}

process.stdout.write(
  `Layout stability checks passed (${sharedCopyRoutes.length} shared-copy routes, CMS detail reserves, homepage fallbacks, and CLS E2E coverage).\n`,
);
