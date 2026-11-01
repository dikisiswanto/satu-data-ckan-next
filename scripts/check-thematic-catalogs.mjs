import { readFile } from "node:fs/promises";

const errors = [];
async function source(path) {
  try {
    return await readFile(path, "utf8");
  } catch {
    errors.push(`File wajib tidak ditemukan: ${path}`);
    return "";
  }
}
function requireMatch(contents, pattern, message) {
  if (!pattern.test(contents)) errors.push(message);
}

const homepage = await source("src/app/(public)/page.jsx");
const normalizedHomepage = homepage
  .replace(/\s+/g, " ")
  .toLocaleLowerCase("id");
requireMatch(
  normalizedHomepage,
  /displaystat\(facetsunavailable \? null : normalizedcategories\.length\)[\s\S]*<small>kategori<\/small>/,
  "Metrik beranda harus menghitung kategori dari facet kategori publik, bukan resource/file.",
);
requireMatch(
  homepage,
  /href="\/kategori"[\s\S]*displayStat\(facetsUnavailable \? null : normalizedCategories\.length\)/,
  "Kartu jumlah kategori harus membuka direktori kategori khusus.",
);
requireMatch(
  homepage,
  /href="\/kategori"[\s\S]*Semua kategori/,
  "Bagian kategori beranda harus memiliki tautan menuju direktori kategori lengkap.",
);

