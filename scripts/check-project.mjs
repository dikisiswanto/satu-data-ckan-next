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
  "src/components/cms/markdown-content.jsx",
  "src/components/cms/content-blocks.jsx",
  "src/components/cms/content-card.jsx",
  "src/app/(public)/informasi/page.jsx",
  "src/app/(public)/informasi/[slug]/page.jsx",
  "src/app/(public)/berita/page.jsx",
  "src/app/(public)/berita/[slug]/page.jsx",
  "src/app/api/cms/media/[filename]/route.js",
  "src/lib/data/public.js",
  "src/lib/data/organizations.js",
  "src/lib/public-categories.js",
  "src/lib/public-organizations.js",
  "src/lib/data/public-indicators.js",
  "src/lib/data/public-infographics.js",
  "src/lib/data/public-publications.js",
  "src/lib/ckan/public-resource-url.js",
  "deploy/ckan/schemas/dataset.yaml",
  "deploy/ckan/configure-upstream-extensions.py",
  "deploy/ckan/install-pages.py",
  "deploy/ckan/theme/setup.py",
  "deploy/ckan/theme/ckanext/wajo_theme/plugin.py",
  "deploy/ckan/theme/ckanext/wajo_theme/templates/base.html",
  "deploy/ckan/theme/ckanext/wajo_theme/templates/header.html",
  "deploy/ckan/theme/ckanext/wajo_theme/assets/webassets.yml",
  "deploy/ckan/theme/ckanext/wajo_theme/assets/css/wajo-theme.css",
  "scripts/check-build.py",
  "scripts/check-base.py",
  "deploy/ckan/sync-ckan-base-source.sh",
  "deploy/ckan/prepare-ckan-base.sh",
  "src/app/api/3/action/[...action]/route.js",
  "src/app/(public)/api-data/page.jsx",
  "docs/API.md",
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
  "tests/e2e/public-portal.spec.js",
  "docs/CMS.md",
  "src/lib/geo/geojson-preview.js",
  "src/components/geojson-resource-preview.jsx",
  "public/logo-satu-data-indonesia.svg",
  "tests/e2e/public-portal.spec.js",
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
    /const temporalCoverage[\s\S]*datasetJsonLd[\s\S]*temporalCoverage[\s\S]*GeoJSONResourcePreview/,
    "Detail dataset harus menghitung temporalCoverage terlebih dahulu dan memberi pratinjau geospasial untuk resource GeoJSON.",
  ],
  [
    "src/components/site-footer.jsx",
    /data\.go\.id[\s\S]*logo-satu-data-indonesia\.svg[\s\S]*alt="Logo Satu Data Indonesia"[\s\S]*width=\{160\}/,
    "Footer harus menampilkan logo SDI kecil dan menautkan ke portal resminya.",
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
    "src/lib/data/public.js",
    /indicatorTag[\s\S]*indicators\.count/,
    "Ringkasan homepage harus menghitung indikator dari CKAN, tidak menyembunyikan fitur.",
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
    "deploy/ckan/schemas/dataset.yaml",
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
    /resource\.private !== true[\s\S]*resource\.state === "active"[\s\S]*delete safeEntry\.user[\s\S]*delete safeEntry\.user_id[\s\S]*delete safeEntry\.data/,
    "Sanitasi API publik harus membuang resource private/nonaktif, identitas aktor, dan snapshot aktivitas.",
  ],
  [
    "src/lib/ckan/client.js",
    /sanitizePublicSearchResult[\s\S]*return sanitizePublicSearchResult\(await ckanAction\("package_search", params\)\)/,
    "Semua listing dataset frontend harus memakai hasil pencarian CKAN yang telah menyaring resource privat/nonaktif.",
  ],
  [
    "src/app/api/3/action/[...action]/route.js",
    /include_data=true tidak tersedia pada API publik/,
    "API activity publik harus menolak snapshot yang berpotensi membawa metadata internal.",
  ],
  [
    "deploy/ckan/Caddyfile",
    /@ckanPublic[\s\S]*reverse_proxy nextjs:3000[\s\S]*@adminRoot path \/[\s\S]*redir @adminRoot \/user\/login\?came_from=%2Fdashboard%2Fdatasets 302[\s\S]*reverse_proxy https:\/\/nginx:443/,
    "Caddy publik harus tetap mengarahkan portal ke Next.js dan root CKAN Admin ke form login native.",
  ],
  [
    "deploy/ckan/Caddyfile.tunnel",
    /@ckanPublic[\s\S]*reverse_proxy nextjs:3000[\s\S]*@adminRoot path \/[\s\S]*redir @adminRoot \/user\/login\?came_from=%2Fdashboard%2Fdatasets 302[\s\S]*reverse_proxy https:\/\/nginx:443/,
    "Tunnel harus mengarahkan root CKAN Admin ke form login native tanpa gerbang Caddy default.",
  ],
  [
    "deploy/ckan/Caddyfile.tunnel.access",
    /@adminRoot path \/[\s\S]*redir @adminRoot \/user\/login\?came_from=%2Fdashboard%2Fdatasets 302[\s\S]*reverse_proxy https:\/\/nginx:443/,
    "Profil Access harus merutekan root ke form login CKAN.",
  ],
  [
    "deploy/ckan/Caddyfile.basic-auth",
    /@adminRoot path \/[\s\S]*redir @adminRoot \/user\/login[\s\S]*basic_auth[\s\S]*reverse_proxy https:\/\/nginx:443/,
    "Basic Auth Caddy harus tersedia sebagai opsi eksplisit, bukan default.",
  ],
  [
    "deploy/ckan/Caddyfile.tunnel.basic-auth",
    /@adminRoot path \/[\s\S]*redir @adminRoot \/user\/login[\s\S]*basic_auth[\s\S]*reverse_proxy https:\/\/nginx:443/,
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
    /wajo-admin-brand[\s\S]*g\.site_logo[\s\S]*g\.site_title/,
    "Header login/admin CKAN harus memuat identitas dan logo Portal Satu Data Wajo.",
  ],
  [
    "deploy/ckan/theme/ckanext/wajo_theme/assets/css/wajo-theme.css",
    /--wajo-green-950[\s\S]*account-masthead[\s\S]*main:has\(#field-login\)[\s\S]*prefers-reduced-motion/,
    "Theme harus menata warna, login, header, dan menghormati reduced-motion.",
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
    /npm ci[\s\S]*npm run test[\s\S]*npm run test:e2e[\s\S]*npm run build/,
    "CI harus memvalidasi instalasi, unit test, E2E, dan production build.",
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
    /parseCmsBoolean[\s\S]*isCmsRecordPublished[\s\S]*publish_date[\s\S]*template_type[\s\S]*show_in_menu[\s\S]*content_blocks/,
    "Adapter CMS harus menormalisasi status privasi, jadwal publikasi, field editorial, dan block JSON.",
  ],
  [
    "deploy/ckan/bootstrap-upstream.sh",
    /CKANEXT__PAGES__ALLOW_HTML.*false[\s\S]*CKANEXT__PAGES__EDITOR.*markdown/,
    "CKAN Pages harus konsisten memakai Markdown dan tidak mengaktifkan HTML mentah untuk renderer publik.",
  ],
  [
    "src/lib/cms/pages.js",
    /normalizeCmsSlug[\s\S]*publicCmsImageUrl[\s\S]*https:/,
    "Slug dan URL gambar CMS harus dibatasi sebelum masuk ke renderer publik.",
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
    /publicCmsImageUrl[\s\S]*safeHref[\s\S]*export function MarkdownContent/,
    "Renderer Markdown harus memakai sanitasi URL dan tidak mengeksekusi HTML mentah.",
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
    "deploy/ckan/theme/ckanext/wajo_theme/templates/ckanext_pages/base_form.html",
    /extra_pages_form[\s\S]*seo_title[\s\S]*content_blocks/,
    "Form Pages admin harus memuat field SEO dan JSON content blocks.",
  ],
  [
    "deploy/ckan/bootstrap-upstream.sh",
    /scheming_datasets\", \"wajo_pages\", \"pages\"[\s\S]*plugins.append\(\"wajo_theme\"\)/,
    "Bootstrap harus memuat schema Wajo sebelum Pages dan template Wajo setelah Pages.",
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
]) {
  try {
    const source = await readFile(path.join(root, file), "utf8");
    const adminBlock = source.split("{$CKAN_HOST}")[1] || "";
    if (
      !adminBlock.includes("@adminRoot path /") ||
      !adminBlock.includes("/user/login?came_from=%2Fdashboard%2Fdatasets") ||
      !adminBlock.includes("reverse_proxy https://nginx:443")
    ) {
      errors.push(
        `${file}: host admin harus mengarahkan root ke login CKAN lalu meneruskan route lainnya.`,
      );
    }
    if (adminBlock.includes("basic_auth")) {
      errors.push(
        `${file}: Basic Auth tidak boleh aktif pada konfigurasi default tanpa-gate/Access.`,
      );
    }
    if (
      adminBlock.includes("@publicResourceDownload") ||
      adminBlock.includes("handle @publicResourceDownload")
    ) {
      errors.push(
        `${file}: host admin tidak boleh memiliki bypass untuk unduhan resource publik.`,
      );
    }
    if (
      !adminBlock.includes("@adminActions path") ||
      !adminBlock.includes("/dashboard/*") ||
      !adminBlock.includes("redir /dashboard/datasets 302")
    ) {
      errors.push(
        `${file}: host CKAN Admin harus membatasi HTML ke login/aksi admin dan mengalihkan route publik ke dashboard.`,
      );
    }
  } catch {
    errors.push(
      `Tidak dapat membaca file untuk pemeriksaan host admin: ${file}`,
    );
  }
}
for (const file of [
  "deploy/ckan/Caddyfile.basic-auth",
  "deploy/ckan/Caddyfile.tunnel.basic-auth",
]) {
  try {
    const source = await readFile(path.join(root, file), "utf8");
    if (
      !source.includes("/user/login?came_from=%2Fdashboard%2Fdatasets") ||
      !source.includes("basic_auth") ||
      !source.includes("reverse_proxy https://nginx:443")
    ) {
      errors.push(
        `${file}: konfigurasi gerbang Basic Auth opsional tidak lengkap.`,
      );
    }
  } catch {
    errors.push(`Tidak dapat membaca konfigurasi Basic Auth opsional: ${file}`);
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
    const adminBlock = source.split("{$CKAN_HOST}")[1] || "";
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
      !/[@]adminRobots path \/robots\.txt[\s\S]*respond @adminRobots "User-agent: \*[\s\S]*?Allow: \/" 200/.test(
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
