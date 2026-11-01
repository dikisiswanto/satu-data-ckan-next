#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const errors = [];
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");
const requirePattern = (content, pattern, message) => {
  if (!pattern.test(content)) errors.push(message);
};

const pagination = read("src/components/public-pagination.jsx");
requirePattern(
  pagination,
  /aria-current=\{page === current \? "page" : undefined\}/,
  "Pagination must expose its active page with aria-current=page",
);
requirePattern(pagination, /rel="prev"/, "Pagination must expose rel=prev");
requirePattern(pagination, /rel="next"/, "Pagination must expose rel=next");
requirePattern(
  pagination,
  /aria-disabled="true"/,
  "Pagination boundary controls must be visibly and accessibly disabled",
);
requirePattern(
  pagination,
  /Menampilkan[\s\S]*Halaman/,
  "Pagination must show result range and current page context",
);

for (const [route, listId] of [
  ["dataset", "dataset-list"],
  ["statistik", "statistics-list"],
  ["infografik", "infographic-list"],
  ["publikasi", "publication-list"],
]) {
  const page = read(`src/app/(public)/${route}/page.jsx`);
  requirePattern(
    page,
    /<PublicPagination\b/,
    `${route} must use the shared public pagination component`,
  );
  requirePattern(
    page,
    /normalizePageNumber/,
    `${route} must normalize requested page numbers`,
  );
  requirePattern(
    page,
    /totalPages|pageCount/,
    `${route} must calculate a real page count`,
  );
  requirePattern(
    page,
    new RegExp(`id=["']${listId}["']`),
    `${route} must expose its pagination focus target`,
  );
}

const scrollManager = read("src/components/public-scroll-manager.jsx");
for (const listId of [
  "dataset-list",
  "statistics-list",
  "infographic-list",
  "publication-list",
]) {
  requirePattern(
    scrollManager,
    new RegExp(`\\"${listId}\\"`),
    `Scroll manager must preserve list focus for ${listId}`,
  );
}

const pdfPreview = read("src/components/pdf-resource-preview.jsx");
requirePattern(
  pdfPreview,
  /<iframe[\s\S]*loading="lazy"/,
  "PDF preview must lazy-load the embedded document",
);
requirePattern(
  pdfPreview,
  /target="_blank"/,
  "PDF preview must provide a separate open-document link",
);
for (const route of [
  "dataset/[slug]",
  "publikasi/[slug]",
  "infografik/[slug]",
]) {
  requirePattern(
    read(`src/app/(public)/${route}/page.jsx`),
    /<PdfResourcePreview\b/,
    `${route} must expose PDF preview where a PDF resource exists`,
  );
}

const newsPage = read("src/app/(public)/berita/page.jsx");
requirePattern(
  newsPage,
  /public-news-feature-media[^\n]*order-1[^\n]*lg:order-2/,
  "Featured article image must precede text on mobile while preserving desktop order",
);
requirePattern(
  newsPage,
  /public-news-feature-copy[^\n]*order-2[^\n]*lg:order-1/,
  "Featured article copy must follow image on mobile and precede it on desktop",
);

for (const route of ["dataset", "statistik", "infografik", "publikasi"]) {
  requirePattern(
    read(`src/app/(public)/${route}/page.jsx`),
    /<PublicNote\b/,
    `${route} must render low-emphasis explanatory notes`,
  );
}
requirePattern(
  read("src/app/(public)/statistik/[slug]/page.jsx"),
  /<PublicNote\b/,
  "indicator detail must present methodology cautions as a subdued note",
);

const docsIndex = read("docs/INDEX.md");
requirePattern(
  docsIndex,
  /KUALITAS-FE-PUBLIK\.md/,
  "Indeks dokumentasi harus menautkan panduan kualitas FE kanonis",
);
requirePattern(
  read("README.md"),
  /docs\/INDEX\.md/,
  "README utama harus menautkan indeks dokumentasi kanonis",
);
const qualityGuide = read("docs/KUALITAS-FE-PUBLIK.md");
requirePattern(
  qualityGuide,
  /Core Web Vitals/,
  "FE quality guide must document Core Web Vitals",
);
requirePattern(
  qualityGuide,
  /axe|accessibility/i,
  "FE quality guide must document the accessibility audit",
);

const pkg = JSON.parse(read("package.json"));
for (const script of ["format:write", "format:check", "fix"]) {
  if (!pkg.scripts?.[script])
    errors.push(`package.json is missing the ${script} command`);
}
requirePattern(
  pkg.scripts["format:write"],
  /prettier --write/,
  "format:write must invoke Prettier write mode",
);
requirePattern(
  pkg.scripts.fix,
  /format:write[\s\S]*lint:fix/,
  "fix must format source before applying ESLint fixes",
);

for (const relativePath of [
  "tests/e2e/public-accessibility.spec.js",
  "tests/e2e/public-performance.spec.js",
]) {
  if (!fs.existsSync(path.join(root, relativePath)))
    errors.push(`Missing extended quality test: ${relativePath}`);
}

if (errors.length) {
  process.stderr.write(
    `${errors.map((error) => `ERROR: ${error}`).join("\n")}\n`,
  );
  process.exit(1);
}
process.stdout.write(
  "Public FE quality contract passed: accessible pagination, valid page bounds, PDF previews, subdued notes, mobile featured ordering, linked docs, and format/lint commands.\n",
);
