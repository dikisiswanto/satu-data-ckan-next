import { readFile, readdir } from "node:fs/promises";

const read = (path) => readFile(path, "utf8");
async function collectCodeFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) files.push(...(await collectCodeFiles(path)));
    else if (/\.(?:js|jsx|mjs|cjs)$/.test(entry.name)) files.push(path);
  }
  return files;
}
const [
  publicTokens,
  publicHero,
  publicComponents,
  helpPage,
  navigationLink,
  datasetPage,
  organizationDirectory,
  siteFooter,
  routeProgress,
  adminTokens,
  adminCss,
  adminAssets,
  loginPage,
  adminHeader,
  adminDashboard,
  eslintConfig,
  codeFiles,
] = await Promise.all([
  read("src/app/styles/foundation.css"),
  read("src/app/styles/public-home-hero.css"),
  read("src/app/styles/component-styles.css"),
  read("src/app/(public)/bantuan/page.jsx"),
  read("src/components/ui/navigation-link.jsx"),
  read("src/app/(public)/dataset/page.jsx"),
  read("src/components/organization-directory.jsx"),
  read("src/components/site-footer.jsx"),
  read("src/components/route-progress.jsx"),
  read(
    "deploy/ckan/theme/ckanext/portal_theme/assets/css/portal-admin-design-system.css",
  ),
  read("deploy/ckan/theme/ckanext/portal_theme/assets/css/portal-theme.css"),
  read("deploy/ckan/theme/ckanext/portal_theme/assets/webassets.yml"),
  read("deploy/ckan/theme/ckanext/portal_theme/templates/page.html"),
  read("deploy/ckan/theme/ckanext/portal_theme/templates/header.html"),
  read(
    "deploy/ckan/theme/ckanext/portal_theme/templates/portal_theme/dashboard.html",
  ),
  read("eslint.config.mjs"),
  Promise.all(
    [
      "src",
      "tests",
      "scripts",
      "deploy/ckan/theme/ckanext/portal_theme/public",
    ].map(collectCodeFiles),
  ).then((groups) => groups.flat()),
]);

