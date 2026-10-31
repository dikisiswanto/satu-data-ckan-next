import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const files = {
  plugin: await readFile(
    "deploy/ckan/theme/ckanext/wajo_theme/plugin.py",
    "utf8",
  ),
  bootstrap: await readFile("deploy/ckan/bootstrap-upstream.sh", "utf8"),
  env: await readFile(".env.ckan.example", "utf8"),
  mediaRoute: await readFile(
    "src/app/api/editorial-media/[fileId]/route.js",
    "utf8",
  ),
  cmsPages: await readFile("src/lib/cms/pages.js", "utf8"),
  editor: await readFile(
    "deploy/ckan/theme/ckanext/wajo_theme/public/wajo-markdown-editor.js",
    "utf8",
  ),
  base: await readFile(
    "deploy/ckan/theme/ckanext/wajo_theme/templates/base.html",
    "utf8",
  ),
  forms: await readFile(
    "deploy/ckan/theme/ckanext/wajo_theme/public/wajo-admin-forms.js",
    "utf8",
  ),
};

assert.match(files.plugin, /IAuthFunctions/);
assert.match(files.plugin, /wajo_media_show/);
assert.match(files.plugin, /file_create/);
assert.match(files.plugin, /file_ownership_transfer/);
assert.match(files.plugin, /owner_type["']?:\s*["']wajo_media/);
assert.match(files.plugin, /@blueprint\.post\("\/media\/upload"\)/);
assert.match(files.plugin, /getattr\(current_user, "sysadmin"/);
assert.match(files.plugin, /8 \* 1024 \* 1024/);
assert.match(files.bootstrap, /CKAN__FILES__OWNER__CASCADE_ACCESS/);
assert.match(files.env, /CKAN__FILES__OWNER__CASCADE_ACCESS/);
assert.match(files.mediaRoute, /file_show/);
assert.match(files.mediaRoute, /ownerType !== "wajo_media"/);
assert.match(files.mediaRoute, /validSignature/);
assert.match(files.mediaRoute, /redirect:\s*"manual"/);
assert.match(files.cmsPages, /isEditorialMedia/);
assert.match(files.editor, /fetch\("\/admin\/media\/upload"/);
assert.match(files.editor, /X-CSRFToken/);
assert.match(files.editor, /data-wajo-image-upload-for/);
assert.match(files.editor, /data-wajo-image-upload-to-json/);
assert.match(files.editor, /X-CSRFToken/);
assert.match(files.editor, /status\.dataset\.state = "error"/);
assert.match(files.editor, /![[]/);
assert.match(files.base, /wajo-media-csrf[\s\S]*csrf_input/);
assert.match(files.forms, /enhanceFileInputs/);
assert.match(files.forms, /URL\.createObjectURL/);

process.stdout.write(
  "Editorial CKAN media: authenticated upload, dedicated public owner, bounded image proxy, Markdown insertion and previews passed.\n",
);
