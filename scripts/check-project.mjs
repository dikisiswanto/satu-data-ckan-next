import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const errors = [];
const ignoredDirectories = new Set([
  "node_modules",
  ".next",
  ".git",
  "coverage",
  "playwright-report",
  "test-results",
]);
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    const relative = path.relative(root, file).split(path.sep).join("/");
    if (entry.isDirectory()) {
      if (
        ignoredDirectories.has(entry.name) ||
        relative === "deploy/ckan/upstream" ||
        relative.startsWith("deploy/ckan/upstream/")
      )
        continue;
      await walk(file);
    } else if (/\.(?:php|phtml|blade\.php)$/i.test(entry.name)) {
      errors.push(
        `Source PHP tidak relevan dengan runtime CKAN/Next.js: ${relative}`,
      );
    }
  }
}
await walk(root);

const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const lock = JSON.parse(
  await readFile(path.join(root, "package-lock.json"), "utf8"),
);
if (pkg.packageManager !== "npm@10.9.2")
  errors.push("packageManager harus npm@10.9.2");
if (!pkg.engines.node.includes("22.16.0") || !pkg.engines.node.includes("<25"))
  errors.push("Versi Node.js yang didukung harus Node 22/24.");
if (lock.name !== pkg.name || lock.version !== pkg.version)
  errors.push(
    "Nama/versi package-lock.json harus sinkron dengan package.json.",
  );
for (const field of [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "engines",
]) {
  if (
    JSON.stringify(pkg[field] || {}) !==
    JSON.stringify(lock.packages?.[""]?.[field] || {})
  )
    errors.push(
      `Metadata ${field} package-lock.json tidak sinkron dengan package.json.`,
    );
}

const required = [
  "src/lib/ckan/client.js",
  "src/lib/cms/pages.js",
  "src/lib/markdown/markdown-images.js",
  "src/components/cms/markdown-content.jsx",
  "src/components/ui/image-lightbox.jsx",
  "src/lib/data/portal-content-types.js",
  "src/components/cms/content-blocks.jsx",
  "src/components/cms/content-card.jsx",
  "src/app/(public)/informasi/page.jsx",
  "src/app/(public)/informasi/[slug]/page.jsx",
  "src/app/(public)/berita/page.jsx",
  "src/app/(public)/berita/[slug]/page.jsx",
  "src/app/api/cms/media/[filename]/route.js",
  "src/app/api/public/ckan-file/[fileId]/route.js",
  "tests/unit/public-ckan-file-route.test.js",
  "tests/unit/markdown-link-url.test.js",
  "src/lib/data/public.js",
  "src/lib/data/organizations.js",
  "src/lib/public-categories.js",
  "src/lib/public-organizations.js",
  "src/lib/data/public-indicators.js",
  "src/lib/data/public-infographics.js",
  "src/lib/data/public-publications.js",
  "src/lib/ckan/public-resource-url.js",
  "src/lib/ckan/delimited-preview.js",
  "src/components/dataset-api-access.jsx",
  "src/app/api/public/resource-preview/route.js",
  "tests/unit/delimited-preview.test.js",
  "deploy/ckan/theme/ckanext/wajo_theme/schemas/dataset.yaml",
  "deploy/ckan/theme/ckanext/wajo_theme/schemas/organization.yaml",
  "deploy/ckan/theme/ckanext/wajo_theme/schemas/group.yaml",
  "deploy/ckan/theme/ckanext/wajo_theme/public/wajo-admin-forms.js",
  "deploy/ckan/configure-upstream-extensions.py",
  "deploy/ckan/install-pages.py",
  "deploy/ckan/theme/setup.py",
  "deploy/ckan/theme/ckanext/wajo_theme/plugin.py",
  "deploy/ckan/theme/ckanext/wajo_theme/templates/base.html",
  "deploy/ckan/theme/ckanext/wajo_theme/templates/header.html",
  "deploy/ckan/theme/ckanext/wajo_theme/assets/webassets.yml",
  "deploy/ckan/theme/ckanext/wajo_theme/assets/css/wajo-theme.css",
  "deploy/ckan/theme/ckanext/wajo_theme/assets/css/wajo-admin-design-system.css",
  "scripts/check-admin-forms.mjs",
  "docs/CKAN-CUSTOM-FORMS-CONTEXT-AWARE.md",
  "scripts/check-build.py",
  "scripts/check-public-hero.py",
  "scripts/check-base.py",
  "deploy/ckan/sync-ckan-base-source.sh",
  "deploy/ckan/prepare-ckan-base.sh",
  "src/app/api/3/action/[...action]/route.js",
  "src/app/(public)/api-data/page.jsx",
  "docs/API.md",
  "docs/IMAGE-LIGHTBOX-AND-CATALOG.md",
  "src/app/(public)/statistik/page.jsx",
  "src/app/(public)/statistik/[slug]/page.jsx",
  "src/app/(public)/infografik/page.jsx",
  "src/app/(public)/infografik/[slug]/page.jsx",
  "src/app/(public)/publikasi/page.jsx",
  "src/app/(public)/publikasi/[slug]/page.jsx",
  "src/components/indicator-trend-chart.jsx",
  "tests/unit/ckan-public-content.test.js",
  "tests/unit/public-organizations.test.js",
  "tests/unit/ckan-cms.test.js",
  "tests/unit/geojson-preview.test.js",
  "tests/unit/markdown-images.test.js",
  "tests/e2e/public-portal.spec.js",
  "docs/CMS.md",
  "src/lib/geo/geojson-preview.js",
  "src/components/geojson-resource-preview.jsx",
  "public/logo-satu-data-indonesia.svg",
  "scripts/e2e-mock-ckan.mjs",
  "deploy/ckan/bootstrap-upstream.sh",
  "deploy/ckan/compose.sh",
  "deploy/ckan/render-upstream-env.py",
  "deploy/ckan/sync-env.py",
  "scripts/check-env.py",
  "scripts/check-css.mjs",
  "deploy/ckan/enable-xloader.sh",
  "deploy/ckan/apply-datastore-permissions.sh",
  "deploy/ckan/docker-compose.override.yml",
  "deploy/ckan/docker-compose.cloudflare.yml",
  "deploy/ckan/docker-compose.manual.yml",
  "deploy/ckan/docker-compose.cloudflare-basic-auth.yml",
  "deploy/ckan/docker-compose.manual-basic-auth.yml",
  "deploy/ckan/Caddyfile",
  "deploy/ckan/Caddyfile.tunnel",
  "deploy/ckan/Caddyfile.basic-auth",
  "deploy/ckan/Caddyfile.tunnel.basic-auth",
  ".env.ckan.example",
  "Dockerfile",
  "README.md",
];
for (const item of required) {
  try {
    await stat(path.join(root, item));
  } catch {
    errors.push(`File CKAN/Next.js wajib tidak ditemukan: ${item}`);
  }
}

