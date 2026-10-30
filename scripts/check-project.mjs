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
  "src/lib/data/public.js",
  "src/lib/data/organizations.js",
  "src/lib/data/public-indicators.js",
  "src/lib/data/public-infographics.js",
  "src/lib/data/public-publications.js",
  "src/lib/ckan/public-resource-url.js",
  "deploy/ckan/schemas/dataset.yaml",
  "deploy/ckan/configure-upstream-extensions.py",
  "deploy/ckan/theme/setup.py",
  "deploy/ckan/theme/ckanext/wajo_theme/plugin.py",
  "deploy/ckan/theme/ckanext/wajo_theme/templates/base.html",
  "deploy/ckan/theme/ckanext/wajo_theme/templates/header.html",
  "deploy/ckan/theme/ckanext/wajo_theme/assets/webassets.yml",
  "deploy/ckan/theme/ckanext/wajo_theme/assets/css/wajo-theme.css",
  "scripts/check-ckan-build-overlay.py",
  "scripts/check-ckan-base-source.py",
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
  "tests/unit/geojson-preview.test.js",
  "src/lib/geo/geojson-preview.js",
  "src/components/geojson-resource-preview.jsx",
  "public/logo-satu-data-indonesia.svg",
  "tests/e2e/public-portal.spec.js",
  "scripts/e2e-mock-ckan.mjs",
  "deploy/ckan/bootstrap-upstream.sh",
  "deploy/ckan/compose.sh",
  "deploy/ckan/render-upstream-env.py",
  "deploy/ckan/sync-env.py",
  "scripts/check-env-single-source.py",
  "scripts/check-ui-css.mjs",
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
    /data\.go\.id[\s\S]*logo-satu-data-indonesia\.svg[\s\S]*Satu Data Indonesia/,
    "Footer harus menampilkan penanda Satu Data Indonesia dan tautan portal resminya.",
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
    /ckanext-scheming==3\.1\.0[\s\S]*ckanext-pages==0\.5\.2[\s\S]*ckanext-dcat==2\.4\.4[\s\S]*ckanext-xloader==2\.5\.2[\s\S]*ckanext-geoview==0\.3\.2[\s\S]*ckanext-harvest==1\.6\.3/,
    "Extension CKAN metadata, interoperabilitas DCAT, GeoView, dan Harvest harus dipatok.",
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
    /API itu cara aplikasi mengambil data secara otomatis[\s\S]*Coba pencarian contoh[\s\S]*Coba di browser[\s\S]*DataStore/,
    "Halaman API publik harus menyediakan pengantar manusiawi, contoh langsung, dan penjelasan istilah.",
  ],
  [
    "deploy/ckan/theme/setup.py",
    /ckanext-wajo-theme[\s\S]*wajo_theme = ckanext\.wajo_theme\.plugin:WajoThemePlugin/,
    "Theme CKAN khusus Wajo harus terdaftar sebagai plugin dan terpasang di image.",
  ],
  [
    "deploy/ckan/theme/ckanext/wajo_theme/templates/base.html",
    /ckan_extends[\s\S]*asset 'wajo_theme\/wajo_theme'/,
    "Theme CSS harus ditambahkan melalui WebAssets dan mewarisi template CKAN.",
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
  "Pemeriksaan arsitektur CKAN/Next.js lulus: aset legacy dibersihkan dan indikator/infografik bersumber dari CKAN.\n",
);
