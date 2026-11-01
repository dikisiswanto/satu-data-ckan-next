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

const schemingMarkdownDisplay = await read(
  "deploy/ckan/theme/ckanext/wajo_theme/templates/scheming/display_snippets/markdown.html",
);
assert.match(
  schemingMarkdownDisplay,
  /data\.get\(field\.field_name\)[\s\S]*h\.wajo_render_markdown\(markdown_value\)/,
  "Scheming Markdown-enabled metadata fields must use the shared allowlisted Wajo renderer on detail pages.",
);
for (const schemaPath of [
  "deploy/ckan/theme/ckanext/wajo_theme/schemas/dataset.yaml",
  "deploy/ckan/theme/ckanext/wajo_theme/schemas/organization.yaml",
  "deploy/ckan/theme/ckanext/wajo_theme/schemas/group.yaml",
]) {
  const schema = await read(schemaPath);
  assert.match(
    schema,
    /form_snippet: markdown\.html[\s\S]{0,80}display_snippet: markdown\.html/,
    `${schemaPath} must render all Markdown-enabled metadata fields with the Wajo display snippet.`,
  );
}
const adminPluginSource = await read(
  "deploy/ckan/theme/ckanext/wajo_theme/plugin.py",
);
assert.match(
  adminPluginSource,
  /config\["extra_template_paths"\][\s\S]*theme_templates/,
  "Wajo CMS templates must have deterministic priority over the upstream ckanext-pages templates.",
);
const setupSource = await read("deploy/ckan/theme/setup.py");
assert.match(
  setupSource,
  /templates\/scheming\/display_snippets\/\*\.html/,
  "The custom Markdown display snippet must be included in the installed Wajo theme wheel.",
);
const bootstrapSource = await read("deploy/ckan/bootstrap-upstream.sh");
assert.doesNotMatch(
  bootstrapSource,
  /CKANEXT__PAGES__EDITOR.*markdown/,
  "Do not set the truthy editor=markdown value; CKAN Pages treats it as a WYSIWYG editor on detail views.",
);
assert.match(
  bootstrapSource,
  /m\.group\(1\) in \{legacy_map_url_key, "CKANEXT__PAGES__EDITOR"\}/,
  "Bootstrap must remove a stale editor setting from an existing .env.ckan file.",
);

const pagesDetail = await read(
  "deploy/ckan/theme/ckanext/wajo_theme/templates/ckanext_pages/page.html",
);
const blogDetail = await read(
  "deploy/ckan/theme/ckanext/wajo_theme/templates/ckanext_pages/blog.html",
);
const pagesRevision = await read(
  "deploy/ckan/theme/ckanext/wajo_theme/templates/ckanext_pages/page_revisions_preview.html",
);
const blogRevision = await read(
  "deploy/ckan/theme/ckanext/wajo_theme/templates/ckanext_pages/blog_revisions_preview.html",
);
const adminMarkdown = await read(
  "deploy/ckan/theme/ckanext/wajo_theme/markdown.py",
);
const adminPlugin = await read(
  "deploy/ckan/theme/ckanext/wajo_theme/plugin.py",
);
const promotedIntro = await read(
  "deploy/ckan/theme/ckanext/wajo_theme/templates/home/snippets/promoted.html",
);
for (const [name, template] of [
  ["Pages", pagesDetail],
  ["Blog", blogDetail],
  ["Pages revisions", pagesRevision],
  ["Blog revisions", blogRevision],
]) {
  assert.match(
    template,
    /h\.wajo_render_markdown\(/,
    `${name} detail must render Markdown in CKAN admin.`,
  );
  assert.doesNotMatch(
    template,
    /pages_get_wysiwyg_editor|revision\.content\|safe|g\.page\.content\|safe/,
    `${name} must always parse stored CKAN Pages/Blog Markdown through the allowlisted renderer.`,
  );
}
assert.match(
  blogDetail,
  /block secondary_content %}\s*{% endblock %}/,
  "Blog detail must not inject unrelated recent article sidebars.",
);
assert.match(
  adminPlugin,
  /ITemplateHelpers[\s\S]*wajo_render_markdown/,
  "CKAN must expose the safe Wajo Markdown helper to Jinja templates.",
);
assert.match(
  adminMarkdown,
  /extensions=\["extra", "sane_lists", _WajoMarkdownExtension\(\)\]/,
  "CKAN admin must render tables, fenced code, and sane lists.",
);
assert.match(
  adminMarkdown,
  /class _TaskListTreeprocessor[\s\S]*def run\(self, root:/,
  "CKAN admin must render task-list checkboxes.",
);
assert.match(
  adminMarkdown,
  /_STRIKE_RE[\s\S]*class _StrikethroughProcessor/,
  "CKAN admin must render strikethrough Markdown.",
);
assert.match(
  adminMarkdown,
  /nh3\.clean\([\s\S]*_ALLOWED_URL_SCHEMES/,
  "CKAN Markdown output must be sanitized with a constrained tag/attribute/URL allowlist.",
);
for (const tag of [
  "h1",
  "table",
  "img",
  "blockquote",
  "ul",
  "ol",
  "pre",
  "code",
]) {
  assert.match(
    adminMarkdown,
    new RegExp(`_ALLOWED_TAGS\\s*=\\s*\\{[\\s\\S]*?[\"]${tag}[\"]`),
    `CKAN Markdown must retain the allowlisted <${tag}> semantic element.`,
  );
}
assert.match(
  promotedIntro,
  /h\.wajo_render_markdown\(intro\)/,
  "CKAN homepage introduction must use the same allowlisted Markdown renderer as Pages and Blog.",
);
assert.doesNotMatch(
  promotedIntro,
  /h\.render_markdown\(intro\)/,
  "CKAN homepage introduction must not bypass the shared Wajo Markdown policy.",
);

const newsDetail = await read("src/app/(public)/berita/[slug]/page.jsx");
assert.match(
  newsDetail,
  /getCmsMarkdownImage/,
  "News detail may derive social image metadata from Markdown images only.",
);
assert.match(
  newsDetail,
  /<CmsPageBody page=\{page\}\s*\/>/,
  "News detail must render original inline Markdown images inside the article body.",
);
assert.doesNotMatch(
  newsDetail,
  /getCmsFeatureImage|ImageLightbox|public-cms-cover|<Image/,
  "News detail must not render a separate featured/cover image before Markdown content.",
);

process.stdout.write(
  "Markdown renderer checks passed: Pages/Blog detail and revisions, allowlisted CKAN/Scheming Markdown, CMS previews, and public editorial Markdown.\n",
);
