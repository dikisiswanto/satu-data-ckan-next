import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const route = await readFile(
  "src/app/(public)/dataset/[slug]/resource/[resourceId]/download/[filename]/route.js",
  "utf8",
);
const caddyFiles = [
  "deploy/ckan/Caddyfile",
  "deploy/ckan/Caddyfile.basic-auth",
  "deploy/ckan/Caddyfile.tunnel",
  "deploy/ckan/Caddyfile.tunnel.access",
  "deploy/ckan/Caddyfile.tunnel.basic-auth",
];
assert.match(route, /resource_show/);
assert.match(route, /package_show/);
assert.match(route, /dataset\.private === true/);
assert.match(route, /publicResource\.private === true/);
assert.match(route, /redirect:\s*"manual"/);
assert.match(route, /Range/);
assert.match(route, /Content-Disposition/);
assert.match(
  route,
  /sourceFilename !== requestedFilename/,
  "Download filename must match the CKAN resource path.",
);
assert.match(route, /CKAN_API_INTERNAL_URL/);
assert.match(route, /text\/html/);
const exampleDownloadPath =
  "/dataset/9c70ae22-cd50-4e14-8887-d7574abfface/resource/3c2e4f10-6c61-4a2c-a3db-b96db879889c/download/menara-telekomunikasi-di-kabupaten-wajo-tahun-2025.xlsx";
const expectedCaddyPattern =
  /^\/dataset\/[^/]+\/resource\/[a-fA-F0-9-]{16,64}\/download\/[^/]+\/?$/;
assert.match(
  exampleDownloadPath,
  expectedCaddyPattern,
  "The production XLSX example must match the explicit download route.",
);
for (const file of caddyFiles) {
  const source = await readFile(file, "utf8");
  assert.match(
    source,
    /@publicResourceDownload path_regexp/,
    `${file} must route public resource downloads to Next.js explicitly`,
  );
  assert.match(
    source,
    /handle @publicResourceDownload[\s\S]*reverse_proxy nextjs:3000/,
  );
  assert.match(
    source,
    /\[a-fA-F0-9-\]\{16,64\}\/download/,
    `${file} must match UUID resources including the reported XLSX URL`,
  );
}
const genericFileProxy = await readFile(
  "src/app/api/public/ckan-file/[fileId]/route.js",
  "utf8",
);
assert.match(genericFileProxy, /file_show/);
assert.match(genericFileProxy, /resource_show/);
assert.match(genericFileProxy, /package_show/);
assert.match(genericFileProxy, /ownerType === "wajo_media"/);
assert.match(genericFileProxy, /private !== true/);
assert.match(genericFileProxy, /redirect:\s*"manual"/);
assert.match(genericFileProxy, /Range/);
assert.match(genericFileProxy, /imageSignatureMatches/);
assert.match(genericFileProxy, /image\/svg\+xml/);
const publicResourceUrls = await readFile(
  "src/lib/ckan/public-resource-url.js",
  "utf8",
);
assert.match(publicResourceUrls, /api\/public\/ckan-file/);
assert.match(publicResourceUrls, /publicGroupMatch/);

const editor = await readFile(
  "deploy/ckan/theme/ckanext/wajo_theme/public/wajo-markdown-editor.js",
  "utf8",
);
assert.match(editor, /Tabel/);
assert.match(editor, /Pratinjau/);
assert.match(editor, /Unggah gambar/);
assert.match(editor, /fetch\("\/admin\/media\/upload"/);
assert.match(
  editor,
  /MutationObserver/,
  "Late-rendered Pages/News textareas must still receive a Markdown preview control.",
);
assert.match(editor, /textarea\[name='body'\]/);
const base = await readFile(
  "deploy/ckan/theme/ckanext/wajo_theme/templates/base.html",
  "utf8",
);
assert.match(base, /wajo-markdown-editor\.js/);
const csrf = /wajo-media-csrf[\s\S]*csrf_input/;
assert.match(
  base,
  csrf,
  "The Markdown media uploader must reuse CKAN's native CSRF token.",
);
const css = await readFile(
  "deploy/ckan/theme/ckanext/wajo_theme/assets/css/wajo-admin-design-system.css",
  "utf8",
);
assert.match(css, /wajo-login-frame.*460px/);
assert.match(css, /input\[type="file"\]::file-selector-button/);
assert.match(css, /wajo-file-preview/);
process.stdout.write(
  "Public resource download, admin Markdown, CSRF and file input design contracts passed.\n",
);