const errors = [];
const require = (condition, message) => {
  if (!condition) errors.push(message);
};
const token = (source, name) => {
  const match = source.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`));
  return match?.[1]?.toLowerCase() ?? null;
};
const lastRule = (source, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = [
    ...source.matchAll(new RegExp(`${escaped}\\s*\\{([^{}]*)\\}`, "g")),
  ];
  return matches.at(-1)?.[1] ?? "";
};

const brandTokens = {
  "--app-brand-navy": "--portal-color-navy",
  "--app-brand-blue": "--portal-color-blue",
  "--app-brand-blue-hover": "--portal-color-blue-hover",
  "--app-brand-teal": "--portal-color-teal",
  "--app-brand-ochre": "--portal-color-ochre",
};
for (const [publicName, adminName] of Object.entries(brandTokens)) {
  const publicValue = token(publicTokens, publicName);
  const adminValue = token(adminTokens, adminName);
  require(Boolean(publicValue), `Token publik ${publicName} tidak ditemukan.`);
  require(Boolean(adminValue), `Token admin ${adminName} tidak ditemukan.`);
  require(publicValue ===
    adminValue, `Palet tidak sinkron: ${publicName} (${publicValue}) vs ${adminName} (${adminValue}).`);
}

require(publicHero.includes(
  "background-color: var(--app-brand-navy)",
), "Hero publik harus memakai token navy bersama.");
require(publicHero.includes(".home-hero-inner") &&
  publicHero.includes(
    "grid-template-columns",
  ), "Komposisi hero publik harus mempertahankan layout editorial dua kolom.");
require(publicComponents.includes("bg-[var(--app-brand-blue)]") &&
  publicComponents.includes(
    "text-[var(--app-brand-teal)]",
  ), "Tombol dan tautan komponen publik harus memakai token brand blue/teal.");
require(helpPage.includes("bg-primary") &&
  helpPage.includes("text-primary") &&
  !helpPage.includes(
    "#246de5",
  ), "Halaman bantuan harus memakai token aksi publik, bukan warna biru lepas dari palet.");
require(!/#[0-9a-fA-F]{3,8}\b/.test(
  helpPage,
), "Halaman bantuan harus menggunakan token tema publik, bukan warna hardcoded.");
require(navigationLink.includes(
  "text-muted hover:bg-accent hover:text-primary",
), "Navigasi publik harus memakai token warna yang sama dengan design system.");
require(publicTokens.includes("--app-brand-teal-soft: #edf6f2") &&
  publicTokens.includes("--app-brand-teal-border: #d2e2dd") &&
  publicTokens.includes(
    "--app-brand-teal-ink: #285c54",
  ), "Aksen teal harus memiliki token soft, border, dan ink yang konsisten.");
require(datasetPage.includes("bg-canvas") &&
  datasetPage.includes("bg-[var(--app-brand-teal-soft)]") &&
  datasetPage.includes(
    "text-[var(--app-brand-teal-ink)]",
  ), "Katalog dataset harus memakai token tema untuk canvas dan filter teal.");
require(organizationDirectory.includes("border-line bg-accent text-primary") &&
  organizationDirectory.includes(
    "hover:border-primary/35",
  ), "Kartu perangkat daerah harus memakai token tema publik.");
require(siteFooter.includes("hover:border-primary/35 hover:bg-canvas") &&
  routeProgress.includes(
    "bg-primary",
  ), "Footer dan progress navigasi harus memakai token brand publik.");
require(!/#[0-9a-fA-F]{6}/.test(
  publicComponents.match(/home-feature-button[\s\S]*?\n\}/)?.[0] ?? "",
), "Tombol fitur homepage tidak boleh memiliki warna hardcoded di luar token brand.");
require(adminAssets.indexOf("css/portal-theme.css") <
  adminAssets.indexOf(
    "css/portal-admin-design-system.css",
  ), "Design system admin harus dimuat setelah base theme agar token dan override final menang.");
require(loginPage.includes('class="portal-login-identity"') &&
  loginPage.includes(
    'class="portal-login-panel"',
  ), "Template login harus mempertahankan panel identitas dan panel autentikasi terpisah.");
require(adminHeader.includes('class="portal-admin-topbar"') &&
  adminHeader.includes(
    'class="portal-admin-brand"',
  ), "Header admin harus tetap memakai shell dan brand Portal Admin.");
require(adminDashboard.includes('class="portal-dashboard__welcome"') &&
  adminDashboard.includes('class="portal-dashboard__metrics"') &&
  adminDashboard.includes(
    'class="portal-dashboard-panel',
  ), "Dashboard admin harus memakai komponen welcome, metrik, dan panel yang terstandar.");
require(adminDashboard.includes("portal-metric-card--slate") &&
  !adminDashboard.includes("portal-metric-card--purple") &&
  !adminTokens.includes("portal-metric-card--purple") &&
  !adminCss.includes(
    "portal-metric-card--purple",
  ), "Aksen statistik admin harus memakai nama kelas semantik, bukan warna ungu yang tidak digunakan.");

const sharedThemeSection =
  adminTokens.split("Civic data atlas parity:")[1] ?? "";
const sharedThemeBase = sharedThemeSection.split("@media")[0];
const adminTopbar = lastRule(sharedThemeBase, ".portal-admin-topbar");
const adminWelcome = lastRule(sharedThemeBase, ".portal-dashboard__welcome");
const dashboardMetric = lastRule(sharedThemeBase, ".portal-metric-card");
const loginIdentity = lastRule(sharedThemeBase, ".portal-login-identity");
const loginIdentityMotif = lastRule(
  sharedThemeBase,
  ".portal-login-identity::after",
);
require(adminTopbar.includes(
  "background: var(--portal-color-navy) !important",
) &&
  adminTopbar.includes(
    "color: #fff !important",
  ), "Topbar admin harus memakai navy yang sama dengan hero publik.");
require(adminTokens.includes("background-image: var(--portal-atlas-pattern)") &&
  adminWelcome.includes(
    "background: var(--portal-color-navy)",
  ), "Welcome dashboard harus berbagi motif atlas dan warna identitas portal.");
require(dashboardMetric.includes("min-height: 108px") &&
  dashboardMetric.includes(
    "padding: 0.7rem 0.8rem",
  ), "Kartu metrik admin harus tetap padat dan konsisten.");
require(adminTokens.includes(
  "grid-template-columns: minmax(0, 1.05fr) minmax(390px, 0.95fr)",
), "Login desktop harus mempertahankan layout split panel.");
require(loginIdentity.includes(
  "background: var(--portal-color-navy) !important",
) &&
  loginIdentityMotif.includes(
    "background-image: var(--portal-atlas-pattern)",
  ), "Panel identitas login harus menggunakan navy dan motif atlas yang sama.");
require(adminTokens.includes("grid-template-columns: minmax(0, 1fr)") &&
  adminTokens.includes(
    "@media (max-width: 860px)",
  ), "Login harus berubah menjadi satu kolom pada layar kecil.");

require(eslintConfig.includes('"no-unused-vars"') &&
  eslintConfig.includes('args: "all"') &&
  eslintConfig.includes('argsIgnorePattern: "^_"') &&
  eslintConfig.includes('caughtErrors: "all"') &&
  eslintConfig.includes('caughtErrorsIgnorePattern: "^_"') &&
  eslintConfig.includes('destructuredArrayIgnorePattern: "^_"') &&
  eslintConfig.includes(
    'varsIgnorePattern: "^_"',
  ), "ESLint harus menandai variabel/argumen unused dan mengizinkan prefix underscore untuk yang sengaja tidak dipakai.");
const codeSources = await Promise.all(
  codeFiles
    .filter((path) => path !== "scripts/check-shared-theme.mjs")
    .map(read),
);
require(!codeSources.some((source) =>
  /eslint-disable[^\n]*no-unused-vars/.test(source),
), "Jangan menonaktifkan pemeriksaan no-unused-vars pada source, test, script, atau aset admin.");

if (errors.length) {
  process.stderr.write(`${errors.map((error) => `- ${error}`).join("\n")}\n`);
  process.exit(1);
}
process.stdout.write(
  "Shared theme contract passed: palet, hero, login, admin shell, dashboard density, mobile layout, dan aturan underscore ESLint selaras.\n",
);
