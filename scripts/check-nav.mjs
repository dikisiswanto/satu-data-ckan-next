import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const navPath = path.join(root, "src/lib/public-navigation.js");
const navSource = readFileSync(navPath, "utf8");
const header = readFileSync(
  path.join(root, "src/components/site-header.jsx"),
  "utf8",
);
const footer = readFileSync(
  path.join(root, "src/components/site-footer.jsx"),
  "utf8",
);
const layout = readFileSync(
  path.join(root, "src/components/public-layout.jsx"),
  "utf8",
);
const breadcrumbs = readFileSync(
  path.join(root, "src/components/public-breadcrumbs.jsx"),
  "utf8",
);
const apiPage = readFileSync(
  path.join(root, "src/app/(public)/api-data/page.jsx"),
  "utf8",
);
const robots = readFileSync(path.join(root, "src/app/robots.js"), "utf8");

const routes = [...navSource.matchAll(/href:\s*"([^\"]+)"/g)].map(
  (match) => match[1],
);
const uniqueRoutes = [...new Set(routes)];
for (const route of uniqueRoutes) {
  const pagePath =
    route === "/"
      ? path.join(root, "src/app/(public)/page.jsx")
      : path.join(root, `src/app/(public)/${route.slice(1)}/page.jsx`);
  if (!existsSync(pagePath))
    errors.push(
      `Rute navigasi ${route} tidak memiliki page.jsx (${path.relative(root, pagePath)}).`,
    );
}

if (!header.includes('from "@/lib/public-navigation"')) {
  errors.push("SiteHeader harus memakai sumber navigasi bersama.");
}
if (
  footer.includes('from "@/lib/public-navigation"') ||
  /<nav\b/.test(footer)
) {
  errors.push(
    "SiteFooter tidak boleh mengulang navigasi utama; tautan halaman sudah tersedia pada header dan breadcrumb.",
  );
}
if (
  !footer.includes('href="https://data.go.id"') ||
  !footer.includes("width={160}")
) {
  errors.push(
    "Footer harus menampilkan penanda SDI berukuran kecil dan tautan ke portal resmi data.go.id.",
  );
}
if (
  !layout.includes("<PublicBreadcrumbs />") ||
  !layout.includes('id="konten-utama"')
) {
  errors.push(
    "Layout publik harus menyediakan breadcrumb dan target konten utama.",
  );
}
for (const route of [
  "dataset",
  "organisasi",
  "statistik",
  "infografik",
  "publikasi",
  "informasi",
  "berita",
  "api-data",
  "bantuan",
]) {
  if (
    !breadcrumbs.includes(`${route}:`) &&
    !breadcrumbs.includes(`"${route}":`)
  ) {
    errors.push(`Breadcrumb belum memiliki label untuk rute /${route}.`);
  }
}
if (
  !apiPage.includes("<CodeBlock") ||
  !apiPage.includes("<Button") ||
  !apiPage.includes("api-related-pages-title")
) {
  errors.push(
    "Halaman API harus menggunakan komponen UI bersama, contoh kode, dan navigasi ke halaman terkait.",
  );
}
for (const route of ["/informasi", "/berita"]) {
  if (!robots.includes(`"${route}"`))
    errors.push(`robots.js harus mengizinkan indexing konten publik ${route}.`);
}

// Scan route literals across the public UI so links stay aligned with App Router pages.
const publicSourceFiles = [];
function collectPublicSourceFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const resolved = path.join(directory, entry.name);
    if (entry.isDirectory()) collectPublicSourceFiles(resolved);
    else if (/\.(?:js|jsx|mjs)$/.test(entry.name))
      publicSourceFiles.push(resolved);
  }
}
collectPublicSourceFiles(path.join(root, "src/app/(public)"));
collectPublicSourceFiles(path.join(root, "src/components"));
const routePageFiles = new Set();
for (const file of publicSourceFiles) {
  if (path.basename(file) !== "page.jsx") continue;
  const relative = path
    .relative(path.join(root, "src/app/(public)"), path.dirname(file))
    .replaceAll(path.sep, "/");
  routePageFiles.add(relative === "." ? "/" : `/${relative}`);
}
for (const file of publicSourceFiles) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(
    /href\s*=\s*\{?\s*["'`]((?:\/)[^"'`$}\s]*)/g,
  )) {
    const href = match[1];
    const pathname = href.split(/[?#]/, 1)[0].replace(/\/$/, "") || "/";
    if (
      pathname === "/" ||
      pathname.startsWith("/api/") ||
      pathname.startsWith("/_next/")
    )
      continue;
    const segments = pathname.split("/").filter(Boolean);
    let isKnown = routePageFiles.has(pathname);
    for (let length = segments.length; !isKnown && length > 0; length -= 1) {
      const prefix = `/${segments.slice(0, length).join("/")}`;
      isKnown = routePageFiles.has(`${prefix}/[slug]`);
    }
    if (!isKnown)
      errors.push(
        `${path.relative(root, file)}: internal link "${href}" tidak memiliki route tujuan.`,
      );
  }
}

// Validate section anchors used by the API page and links to its publishing guide.
const apiSource = readFileSync(
  path.join(root, "src/app/(public)/api-data/page.jsx"),
  "utf8",
);
const apiIds = new Set(
  [...apiSource.matchAll(/\bid="([a-z0-9-]+)"/g)].map((match) => match[1]),
);
for (const file of publicSourceFiles) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(
    /href\s*=\s*["'`]\/api-data#([a-z0-9-]+)["'`]/g,
  )) {
    if (!apiIds.has(match[1]))
      errors.push(
        `${path.relative(root, file)}: anchor /api-data#${match[1]} tidak ditemukan pada dokumentasi API.`,
      );
  }
}

if (errors.length) {
  console.error(`Pemeriksaan navigasi publik gagal (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
process.stdout.write(
  `Public navigation check passed: ${uniqueRoutes.length} configured route(s), one primary header route map, non-duplicated footer, breadcrumbs and API cross-links are present.\n`,
);
