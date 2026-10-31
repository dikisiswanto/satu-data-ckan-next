import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseMarkdown } from "../src/lib/markdown/parse-markdown.js";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const parse = (source) => parseMarkdown(source);
assert.equal(
  parse("# Judul")[0]?.level,
  1,
  "Markdown H1 must preserve its semantic heading level.",
);
assert.equal(
  parse("Subjudul\n---")[0]?.level,
  2,
  "Setext heading level two must be parsed.",
);
assert.equal(
  parse("| Nama | Jumlah |\n| :--- | ---: |\n| A | 10 |\n| B | 20 |")[0]?.type,
  "table",
);
assert.equal(parse("- [x] Selesai\n- [ ] Belum")[0]?.items?.[0]?.checked, true);
assert.equal(
  parse("- induk\n  - anak\n- berikutnya")[0]?.items?.[0]?.blocks?.[1]?.type,
  "list",
);
assert.equal(parse("> kutipan")[0]?.type, "blockquote");
assert.equal(parse("```js\nconst x = 1\n```")[0]?.type, "code");
assert.ok(
  parse("teks  \nbaris baru")[0]?.children?.some(
    (item) => item.type === "break",
  ),
);
assert.equal(
  parse("<script>alert(1)</script>")[0]?.children?.[0]?.type,
  "text",
  "Raw HTML must remain inert text.",
);

const renderer = await read("src/components/cms/markdown-content.jsx");
const editor = await read(
  "deploy/ckan/theme/ckanext/wajo_theme/public/wajo-markdown-editor.js",
);
const pagesForm = await read(
  "deploy/ckan/theme/ckanext/wajo_theme/templates/ckanext_pages/base_form.html",
);
assert.match(
  renderer,
  /h\$\{Math\.max\(1, Math\.min\(6, block\.level\)\)\}/,
  "Frontend must render Markdown heading levels without offset.",
);
assert.match(
  renderer,
  /publicCmsImageUrl[\s\S]*publicResourceUrl[\s\S]*normalizeMarkdownHref/,
  "Markdown images and links must use the public CKAN file/download proxy.",
);
assert.match(
  renderer,
  /normalizeMarkdownHref\(token\.href\)/,
  "Markdown links must be normalized through the public CKAN asset routes.",
);
assert.match(
  editor,
  /renderMarkdown\(rawItem\.join\("\\n"\), li, depth \+ 1\)/,
  "Admin preview must support nested lists.",
);
assert.match(
  editor,
  /startsWith\("="\) \? "h1" : "h2"/,
  "Admin preview must support Setext headings.",
);
assert.match(
  editor,
  /function expandReferenceLinks\(source\)/,
  "Admin preview must resolve Markdown reference-style links.",
);
assert.match(
  editor,
  /textarea\[name='content'\]/,
  "CKAN Pages and News Markdown content fields must be enhanced by the admin editor.",
);
assert.match(
  editor,
  /renderMarkdown\(textarea\.value, fragment\)/,
  "The preview action must render Markdown into the preview panel rather than show raw source.",
);
assert.match(
  editor,
  /data-module~="ckedit"/,
  "The Markdown editor must not conflict with the optional upstream CKEditor.",
);
assert.match(
  pagesForm,
  /{% block scripts %}\s*{{ super\(\) }}/,
  "CKAN Pages must preserve the inherited Wajo editor scripts while keeping upstream CKEditor assets.",
);
assert.equal(
  editor.split('startsWith("=") ? "h1" : "h2"').length - 1,
  1,
  "Setext heading detection must not be duplicated.",
);
assert.match(pagesForm, /data-wajo-image-upload-for="field-og-image"/);
assert.match(
  pagesForm,
  /data-wajo-image-upload-to-json="field-content-blocks"/,
);

process.stdout.write(
  "Markdown renderer checks passed: semantic headings, tables/alignment, tasks, nested lists, Setext, quotes, code, hard breaks, inert HTML, and CMS image upload controls.\n",
);
