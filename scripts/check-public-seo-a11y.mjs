import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const read = (path) => readFile(path, "utf8");
const layout = await read("src/app/layout.jsx");
const foundation = await read("src/app/styles/foundation.css");
const robots = await read("src/app/robots.js");
const sitemap = await read("src/app/sitemap.js");
const news = await read("src/app/(public)/berita/[slug]/page.jsx");
const information = await read("src/app/(public)/informasi/[slug]/page.jsx");
const api = await read("src/app/(public)/api-data/page.jsx");
const publicBackToTop = await read("src/components/back-to-top.jsx");
const adminBackToTop = await read(
  "deploy/ckan/theme/ckanext/portal_theme/public/portal-admin-back-to-top.js",
);
const adminBase = await read(
  "deploy/ckan/theme/ckanext/portal_theme/templates/base.html",
);
const failures = [];
const require = (condition, message) => {
  if (!condition) failures.push(message);
};

require(/<html lang=\{siteConfig\.locale\}/.test(
  layout,
), "Root document must expose the configured document language.");
require(/title:\s*\{\s*default:/.test(
  layout,
), "Root metadata must define a default page title.");
require(/description:\s*siteConfig\.description/.test(
  layout,
), "Root metadata must define the configured description.");
require(/initialScale:\s*1/.test(layout) &&
  !/userScalable:\s*false|max(?:imum)?Scale:\s*1/.test(
    layout,
  ), "Viewport metadata must preserve user zoom.");
require(/:focus-visible/.test(
  foundation,
), "Public UI must retain a visible keyboard focus style.");
require(/skip-link/.test(layout) &&
  /id="konten-utama"/.test(
    await read("src/components/public-layout.jsx"),
  ), "Public shell must provide a working skip link and main target.");
require(/sitemap:\s*`\$\{base\}\/sitemap\.xml`/.test(
  robots,
), "Robots metadata must advertise the configured sitemap.");
require(/export const dynamic = "force-dynamic"/.test(
  sitemap,
), "Sitemap must not cache partial catalog responses as complete.");
for (const route of [
  "/api-data",
  "/berita",
  "/informasi",
  "/dataset",
  "/organisasi",
]) {
  require(sitemap.includes(`"${route}"`), `Sitemap must include ${route}.`);
}
require(/getCanonicalMetadata\("\/api-data"\)/.test(
  api,
), "API documentation must declare a canonical URL.");
require(/Dokumentasi CKAN Action API untuk pengembang dan organisasi/.test(
  api,
), "API metadata must target developers and integrating organizations.");
require(/@type": "NewsArticle"/.test(news) &&
  /datePublished/.test(
    news,
  ), "News detail must expose NewsArticle structured data and publication date when available.");
require(/@type": "WebPage"/.test(
  information,
), "Information detail must expose WebPage structured data.");
require(/getCanonicalMetadata\(`\/berita\//.test(news) &&
  /getCanonicalMetadata\(`\/informasi\//.test(
    information,
  ), "CMS details must expose canonical metadata for resolved slugs.");
require(/aria-label="Kembali ke bagian atas halaman"/.test(
  publicBackToTop,
), "Public back-to-top control must have an accessible name.");
require(/aria-label", "Kembali ke bagian atas halaman"/.test(
  adminBackToTop,
), "CKAN back-to-top control must have an accessible name.");
require(/portal-admin-back-to-top\.js/.test(
  adminBase,
), "CKAN base template must load the back-to-top behavior.");
require(/prefers-reduced-motion: reduce/.test(publicBackToTop) &&
  /prefers-reduced-motion: reduce/.test(
    adminBackToTop,
  ), "Back-to-top controls must respect reduced-motion preferences.");
require(/preload/.test(
  await read("src/app/(public)/page.jsx"),
), "Homepage hero image must be discoverable with preload.");

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else if (/\.(jsx|js)$/.test(entry.name)) files.push(path);
  }
  return files;
}

for (const file of await walk("src")) {
  const source = await read(file);
  for (const match of source.matchAll(/<img\b[^>]*>/g)) {
    const tag = match[0];
    require(/\balt=/.test(tag), `${file}: HTML image must define alt text.`);
    require(/\bwidth=/.test(tag) &&
      /\bheight=/.test(
        tag,
      ), `${file}: HTML image must reserve intrinsic dimensions.`);
  }
  for (const match of source.matchAll(/<Image\b[\s\S]*?\/>/g)) {
    const tag = match[0];
    require(/\balt=/.test(tag), `${file}: Next Image must define alt text.`);
    const hasFill = /\bfill(?:\s|=)/.test(tag);
    const hasDimensions = /\bwidth=/.test(tag) && /\bheight=/.test(tag);
    require(hasFill ||
      hasDimensions, `${file}: Next Image must reserve layout dimensions with fill or width/height.`);
  }
}

if (failures.length) {
  process.stderr.write(
    `Public SEO/accessibility checks failed:\n${failures.map((item) => `- ${item}`).join("\n")}\n`,
  );
  process.exit(1);
}

process.stdout.write(
  "Public SEO/accessibility source checks passed. Runtime axe/Lighthouse measurements are not performed by this script.\n",
);