const forbiddenPaths = [
  "backend",
  "composer.json",
  "composer.lock",
  "artisan",
  "docker-compose.yml",
  "deploy/laravel-nginx.conf",
  "deploy/edge-nginx.conf",
  "src/app/portal",
  "src/hooks/use-submission-lock.js",
  "src/app/auth",
  "src/components/admin",
  "src/lib/backend",
  "src/lib/conversion",
  "src/lib/sdi",
  ".env.example",
  "CKAN-MIGRATION-MVP.md",
];
for (const item of forbiddenPaths) {
  try {
    await stat(path.join(root, item));
    errors.push(`Path legacy tidak boleh ada: ${item}`);
  } catch {}
}

const checks = [
  [
    "src/app/api/3/action/[...action]/route.js",
    /^(?=[\s\S]*package_search)(?=[\s\S]*package_show)(?=[\s\S]*file_show)(?=[\s\S]*datastore_search)(?=[\s\S]*rewriteCkanDownloadUrls)(?=[\s\S]*X-Robots-Tag)[\s\S]*$/,
    "API publik harus read-only, berbasis Action API CKAN, menyamarkan host admin pada tautan unduhan dan noindex.",
  ],
  [
    "src/app/api/3/action/[...action]/route.js",
    /function assertAllowedParams[\s\S]*new Set\(\["q", "rows", "start", "facets", "sort", "fq"\]\)[\s\S]*new Set\(\["resource_id", "limit", "offset"\]\)/,
    "API publik harus membatasi parameter katalog dan DataStore, dengan subset sort/fq yang dibatasi untuk harvesting CKAN.",
  ],
  [
    "Dockerfile",
    /ARG NEXT_PUBLIC_SITE_URL[\s\S]*ENV \\?[\s\S]*NEXT_PUBLIC_CKAN_ADMIN_URL[\s\S]*COPY --from=dependencies/,
    "Dockerfile harus mengatur variabel build sebelum build Next.js dan menghasilkan image standalone.",
  ],
  [
    "deploy/ckan/docker-compose.override.yml",
    /(?=[\s\S]*CKAN_INDICATOR_TAG)(?=[\s\S]*CKAN_INFOGRAPHIC_TAG)(?=[\s\S]*CKAN_PUBLICATION_TAG)(?=[\s\S]*NEXT_PUBLIC_PPID_ADDRESS)/,
    "Compose harus meneruskan konfigurasi indikator, infografik, publikasi, dan branding dari env.",
  ],
  [
    "src/lib/data/public-indicators.js",
    /portal-indikator[\s\S]*portal_revision_note[\s\S]*datastore_search[\s\S]*normalizeObservation/,
    "Indikator harus berasal dari tag/dataset CKAN dan DataStore termasuk metadata periode/rilis.",
  ],
  [
    "src/app/(public)/dataset/[slug]/page.jsx",
    /(?=[\s\S]*const temporalCoverage)(?=[\s\S]*datasetJsonLd)(?=[\s\S]*GeoJSONResourcePreview)(?=[\s\S]*DatasetApiAccess)[\s\S]*/,
    "Detail dataset harus menghitung temporalCoverage, menyediakan pratinjau geospasial, serta endpoint API per dataset/resource.",
  ],
  [
    "src/components/dataset-resource-preview.jsx",
    /fallbackPreviewQuery[\s\S]*csv-fallback[\s\S]*DataStore akan menyediakan pencarian dan\s*pagination penuh/,
    "Resource CSV/TSV harus tetap menampilkan pratinjau terbatas sebelum DataStore selesai diindeks.",
  ],
  [
    "src/components/geojson-resource-preview.jsx",
    /createGeoMapLayout[\s\S]*NEXT_PUBLIC_MAP_TILE_URL[\s\S]*mapLayout\.tiles\.map/,
    "GeoJSON public preview harus menampilkan raster basemap dan geometri vektor dengan proyeksi yang sama.",
  ],
  [
    "src/lib/geo/geojson-preview.js",
    /mercatorNormalized[\s\S]*createGeoMapLayout[\s\S]*projectGeoCoordinate/,
    "GeoJSON preview must use bounded Web Mercator tile layout for raster/vector alignment.",
  ],
  [
    "src/lib/geo/geojson-preview.js",
    /DEFAULT_MAX_FEATURES = 10_000[\s\S]*DEFAULT_MAX_COORDINATES = 300_000[\s\S]*maxBytes: 20 \* 1024 \* 1024/,
    "GeoJSON preview must support datasets beyond 2,000 features with bounded memory and coordinate limits.",
  ],
  [
    "src/components/dataset-api-access.jsx",
    /(?=[\s\S]*datastore_search)(?=[\s\S]*resource-preview\?resource_id=)(?=[\s\S]*Pratinjau sementara CSV\/TSV)[\s\S]*/,
    "Detail dataset harus menyediakan API metadata/resource/DataStore dan endpoint pratinjau terbatas selama indexing CSV/TSV.",
  ],
  [
    "src/app/api/public/resource-preview/route.js",
    /(?=[\s\S]*safeInternalDownloadUrl)(?=[\s\S]*MAX_BYTES)(?=[\s\S]*resource_show)(?=[\s\S]*package_show)(?=[\s\S]*parseDelimitedPreview)[\s\S]*/,
    "Fallback preview harus membatasi ukuran unduhan, memverifikasi akses publik, dan hanya mengambil path unduhan CKAN internal.",
  ],
  [
    "src/app/styles/public-layout-stability.css",
    /dataset-detail-title[\s\S]*min-block-size: 0[\s\S]*dataset-detail-description[\s\S]*min-block-size: 0[\s\S]*dataset-api-panel/,
    "Detail dataset harus memiliki jarak judul-deskripsi alami dan panel API yang responsif.",
  ],
  [
    "src/components/site-footer.jsx",
    /data\.go\.id[\s\S]*logo-satu-data-indonesia\.svg[\s\S]*alt="Logo Satu Data Indonesia"[\s\S]*width=\{184\}[\s\S]*height=\{118\}/,
    "Footer harus menampilkan logo SDI utuh dengan rasio intrinsik dan menautkan ke portal resminya.",
  ],
  [
    "deploy/ckan/docker-compose.override.yml",
    /harvest-gather[\s\S]*gather-consumer[\s\S]*harvest-fetch[\s\S]*fetch-consumer/,
    "Harvest harus menyediakan kedua worker untuk proses gather/fetch.",
  ],
  [
    "src/lib/data/public-infographics.js",
    /portal-infografik[\s\S]*isImageResource/,
    "Infografik harus berasal dari paket dan resource CKAN publik.",
  ],
  [
    "src/lib/data/portal-content-types.js",
    /portal-indikator[\s\S]*portal-infografik[\s\S]*portal-publikasi[\s\S]*buildDatasetCatalogExclusionFilters/,
    "Jenis konten khusus harus memiliki tag penemuan dan filter katalog Dataset umum.",
  ],
  [
    "src/components/ui/image-lightbox.jsx",
    /(?=[\s\S]*createPortal)(?=[\s\S]*aria-modal="true")(?=[\s\S]*MAX_ZOOM = 5)(?=[\s\S]*Escape)[\s\S]*/,
    "Lightbox gambar harus modal aksesibel dengan close Escape dan batas zoom.",
  ],
  [
    "src/lib/data/public.js",
    /buildPortalContentDiscoveryFilter\("indicator"\)[\s\S]*\["indicators", indicators\][\s\S]*Number\(result\.count \|\| 0\)/,
    "Ringkasan homepage harus menghitung indikator dari CKAN, tidak menyembunyikan fitur.",
  ],
  [
    "src/lib/data/public.js",
    /buildDatasetCatalogExclusionFilters[\s\S]*sanitizePublicPackage/,
    "Katalog dataset harus tetap mengecualikan produk portal khusus dan menyaring marker privasi resource non-core.",
  ],
  [
    "src/lib/data/public.js",
    /count: Number\(item\.count \|\| 0\)/,
    "Kategori publik harus membawa jumlah dataset dari CKAN group facets.",
  ],
  [
    "src/app/(public)/page.jsx",
    /(?=[\s\S]*normalizePublicCategoryFacets)(?=[\s\S]*category\.count)(?=[\s\S]*kategori=\$\{encodeURIComponent\(category\.id\)\})[\s\S]*/,
    "Kartu kategori homepage harus memakai kategori, slug, dan count CKAN; bukan daftar topik hardcoded.",
  ],
  [
    "tests/e2e/public-portal.spec.js",
    /CKAN-driven category cards[\s\S]*organization directory searches[\s\S]*filter penerbit|Memiliki dataset/,
    "E2E harus memverifikasi count kategori CKAN serta pencarian/filter perangkat daerah.",
  ],
  [
    "src/components/organization-directory.jsx",
    /filterAndSortPublicOrganizations[\s\S]*organization-search[\s\S]*organization-sort[\s\S]*datasetState[\s\S]*organizationDatasetCount/,
    "Direktori perangkat daerah harus memiliki pencarian kata kunci, filter penerbit dataset, pengurutan, dan count CKAN.",
  ],
  [
    "src/lib/public-organizations.js",
    /package_count[\s\S]*withDatasets[\s\S]*withoutDatasets[\s\S]*terms\.every/,
    "Logika direktori harus menghitung data CKAN dan mendukung pencarian multi-kata berbasis seluruh istilah yang dimasukkan.",
  ],
  [
    "src/components/page-heading.jsx",
    /compact[\s\S]*space-y-1\.5/,
    "PageHeading harus mendukung jarak judul dan subheading yang lebih rapat pada halaman Informasi.",
  ],
  [
    "src/app/styles/public-layout-stability.css",
    /informasi-directory-page \.public-page-heading[\s\S]*gap: 0\.45rem[\s\S]*padding-block-end/,
    "Halaman Informasi harus memakai jarak editorial yang rapat antara judul dan deskripsi.",
  ],
  [
    "src/lib/data/public.js",
    /extras_portal_reference_period[\s\S]*buildPublicCatalogQuery/,
    "Filter periode dan pencarian fleksibel harus menggunakan indeks/metadata CKAN.",
  ],
  [
    "src/app/(public)/statistik/[slug]/page.jsx",
    /publicResourceUrl\(indicator\.resource\?\.url\)/,
    "Unduhan indikator harus memakai URL resource publik dan tidak membocorkan hostname admin.",
  ],
  [
    "deploy/ckan/theme/ckanext/wajo_theme/schemas/dataset.yaml",
    /field_name: portal_data_start[\s\S]*preset: date[\s\S]*field_name: portal_publication_date[\s\S]*preset: date[\s\S]*field_name: portal_definition/,
    "Schema CKAN harus memuat definisi indikator dan validasi tanggal metadata.",
  ],
  [
    "deploy/ckan/extensions/requirements.txt",
    /ckanext-scheming==3\.1\.0[\s\S]*ckanext-dcat==2\.4\.4[\s\S]*ckanext-xloader==2\.6\.0[\s\S]*chardet==7\.6\.0[\s\S]*ckanext-geoview==0\.3\.2[\s\S]*ckanext-harvest==1\.6\.3/,
    "Extension CKAN harus dipatok; Pages dibangun melalui installer package-data upstream.",
  ],
  [
    "deploy/ckan/install-pages.py",
    /28eba99ad85d3b9037f5aaddad1f083300c69041[\s\S]*config_declaration\.yaml[\s\S]*migration\/pages\/alembic\.ini[\s\S]*migration\/pages\/script\.py\.mako/,
    "Builder Pages harus mematok commit dan menyertakan file konfigurasi serta migrasi Alembic.",
  ],
  [
    "src/proxy.js",
    /api\/3\/action[\s\S]*GET[\s\S]*api\/v1/,
    "API harus same-origin read-only dan menolak kontrak API legacy.",
  ],
  [
    "deploy/ckan/docker-compose.cloudflare-access.yml",
    /Caddyfile\.tunnel\.access[\s\S]*cloudflared[\s\S]*TUNNEL_TOKEN/,
    "Profil Cloudflare Access harus memakai Caddyfile tanpa Basic Auth dan tetap menjalankan Tunnel.",
  ],
  [
    "deploy/ckan/Caddyfile.tunnel.access",
    /Cloudflare Access[\s\S]*reverse_proxy https:\/\/nginx:443/,
    "Profil Access harus melewati Cloudflare Access dan tetap meneruskan admin ke CKAN native.",
  ],
  [
    "src/app/api/3/action/[...action]/route.js",
    /safeHarvestFilter[\s\S]*safeSearchSort[\s\S]*sort[\s\S]*fq/,
    "Facade publik harus mendukung parameter harvesting CKAN secara terbatas.",
  ],
  [
    "src/app/api/3/action/[...action]/route.js",
    /(?=[\s\S]*VISIBILITY_SENSITIVE_ACTIONS)(?=[\s\S]*revalidate: 0)(?=[\s\S]*include_datasets: false)(?=[\s\S]*sanitizePublicSearchResult)(?=[\s\S]*sanitizePublicActivity)[\s\S]*/,
    "Detail/resource/DataStore harus no-store, detail organisasi tidak memuat dataset tertanam, dan respons publik disanitasi.",
  ],
  [
    "src/lib/ckan/public-api-sanitize.js",
    /!isPrivateMarker\(resource\.private\)[\s\S]*resource\.state === "active"[\s\S]*delete safeEntry\.user[\s\S]*delete safeEntry\.user_id[\s\S]*delete safeEntry\.data/,
    "Sanitasi API publik harus membuang resource private/nonaktif, identitas aktor, dan snapshot aktivitas.",
  ],
  [
    "src/lib/ckan/privacy.js",
    /export function isPrivateMarker[\s\S]*"true"[\s\S]*"private"/,
    "Penanda privasi legacy harus dinormalisasi konsisten tanpa menganggap string false sebagai true.",
  ],
  [
    "src/lib/ckan/client.js",
    /sanitizePublicSearchResult[\s\S]*sessionCookie[\s\S]*ckanAction\(\s*"package_search",\s*params,\s*sessionCookie \? \{\s*revalidate: 0,\s*sessionCookie\s*\} : \{\s*\}\s*,?\s*\)/,
    "Search CKAN harus memakai sesi browser untuk meminta dataset privat; CKAN sendiri yang mengotorisasi dataset.",
  ],
  [
    "src/lib/data/public.js",
    /searchRows\.map\(\(pkg\) => sanitizePublicPackage\(pkg\)\)/,
    "Listing dataset harus selalu menyaring marker resource.private yang belum memiliki ACL CKAN.",
  ],
  [
    "src/app/(public)/organisasi/[slug]/page.jsx",
    /CKAN_SESSION_COOKIE_NAME[\s\S]*getPublishedDatasetsResult\([\s\S]*sessionCookie[\s\S]*\)/,
    "Daftar dataset pada profil organisasi harus mengikuti sesi CKAN dan izin privat pengguna.",
  ],
  [
    "src/app/api/3/action/[...action]/route.js",
    /include_data=true tidak tersedia pada API publik/,
    "API activity publik harus menolak snapshot yang berpotensi membawa metadata internal.",
  ],
  [
    "deploy/ckan/Caddyfile",
    /@ckanPublic[\s\S]*reverse_proxy nextjs:3000[\s\S]*@adminRobots path \/robots\.txt[\s\S]*reverse_proxy https:\/\/nginx:443/,
    "Caddy harus memisahkan hostname publik Next.js dan meneruskan semua route admin ke CKAN.",
  ],
  [
    "deploy/ckan/Caddyfile.tunnel",
    /@ckanPublic[\s\S]*reverse_proxy nextjs:3000[\s\S]*@adminRobots path \/robots\.txt[\s\S]*reverse_proxy https:\/\/nginx:443/,
    "Tunnel harus memisahkan hostname publik Next.js dan meneruskan semua route admin ke CKAN.",
  ],
  [
    "deploy/ckan/Caddyfile.tunnel.access",
    /Cloudflare Access[\s\S]*@adminRobots path \/robots\.txt[\s\S]*reverse_proxy https:\/\/nginx:443/,
    "Profil Access harus melewati Cloudflare Access dan meneruskan seluruh route admin ke CKAN.",
  ],
  [
    "deploy/ckan/Caddyfile.basic-auth",
    /@adminRobots path \/robots\.txt[\s\S]*basic_auth[\s\S]*reverse_proxy https:\/\/nginx:443/,
    "Basic Auth Caddy harus tersedia sebagai opsi eksplisit untuk seluruh route admin.",
  ],
  [
    "deploy/ckan/Caddyfile.tunnel.basic-auth",
    /@adminRobots path \/robots\.txt[\s\S]*basic_auth[\s\S]*reverse_proxy https:\/\/nginx:443/,
    "Basic Auth Caddy harus tersedia sebagai opsi eksplisit di profil Tunnel.",
  ],
  [
    "src/app/(public)/page.jsx",
    /HomeIndicatorHighlights[\s\S]*HomeEditorialHighlights[\s\S]*getPublishedIndicatorsResult[\s\S]*getPublishedInfographicsResult[\s\S]*getPublishedPublicationsResult[\s\S]*home-data-art/,
    "Beranda harus menyorot data CKAN dan tidak boleh memakai ilustrasi grafik dengan nilai buatan.",
  ],
  [
    "src/lib/data/public-publications.js",
    /getPublicationReleaseDate[\s\S]*portal_publication_date[\s\S]*publicationDate: getPublicationReleaseDate/,
    "Tanggal rilis publikasi harus hanya berasal dari tanggal rilis yang secara eksplisit dicatat.",
  ],
  [
    "deploy/ckan/bootstrap-upstream.sh",
    /CKAN_VERSION[\s\S]*2\.12\.1[\s\S]*scheming_datasets[\s\S]*structured_data[\s\S]*geojson_view[\s\S]*harvest[\s\S]*ckan_harvester[\s\S]*datastore[\s\S]*xloader[\s\S]*CKANEXT__XLOADER__JOBS_DB__URI[\s\S]*CKANEXT__XLOADER__SITE_URL/,
    "Bootstrap harus mematok CKAN 2.12.1, mengaktifkan XLoader dan menjaga konfigurasi jobs.",
  ],
  [
    "deploy/ckan/bootstrap-upstream.sh",
    /CKANEXT__GEOVIEW__GEOJSON__MAX_FILE_SIZE[\s\S]*25 \* 1024 \* 1024/,
    "CKAN GeoJSON viewer must have an explicit safe file-size limit.",
  ],
  [
    "deploy/ckan/docker-compose.override.yml",
    /xloader-worker[\s\S]*jobs[\s\S]*CKANEXT__XLOADER__API_TOKEN[\s\S]*CKANEXT__XLOADER__JOBS_DB__URI/,
    "Compose harus menjalankan worker XLoader dan memberi kredensial hanya ke CKAN serta worker.",
  ],
  [
    "deploy/ckan/enable-xloader.sh",
    /user token add[\s\S]*CKANEXT__XLOADER__API_TOKEN[\s\S]*force-recreate ckan xloader-worker/,
    "Provisioning token XLoader harus disimpan ke env privat lalu me-recreate CKAN dan worker.",
  ],
  [
    "deploy/ckan/bootstrap-upstream.sh",
    /CKAN_ADMIN_BASIC_AUTH_HASH[\s\S]*CKAN_VERSION[\s\S]*2\.12\.1[\s\S]*scheming_datasets[\s\S]*structured_data[\s\S]*geojson_view[\s\S]*harvest[\s\S]*ckan_harvester[\s\S]*datastore[\s\S]*xloader/,
    "Bootstrap harus mematok CKAN 2.12.1 dan menyediakan gerbang Basic Auth sebagai opsi serta mengaktifkan GeoView, Harvest, DCAT, DataStore, dan XLoader.",
  ],
  [
    "deploy/ckan/bootstrap-upstream.sh",
    /re\.match\(r"\^  datapusher:/,
    "Service DataPusher legacy tidak boleh ada pada konfigurasi bootstrap.",
  ],
  [
    "deploy/ckan/bootstrap-upstream.sh",
    /(?=[\s\S]*Merged)(?=[\s\S]*render-upstream-env\.py)(?=[\s\S]*env_file_count)(?=[\s\S]*\.env\.generated)/,
    "Bootstrap harus menggabungkan default upstream ke satu .env.ckan dan memakai env output terfilter.",
  ],
  [
    "deploy/ckan/bootstrap-upstream.sh",
    /wajo_theme[\s\S]*CKAN__BASE_PUBLIC_FOLDER[\s\S]*public-midnight-blue[\s\S]*CKAN__BASE_TEMPLATES_FOLDER[\s\S]*templates-midnight-blue[\s\S]*CKAN__SITE_LOGO/,
    "CKAN harus memakai Midnight Blue sebagai dasar serta mengaktifkan theme admin dan logo Wajo.",
  ],
  [
    "src/app/(public)/api-data/page.jsx",
    /API membantu aplikasi mengambil data secara otomatis[\s\S]*Coba pencarian contoh[\s\S]*Coba di browser[\s\S]*DataStore/,
    "Halaman API publik harus menyediakan pengantar manusiawi, contoh langsung, dan penjelasan istilah.",
  ],
  [
    "deploy/ckan/theme/setup.py",
    /ckanext-wajo-theme[\s\S]*wajo_theme = ckanext\.wajo_theme\.plugin:WajoThemePlugin/,
    "Theme CKAN khusus Wajo harus terdaftar sebagai plugin dan terpasang di image.",
  ],
  [
    "deploy/ckan/theme/ckanext/wajo_theme/templates/base.html",
    /ckan_extends[\s\S]*block\s+styles[\s\S]*super\(\)[\s\S]*asset\s+['\"]wajo_theme\/wajo_theme['\"]/,
    "Theme CSS harus ditambahkan melalui WebAssets di block styles dan mewarisi template CKAN.",
  ],
  [
    "deploy/ckan/theme/ckanext/wajo_theme/templates/header.html",
    /admin-brand[\s\S]*logo-kabupaten-wajo\.webp[\s\S]*wajo-admin-user[\s\S]*user\.logout/,
    "Header Wajo Admin harus memuat logo extension, profil pengelola, dan logout dengan CSRF.",
  ],
  [
    "deploy/ckan/theme/ckanext/wajo_theme/assets/css/wajo-theme.css",
    /--wajo-forest-950[\s\S]*wajo-admin-topbar[\s\S]*wajo-admin-sidebar[\s\S]*login-main:has\(#field-login\)[\s\S]*prefers-reduced-motion/,
    "Theme harus menata application shell, sidebar, dashboard, login, dan menghormati reduced-motion.",
  ],
  [
    "deploy/ckan/configure-upstream-extensions.py",
    /theme_source[\s\S]*shutil\.copytree[\s\S]*portal-ckan-theme[\s\S]*pip install/,
    "Bootstrap CKAN harus menyalin dan memasang custom theme ke image upstream.",
  ],
  [
    "deploy/ckan/compose.sh",
    /prepare-ckan-base\.sh[\s\S]*COMPOSE_FILE_PROFILE/,
    "Compose harus memastikan base image CKAN 2.12.1 tersedia sebelum menjalankan service.",
  ],
  [
    "deploy/ckan/compose.sh",
    /(?=[\s\S]*ENV_FILE="\$ROOT\/\.env\.ckan")(?=[\s\S]*--env-file "\$ENV_FILE")(?=[\s\S]*--profile)(?=[\s\S]*COMPOSE_FILE_PROFILE)(?=[\s\S]*cloudflare-access)/,
    "Wrapper Compose harus memilih profil keamanan dan memakai satu .env.ckan.",
  ],
  [
    "deploy/ckan/compose.sh",
    /sync-env\.py[\s\S]*render-upstream-env\.py/,
    "Setiap perintah Compose harus menyinkronkan URL dari hostname dan merender env CKAN terfilter.",
  ],
  [
    "deploy/ckan/compose.sh",
    /grep -qE.*datapusher/,
    "Compose wrapper harus menolak bila service DataPusher legacy masih tersisa.",
  ],
  [
    "deploy/ckan/apply-datastore-permissions.sh",
    /ckan datastore set-permissions[\s\S]*ON_ERROR_STOP=1/,
    "Deployment harus menyediakan langkah aman menerapkan permission DataStore CKAN 2.12.",
  ],
  [
    ".github/workflows/ci.yml",
    /npm ci[\s\S]*npm run check[\s\S]*npm run test[\s\S]*npm run build/,
    "CI wajib harus memvalidasi instalasi, static+lint, unit test, dan production build dalam satu runner.",
  ],
  [
    ".github/workflows/extended-validation.yml",
    /workflow_dispatch[\s\S]*npm run test:e2e[\s\S]*docker build -f Dockerfile\.ckan-extension-smoke[\s\S]*npm run security:check/,
    "E2E browser, smoke-test image CKAN, dan audit dependency harus tetap tersedia lewat workflow manual.",
  ],
];
const cmsChecks = [
  [
    "src/lib/cms/pages.js",
    /import \"server-only\"[\s\S]*ckanext_pages_list[\s\S]*ckanext_pages_show[\s\S]*revalidate: 0/,
    "CMS harus dipanggil server-side lewat action CKAN Pages dan membaca tanpa cache agar perubahan visibility segera berlaku.",
  ],
  [
    "src/lib/cms/pages.js",
    /getPublicCmsFooterPagesResult[\s\S]*getPublicCmsPagesResult\(\)[\s\S]*buildCmsFooterLinks\(result\.data, 5\)/,
    "Footer CMS must derive its five links from the exact public page collection used by the information directory, including pages with show_in_menu=false.",
  ],
  [
    "src/lib/cms/pages.js",
    /parseCmsBoolean[\s\S]*isCmsRecordPublished[\s\S]*publish_date[\s\S]*template_type[\s\S]*show_in_menu[\s\S]*content_blocks/,
    "Adapter CMS harus menormalisasi status privasi, jadwal publikasi, field editorial, dan block JSON.",
  ],
  [
    "deploy/ckan/bootstrap-upstream.sh",
    /CKANEXT__PAGES__ALLOW_HTML.*false/,
    "CKAN Pages harus menonaktifkan HTML mentah dan membiarkan opsi editor tidak disetel agar template upstream memilih cabang Markdown.",
  ],
  [
    "src/lib/cms/pages.js",
    /normalizeCmsSlug[\s\S]*publicCmsImageUrl[\s\S]*https:/,
    "Slug dan URL gambar CMS harus dibatasi sebelum masuk ke renderer publik.",
  ],
  [
    "src/lib/markdown/markdown-images.js",
    /findFirstMarkdownImage[\s\S]*parseMarkdown/,
    "CMS article images must be extracted from Markdown image tokens.",
  ],
  [
    "src/app/(public)/informasi/[slug]/page.jsx",
    /getCmsFeatureImage[\s\S]*images:\s*absoluteImage\s*\?\s*\[\{\s*url:\s*absoluteImage[\s\S]*:\s*\[\]/,
    "CMS pages must derive Open Graph/Twitter imagery from actual content and must not inherit a generic default hero image when no cover exists.",
  ],
  [
    "src/components/cms/content-card.jsx",
    /getCmsFeatureImage[\s\S]*const FallbackIcon = isArticle \? Newspaper : FileText[\s\S]*imageUrl \? [\s\S]*: isArticle \? [\s\S]*: null/,
    "CMS cards must share the content-image parser; only news articles may use a visual fallback, while ordinary pages remain image-free when no cover exists.",
  ],
  [
    "src/lib/cms/pages.js",
    /findFirstCmsBlockImage[\s\S]*type === "image"[\s\S]*type === "hero"[\s\S]*type === "gallery"[\s\S]*getCmsFeatureImage[\s\S]*return null/,
    "CMS page covers must be optional and discover images from Markdown and structured image/hero/gallery blocks without inserting a default image.",
  ],
  [
    "src/components/site-footer.jsx",
    /(?=[\s\S]*getPublicCmsFooterPagesResult)(?=[\s\S]*item\.title)(?=[\s\S]*href=\"\/berita\")[\s\S]*/,
    "Public footer must show the direct CMS page titles from the dedicated capped footer source and link to the full news list.",
  ],
  [
    "src/app/api/3/action/[...action]/route.js",
    /const ACTIONS = new Set\([\s\S]*package_search[\s\S]*datastore_search/,
    "Facade API umum harus tetap memakai allowlist action CKAN yang eksplisit.",
  ],
  [
    "src/app/api/cms/media/[filename]/route.js",
    /recordReferencesImage[\s\S]*MAX_IMAGE_BYTES[\s\S]*matchesImageSignature[\s\S]*no-store/,
    "Proxy media CMS harus memeriksa referensi konten publik, ukuran, signature gambar, dan no-store.",
  ],
  [
    "src/components/cms/markdown-content.jsx",
    /publicCmsImageUrl[\s\S]*publicResourceUrl[\s\S]*normalizeMarkdownHref[\s\S]*export function MarkdownContent/,
    "Renderer Markdown harus memproxy aset CKAN publik, menyaring host admin, dan tidak mengeksekusi HTML mentah.",
  ],
  [
    "src/app/api/public/ckan-file/[fileId]/route.js",
    /buildCkanSessionCookieHeader[\s\S]*function isVisiblePackageToViewer[\s\S]*!isPrivateMarker\(record\.private\)[\s\S]*async function verifyFileOwner[\s\S]*resource_show[\s\S]*package_show[\s\S]*file_show[\s\S]*permission_download_file[\s\S]*redirect:\s*"manual"[\s\S]*private, no-store/,
    "File API harus memeriksa izin resource/dataset melalui CKAN, meneruskan sesi browser, dan melarang cache bersama untuk file privat.",
  ],
  [
    "src/components/cms/content-blocks.jsx",
    /getPublishedDatasetBySlugResult[\s\S]*type === \"dataset_links\"/,
    "Renderer CMS harus menyediakan tautan dataset yang diverifikasi sebagai data publik.",
  ],
  [
    "src/app/(public)/informasi/page.jsx",
    /getPublicCmsNavigationResult[\s\S]*Navigasi informasi[\s\S]*featuredPages/,
    "Hub informasi harus memakai label dan urutan navigasi yang dikelola melalui CKAN Pages.",
  ],
  [
    "src/app/(public)/berita/[slug]/page.jsx",
    /NewsArticle[\s\S]*datePublished/,
    "Detail berita harus menyediakan JSON-LD NewsArticle dan tanggal terbit.",
  ],
  [
    "src/app/(public)/berita/[slug]/page.jsx",
    /getCmsMarkdownImage[\s\S]*CmsPageBody[\s\S]*openGraph:[\s\S]*images:/,
    "Detail berita hanya boleh menampilkan gambar asli Markdown di body; tidak ada featured-image terpisah.",
  ],
  [
    "src/app/sitemap.js",
    /getPublicCmsPagesResult[\s\S]*getPublicCmsBlogPostsResult[\s\S]*cmsPageEntries[\s\S]*cmsBlogEntries/,
    "Sitemap harus memuat hanya halaman/berita CMS publik.",
  ],
  [
    "src/app/robots.js",
    /\"\/informasi\"[\s\S]*\"\/berita\"/,
    "Robots harus mengizinkan crawler mengindeks halaman CMS publik.",
  ],
  [
    "deploy/ckan/theme/ckanext/wajo_theme/plugin.py",
    /IPagesSchema[\s\S]*class WajoPagesSchemaPlugin[\s\S]*content_blocks[\s\S]*show_in_menu/,
    "CKAN Admin harus menyediakan schema field editorial melalui IPagesSchema.",
  ],
  [
    "deploy/ckan/theme/ckanext/wajo_theme/plugin.py",
    /ITemplateHelpers[\s\S]*wajo_render_markdown/,
    "CKAN Admin harus menyediakan helper Markdown yang aman melalui ITemplateHelpers.",
  ],
  [
    "deploy/ckan/theme/ckanext/wajo_theme/templates/ckanext_pages/blog.html",
    /h\.wajo_render_markdown[\s\S]*block secondary_content %}\s*{% endblock %}/,
    "Detail Blog CKAN harus merender Markdown dan menghilangkan sidebar artikel yang tidak terkait.",
  ],
  [
    "src/lib/ckan/client.js",
    /action !== "package_search" && hasStructuredParams[\s\S]*requestInit\.method = "GET"[\s\S]*searchParams\.append/,
    "package_search harus menggunakan GET dengan query-array berulang agar sesi CKAN tidak ditolak CSRF.",
  ],
  [
    "deploy/ckan/theme/ckanext/wajo_theme/templates/ckanext_pages/base_form.html",
    /extra_pages_form[\s\S]*seo_title[\s\S]*content_blocks/,
    "Form Pages admin harus memuat field SEO dan JSON content blocks.",
  ],
  [
    "deploy/ckan/bootstrap-upstream.sh",
    /scheming_datasets[\s\S]*scheming_organizations[\s\S]*scheming_groups[\s\S]*wajo_pages[\s\S]*pages[\s\S]*plugins.append\(\"wajo_theme\"\)/,
    "Bootstrap harus memuat schema Dataset/Organisasi/Kategori sebelum Pages dan template Wajo setelah Pages.",
  ],
  [
    "scripts/e2e-mock-ckan.mjs",
    /ckanext_pages_list[\s\S]*ckanext_pages_show/,
    "E2E mock harus memodelkan kedua Action API CKAN Pages.",
  ],
  [
    "scripts/e2e-mock-ckan.mjs",
    /artikel-terjadwal[\s\S]*halaman-internal/,
    "E2E mock harus memuat fixture artikel terjadwal dan halaman privat.",
  ],
  [
    "tests/e2e/public-portal.spec.js",
    /CKAN Pages feeds the public information hub[\s\S]*CKAN Pages blog posts[\s\S]*private and not-yet-published/,
    "E2E harus menguji CMS pages, blog, structured blocks, media, dan penolakan konten privat/terjadwal.",
  ],
];
for (const [file, pattern, message] of cmsChecks) {
  try {
    const source = await readFile(path.join(root, file), "utf8");
    if (!pattern.test(source)) errors.push(message);
  } catch {
    errors.push(`Tidak dapat membaca file pemeriksaan CMS: ${file}`);
  }
}
const publicActionProxy = await readFile(
  path.join(root, "src/app/api/3/action/[...action]/route.js"),
  "utf8",
);
if (/ckanext_pages_(?:list|show)/.test(publicActionProxy)) {
  errors.push(
    "Action CKAN Pages hanya boleh dipanggil server-side, tidak boleh masuk allowlist facade browser publik.",
  );
}

const nestedShellInvocations = [
  [
    "deploy/ckan/bootstrap-upstream.sh",
    /bash "\$ROOT\/deploy\/ckan\/sync-ckan-base-source\.sh"/,
    "Bootstrap harus memanggil sync-ckan-base-source.sh melalui Bash agar tidak bergantung pada executable bit.",
  ],
  [
    "deploy/ckan/prepare-ckan-base.sh",
    /bash "\$ROOT\/deploy\/ckan\/sync-ckan-base-source\.sh"/,
    "Prepare CKAN base harus memanggil sync-ckan-base-source.sh melalui Bash.",
  ],
  [
    "deploy/ckan/compose.sh",
    /bash "\$ROOT\/deploy\/ckan\/prepare-ckan-base\.sh"/,
    "Compose harus memanggil prepare-ckan-base.sh melalui Bash.",
  ],
  [
    "deploy/ckan/enable-xloader.sh",
    /bash "\$ROOT\/deploy\/ckan\/compose\.sh"/,
    "XLoader harus memanggil compose.sh melalui Bash.",
  ],
];
for (const [file, pattern, message] of nestedShellInvocations) {
  try {
    const source = await readFile(path.join(root, file), "utf8");
    if (!pattern.test(source)) errors.push(message);
  } catch {
    errors.push(
      `Tidak dapat membaca shell script untuk pemeriksaan permission: ${file}`,
    );
  }
}

for (const [file, pattern, message] of checks) {
  try {
    const source = await readFile(path.join(root, file), "utf8");
    if (!pattern.test(source)) errors.push(message);
  } catch {
    errors.push(`Tidak dapat membaca file untuk pemeriksaan: ${file}`);
  }
}
for (const file of [
  "deploy/ckan/Caddyfile",
  "deploy/ckan/Caddyfile.tunnel",
  "deploy/ckan/Caddyfile.tunnel.access",
  "deploy/ckan/Caddyfile.basic-auth",
  "deploy/ckan/Caddyfile.tunnel.basic-auth",
]) {
  try {
    const source = await readFile(path.join(root, file), "utf8");
    const adminBlock =
      source.match(/\n(?:http:\/\/)?\{\$CKAN_HOST\}\s*\{([\s\S]*)$/)?.[1] || "";
    if (
      !adminBlock.includes("@adminRobots path /robots.txt") ||
      !adminBlock.includes("@adminSitemap path") ||
      !adminBlock.includes("reverse_proxy https://nginx:443")
    ) {
      errors.push(
        `${file}: host admin harus memblokir sitemap dan meneruskan seluruh route ke CKAN.`,
      );
    }
    if (!adminBlock.includes("X-Forwarded-Host {http.request.host}")) {
      errors.push(
        `${file}: Caddy harus meneruskan Host asli untuk autentikasi berbasis CKAN_HOST.`,
      );
    }
    if (
      adminBlock.includes("@adminActions path") ||
      adminBlock.includes("redir https://{$PUBLIC_HOST}{uri} 302")
    ) {
      errors.push(
        `${file}: tidak boleh ada allowlist path atau redirect halaman admin ke portal publik.`,
      );
    }
    if (file.endsWith(".basic-auth") && !adminBlock.includes("basic_auth")) {
      errors.push(
        `${file}: profil Basic Auth eksplisit harus tetap mengaktifkan perimeter gate.`,
      );
    }
    if (!file.endsWith(".basic-auth") && adminBlock.includes("basic_auth")) {
      errors.push(
        `${file}: Basic Auth tidak boleh aktif pada konfigurasi default/Cloudflare Access.`,
      );
    }
  } catch {
    errors.push(`Tidak dapat membaca konfigurasi host admin: ${file}`);
  }
}

for (const file of [
  "deploy/ckan/Caddyfile",
  "deploy/ckan/Caddyfile.basic-auth",
  "deploy/ckan/Caddyfile.tunnel",
  "deploy/ckan/Caddyfile.tunnel.access",
  "deploy/ckan/Caddyfile.tunnel.basic-auth",
]) {
  try {
    const source = await readFile(path.join(root, file), "utf8");
    const adminBlock =
      source.match(/\n(?:http:\/\/)?\{\$CKAN_HOST\}\s*\{([\s\S]*)$/)?.[1] || "";
    if (
      !adminBlock.includes(
        'header >X-Robots-Tag "noindex, nofollow, noarchive, nosnippet, noimageindex"',
      )
    ) {
      errors.push(
        `${file}: semua respons hostname admin wajib mengembalikan header X-Robots-Tag noindex yang deferred.`,
      );
    }
    if (
      !/[@]adminRobots path \/robots\.txt[\s\S]*respond @adminRobots "User-agent: \*" 200/.test(
        adminBlock,
      )
    ) {
      errors.push(
        `${file}: robots.txt CKAN Admin harus tetap crawlable agar crawler dapat melihat instruksi noindex.`,
      );
    }
    if (
      !/[@]adminSitemap path \/sitemap\.xml \/sitemap_index\.xml \/sitemap-\*[\s\S]*respond @adminSitemap "Not Found" 404/.test(
        adminBlock,
      )
    ) {
      errors.push(
        `${file}: sitemap CKAN Admin harus tidak dipublikasikan (404).`,
      );
    }
    const robotsBody =
      adminBlock.match(/respond @adminRobots "([\s\S]*?)" 200/)?.[1] || "";
    if (/Disallow:\s*\//i.test(robotsBody)) {
      errors.push(
        `${file}: jangan blokir seluruh crawling di robots.txt CKAN Admin karena crawler harus membaca noindex.`,
      );
    }
  } catch {
    errors.push(`Tidak dapat membaca konfigurasi SEO CKAN Admin: ${file}`);
  }
}

if (errors.length) {
  console.error(`Pemeriksaan proyek gagal (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
process.stdout.write(
  "Pemeriksaan arsitektur CKAN/Next.js lulus: integrasi headless CMS CKAN Pages, keamanan konten/media, sitemap/robots, extension schema/form, API publik, indikator, dan deployment terverifikasi secara statis.\n",
);
