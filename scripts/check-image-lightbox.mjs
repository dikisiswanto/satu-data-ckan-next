import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (file) => readFile(new URL(file, root), "utf8");

const lightbox = await read("src/components/ui/image-lightbox.jsx");
assert.match(
  lightbox,
  /useLayoutEffect/,
  "Live refs must be synchronized after commit, not mutated during render.",
);
assert.match(
  lightbox,
  /useLayoutEffect\(\(\) => \{[\s\S]*zoomRef\.current = zoom[\s\S]*indexRef\.current = index[\s\S]*galleryRef\.current = gallery[\s\S]*\}, \[zoom, index, gallery\]\)/,
  "Zoom/index/gallery refs must stay current for keyboard and pointer handlers.",
);
assert.doesNotMatch(
  lightbox,
  /const galleryRef = useRef\(gallery\);\s*zoomRef\.current = zoom/,
  "Refs must never be assigned during render.",
);
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
  /event\.key === "Escape"[\s\S]*closeLightbox\(\)/,
  "Escape must close the image dialog.",
);
assert.match(
  lightbox,
  /function closeLightbox\(\)[\s\S]*setOpen\(false\)[\s\S]*resetView\(\)/,
  "Closing the dialog must reset zoom and pan state.",
);
assert.match(
  lightbox,
  /MIN_ZOOM = 1[\s\S]*MAX_ZOOM = 5[\s\S]*ZOOM_STEP = 0\.5/,
  "Image preview must provide bounded zoom controls.",
);
assert.match(
  lightbox,
  /document\.documentElement\.style\.overflow = "hidden"[\s\S]*document\.body\.style\.overflow = "hidden"/,
  "Background page scrolling must be locked while the dialog is open.",
);
assert.match(
  lightbox,
  /previousDocumentOverflow[\s\S]*previousBodyOverflow[\s\S]*document\.documentElement\.style\.overflow = previousDocumentOverflow[\s\S]*document\.body\.style\.overflow = previousBodyOverflow/,
  "Original scroll lock styles must be restored after closing the dialog.",
);
assert.match(
  lightbox,
  /element\.inert = true[\s\S]*element\.inert = inert/,
  "Background page content must be inert while the modal is open and restored afterward.",
);
assert.match(
  lightbox,
  /focusableSelector[\s\S]*event\.key === "Tab"/,
  "Keyboard focus must remain trapped inside the modal.",
);
assert.match(
  lightbox,
  /function pointerDistance[\s\S]*function handlePointerDown[\s\S]*setPointerCapture/,
  "The viewer must support pointer gesture tracking.",
);
assert.match(
  lightbox,
  /function handlePointerMove[\s\S]*pointerDistance\(points\[0\], points\[1\]\)[\s\S]*setZoomTo\(start\.zoom/,
  "The viewer must support pinch zoom and image panning.",
);
assert.match(
  lightbox,
  /swipeEligible[\s\S]*Geser atau gunakan panah untuk navigasi/,
  "Grouped galleries must support touch swiping without mistaking pinch gestures for navigation.",
);
assert.match(
  lightbox,
  /onWheel=\{handleWheel\}[\s\S]*onDoubleClick/,
  "The viewer must support mouse-wheel and double-click zoom.",
);
assert.match(
  lightbox,
  /Gambar sebelumnya[\s\S]*Gambar berikutnya[\s\S]*galleryLength > 1/,
  "Grouped images must support previous/next navigation.",
);
assert.match(
  lightbox,
  /aria-label="Pilih gambar dalam galeri"[\s\S]*aria-pressed=\{selected\}/,
  "Grouped image galleries must expose a labelled, selectable thumbnail filmstrip.",
);
assert.match(
  lightbox,
  /onClick=\{\(\) => goToImage\(thumbnailIndex\)\}/,
  "Gallery thumbnails must navigate to the selected image.",
);
assert.match(
  lightbox,
  /imageStatus === "error"[\s\S]*Buka gambar asli/,
  "Failed image loading must provide a useful recovery action.",
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
const organizationDirectory = await read(
  "src/components/organization-directory.jsx",
);
assert.match(organizationDirectory, /import Image/);
assert.ok(
  organizationDirectory.includes("next" + String.fromCharCode(47) + "image"),
  "Organization logos must import the Next.js Image component.",
);
assert.match(
  organizationDirectory,
  /<Image[\s\S]*width=\{44\}[\s\S]*height=\{44\}[\s\S]*unoptimized/,
  "Organization logos must use next/image while supporting same-origin and external CKAN URLs.",
);
assert.doesNotMatch(
  organizationDirectory,
  /<img\s/,
  "Organization directory must not use a raw img element.",
);
assert.match(
  await read("src/app/(public)/dataset/[slug]/page.jsx"),
  /group=\{`dataset-\$\{dataset\.name\}`\}/,
  "Dataset previews must form a navigable gallery scoped to the current dataset.",
);
assert.match(
  await read("src/app/(public)/infografik/[slug]/page.jsx"),
  /group=\{`infographic-\$\{item\.name\}`\}/,
  "Infographic detail images must form a navigable gallery scoped to the current item.",
);
assert.match(
  await read("src/components/cms/content-blocks.jsx"),
  /group=\{`cms-gallery-\$\{index\}`\}/,
  "CMS gallery images must share navigation within their own gallery block.",
);

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
assert.match(
  e2e,
  /image lightbox supports gallery navigation, focus containment and view reset[\s\S]*Gambar berikutnya[\s\S]*Perkecil gambar[\s\S]*Escape/,
  "Grouped image navigation and modal focus boundaries must be covered by browser tests.",
);
assert.match(
  e2e,
  /image lightbox shows a recovery action when the source image fails[\s\S]*Gambar tidak dapat dimuat[\s\S]*Buka gambar asli/,
  "Failed image loads must have browser coverage for the recovery path.",
);

const catalog = await read("src/lib/data/public.js");
assert.match(
  catalog,
  /buildDatasetCatalogExclusionFilters\(\)[\s\S]*fqList:/,
  "The ordinary dataset catalogue must send dedicated portal-content exclusions as CKAN fq_list values.",
);
assert.match(
  catalog,
  /facets: true, fqList: buildDatasetCatalogExclusionFilters\(\)/,
  "Dataset facets must exclude dedicated portal-content types through CKAN fq_list too.",
);

process.stdout.write(
  "Image lightbox integrations and dedicated portal catalogue boundaries passed.\n",
);