const categoryPage = await source("src/app/(public)/kategori/page.jsx");
requireMatch(
  categoryPage,
  /getPublishedDatasetFacetsResult[\s\S]*normalizePublicCategoryFacets/,
  "Direktori kategori harus memakai facet dataset publik, pencarian, dan pagination.",
);
requireMatch(
  categoryPage,
  /normalizePageNumber[\s\S]*PublicPagination/,
  "Direktori kategori harus menormalisasi halaman dan memakai pagination publik bersama.",
);
requireMatch(
  categoryPage,
  /href=\{categoryHref\(category\)\}[\s\S]*dataset umum/,
  "Setiap kategori harus membuka katalog dataset dengan ID group yang tepat dan menampilkan unit dataset umum.",
);
requireMatch(
  categoryPage,
  /robots:[\s\S]*index: false/,
  "Hasil pencarian/pengurutan/pagination kategori harus noindex.",
);
const publicNavigation = await source("src/lib/public-navigation.js");
if (/href:\s*["']\/kategori["']/.test(publicNavigation)) {
  errors.push(
    "Direktori kategori tidak boleh ditambahkan sebagai menu header utama.",
  );
}
const publicData = await source("src/lib/data/public.js");
requireMatch(
  publicData,
  /getPublicPortalStatsResult[\s\S]*organizations:[\s\S]*indicators:/,
  "Ringkasan beranda hanya boleh menghitung metrik yang benar-benar ditampilkan.",
);
if (/countActivePublicResources|resource_search/.test(publicData)) {
  errors.push(
    "Ringkasan beranda tidak boleh menjalankan hitungan resource yang tidak ditampilkan sebagai metrik kategori.",
  );
}

const sitemap = await source("src/app/sitemap.js");
requireMatch(
  sitemap,
  /"\/kategori"/,
  "Halaman kategori harus masuk sitemap publik.",
);
const robots = await source("src/app/robots.js");
requireMatch(
  robots,
  /"\/kategori"/,
  "Crawler harus diizinkan mengindeks direktori kategori.",
);

const ckanClient = await source("src/lib/ckan/client.js");
requireMatch(
  ckanClient,
  /if \(key === "facet\.field" && items\.length === 1\)[\s\S]*url\.searchParams\.append\(key, String\(items\[0\]\)\)/,
  "Singleton facet.field harus dikirim sebagai query key berulang agar CKAN 2.12 menerima list, bukan scalar.",
);

const adminDashboard = await source(
  "deploy/ckan/theme/ckanext/wajo_theme/templates/wajo_theme/dashboard.html",
);
requireMatch(
  adminDashboard,
  /h\.url_for\(dataset_type ~ '\.search', q=wajo_admin_general_dataset_fq\)[\s\S]*q=wajo_admin_portal_fqs\.indicators[\s\S]*q=wajo_admin_portal_fqs\.infographics[\s\S]*q=wajo_admin_portal_fqs\.publications/,
  "Tautan kartu dashboard CKAN harus meneruskan ekspresi Solr melalui q, bukan fq yang akan dianggap sebagai nama field pencarian.",
);
if (/\.search',\s*fq=/.test(adminDashboard)) {
  errors.push(
    "Dashboard CKAN tidak boleh membangun tautan dataset.search dengan parameter fq.",
  );
}

const organizations = await source("src/lib/data/organizations.js");
requireMatch(
  organizations,
  /PUBLIC_ORGANIZATION_COUNT_QUERIES[\s\S]*datasets:[\s\S]*indicators:[\s\S]*infographics:[\s\S]*publications:[\s\S]*public_content_counts/,
  "Direktori OPD harus menghitung empat tipe katalog publik secara terpisah melalui CKAN facets.",
);
requireMatch(
  organizations,
  /counts \? \(counts\.get\(organization\.name\) \?\? 0\) : null/,
  "Count OPD yang gagal diambil harus tetap null, bukan dipalsukan menjadi nol.",
);

const directory = await source("src/components/organization-directory.jsx");
requireMatch(
  directory,
  /organizationContentCount[\s\S]*Dataset[\s\S]*Indikator[\s\S]*Infografik[\s\S]*Publikasi/,
  "Kartu OPD harus menampilkan count terpisah untuk setiap katalog dan tautan yang sesuai.",
);
requireMatch(
  directory,
  /contentType[\s\S]*contentState[\s\S]*organization-search[\s\S]*organization-sort/,
  "Direktori OPD harus mendukung pencarian, filter jenis katalog, status penerbit, dan pengurutan.",
);

const publicOrganizations = await source("src/lib/public-organizations.js");
requireMatch(
  publicOrganizations,
  /ORGANIZATION_CONTENT_TYPES[\s\S]*organizationTotalContentCount[\s\S]*countsAvailable/,
  "Ringkasan OPD harus menjaga count kategori terpisah dan status unavailable.",
);
requireMatch(
  publicOrganizations,
  /return source !== null && source !== undefined && Number\.isFinite\(count\)[\s\S]*: null/,
  "Count kategori tidak boleh fallback ke package_count CKAN yang bercampur.",
);

const catalogQuery = await source("src/lib/data/catalog-query.js");
requireMatch(
  catalogQuery,
  /buildPublicCatalogQuery[\s\S]*BASE_SEARCH_FIELDS[\s\S]*normalizePublicCatalogSort/,
  "Katalog tematik harus memakai builder query yang aman dan sort whitelist.",
);

for (const [route, label] of [
  ["src/app/(public)/infografik/page.jsx", "infografik"],
  ["src/app/(public)/publikasi/page.jsx", "publikasi"],
  ["src/app/(public)/statistik/page.jsx", "indikator"],
]) {
  const page = await source(route);
  requireMatch(
    page,
    /CatalogSearchForm[\s\S]*query=\{query\}[\s\S]*sort=\{sort\}/,
    `Katalog ${label} harus memiliki form pencarian dan pengurutan.`,
  );
  requireMatch(
    page,
    /search\.set\("q", query\)[\s\S]*search\.set\("sort", sort\)/,
    `Pagination katalog ${label} harus mempertahankan query dan sort.`,
  );
  requireMatch(
    page,
    /hasSearchFilter[\s\S]*robots:[\s\S]*index: false/,
    `URL hasil pencarian katalog ${label} harus noindex agar tidak membuat halaman duplikat.`,
  );
}

for (const [path, kind] of [
  ["src/lib/data/public-infographics.js", "infographic"],
  ["src/lib/data/public-publications.js", "publication"],
  ["src/lib/data/public-indicators.js", "indicator"],
]) {
  const file = await source(path);
  requireMatch(
    file,
    /query = ""[\s\S]*sort = "terbaru"[\s\S]*buildPublicCatalogQuery[\s\S]*normalizePublicCatalogSort/,
    `Adapter ${kind} harus menerapkan query pencarian dan sort yang tervalidasi ke CKAN.`,
  );
  requireMatch(
    file,
    new RegExp(
      `buildPortalContentDiscoveryFilter\\("${kind}"\\)[\\s\\S]*buildOrganizationFilter\\(organizationId\\)`,
    ),
    `Adapter ${kind} harus tetap membatasi jenis konten dan OPD.`,
  );
}

const detail = await source("src/app/(public)/organisasi/[slug]/page.jsx");
requireMatch(
  detail,
  /getPublishedDatasetsResult[\s\S]*getPublishedIndicatorsResult[\s\S]*getPublishedInfographicsResult[\s\S]*getPublishedPublicationsResult[\s\S]*counts\s*=\s*\{/,
  "Detail OPD harus menggunakan empat katalog terpisah untuk count dan daftar konten.",
);

const e2e = await source("tests/e2e/public-portal.spec.js");
requireMatch(
  e2e,
  /1 Dataset dari Bappeda Wajo[\s\S]*1 Indikator dari Bappeda Wajo[\s\S]*0 Dataset dari Dinas Kesehatan[\s\S]*1 Infografik dari Dinas Kesehatan/,
  "E2E harus membuktikan OPD dengan infografik saja tidak ditampilkan sebagai pemilik dataset umum.",
);
requireMatch(
  e2e,
  /organization detail separates general datasets[\s\S]*0 dataset publik[\s\S]*1 infografik publik/,
  "E2E detail OPD harus memverifikasi count dan daftar dari kategori yang sama.",
);
requireMatch(
  e2e,
  /infografik\?q=2025[\s\S]*statistik\?q=poin[\s\S]*publikasi\?q=kabupaten/,
  "E2E katalog tematik harus memverifikasi pencarian lintas jenis halaman.",
);

const mock = await source("scripts/e2e-mock-ckan.mjs");
requireMatch(
  mock,
  /extras_\[a-z0-9_\]\+\):[\s\S]*item\.extras/,
  "Mock CKAN E2E harus dapat mencari nilai pada metadata tambahan katalog tematik.",
);

if (errors.length) {
  console.error(errors.map((error) => `FAIL ${error}`).join("\n"));
  process.exit(1);
}
process.stdout.write(
  "Public catalog checks passed: exact OPD category counts, no package_count fallback, and searchable/paginated thematic catalogues.\n",
);
