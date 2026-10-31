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
}
const editor = await readFile(
  "deploy/ckan/theme/ckanext/wajo_theme/public/wajo-markdown-editor.js",
  "utf8",
);
assert.match(editor, /Tabel/);
assert.match(editor, /Pratinjau/);
assert.match(editor, /Unggah gambar/);
assert.match(editor, /fetch\("\/admin\/media\/upload"/);
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
console.log(
  "Public resource download, admin Markdown, CSRF and file input design contracts passed.",
);
