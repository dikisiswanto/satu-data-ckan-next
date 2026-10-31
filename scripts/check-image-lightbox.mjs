import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (file) => readFile(new URL(file, root), "utf8");

const lightbox = await read("src/components/ui/image-lightbox.jsx");
assert.match(
  lightbox,
  /createPortal\([\s\S]*document\.body/,
  "Image preview must render in a body-level overlay to avoid parent stacking contexts.",
);
assert.match(
  lightbox,
  /role="dialog"[\s\S]*aria-modal="true"/,
  "Image preview must expose an accessible modal dialog.",
);
assert.match(
  lightbox,
  /event\.key === "Escape"[\s\S]*setOpen\(false\)/,
  "Escape must close the image dialog.",
);
assert.match(
  lightbox,
  /MIN_ZOOM = 1[\s\S]*MAX_ZOOM = 4[\s\S]*ZOOM_STEP = 0\.5/,
  "Image preview must provide bounded zoom controls.",
);
assert.match(
  lightbox,
  /document\.body\.style\.overflow = "hidden"[\s\S]*previousOverflow/,
  "Background page scrolling must be locked and restored while the dialog is open.",
);
assert.match(
  lightbox,
  /aria-label=\{`Perbesar gambar:/,
  "The trigger must announce its purpose to assistive technology.",
);

const integrations = [
  [
    "src/app/(public)/dataset/[slug]/page.jsx",
    "Dataset image resource previews",
  ],
  [
    "src/app/(public)/infografik/[slug]/page.jsx",
    "Infographic detail previews",
  ],
  ["src/components/cms/content-blocks.jsx", "CMS image and gallery blocks"],
  ["src/components/cms/markdown-content.jsx", "Markdown image tokens"],
  ["src/app/(public)/informasi/[slug]/page.jsx", "Information page cover"],
  ["src/app/(public)/berita/[slug]/page.jsx", "News article cover"],
];
for (const [file, label] of integrations) {
  const source = await read(file);
  assert.match(
    source,
    /ImageLightbox/,
    `${label} must use the shared image lightbox.`,
  );
}

const e2e = await read("tests/e2e/public-portal.spec.js");
assert.match(
  e2e,
  /dataset image previews open in a zoomable lightbox[\s\S]*Perbesar gambar: Denah titik sekolah Kabupaten Wajo[\s\S]*150%[\s\S]*Escape/,
  "Dataset image lightbox must have browser coverage for open, zoom and Escape close.",
);
assert.match(
  e2e,
  /infographic previews open in a zoomable lightbox[\s\S]*Perbesar gambar: Infografik utama stunting[\s\S]*150%[\s\S]*Escape/,
  "Infographic lightbox must have browser coverage for open, zoom and Escape close.",
);

const catalog = await read("src/lib/data/public.js");
assert.match(
  catalog,
  /buildDatasetCatalogExclusionFilters\(\)[\s\S]*fq:/,
  "The ordinary dataset catalogue must apply dedicated portal-content exclusions.",
);
assert.match(
  catalog,
  /facets: true, fq: buildDatasetCatalogExclusionFilters\(\)/,
  "Dataset facets must exclude dedicated portal-content types too.",
);

process.stdout.write(
  "Image lightbox integrations and dedicated portal catalogue boundaries passed.\n",
);
