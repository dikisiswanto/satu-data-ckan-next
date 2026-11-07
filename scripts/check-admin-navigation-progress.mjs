#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const base = await readFile(
  "deploy/ckan/theme/ckanext/portal_theme/templates/base.html",
  "utf8",
);
const script = await readFile(
  "deploy/ckan/theme/ckanext/portal_theme/public/portal-admin-navigation-progress.js",
  "utf8",
);
const backToTop = await readFile(
  "deploy/ckan/theme/ckanext/portal_theme/public/portal-admin-back-to-top.js",
  "utf8",
);
const css = await readFile(
  "deploy/ckan/theme/ckanext/portal_theme/assets/css/portal-admin-design-system.css",
  "utf8",
);
const build = await readFile("scripts/check-build.py", "utf8");

assert.match(base, /portal-admin-navigation-progress\.js\?v=/);
assert.match(base, /portal-admin-back-to-top\.js\?v=/);
assert.match(script, /\.portal-admin-shell, \.portal-login-frame/);
assert.match(script, /event\.defaultPrevented/);
assert.match(script, /event\.metaKey/);
assert.match(script, /event\.ctrlKey/);
assert.match(script, /anchor\.hasAttribute\("download"\)/);
assert.match(script, /target\.origin !== window\.location\.origin/);
assert.match(
  script,
  /target\.pathname === window\.location\.pathname[\s\S]*?return false/,
);
assert.match(script, /data-no-navigation-progress/);
assert.match(script, /FALLBACK_MS = 12000/);
assert.match(css, /\.portal-admin-navigation-progress/);
assert.match(css, /pointer-events: none/);
assert.match(css, /prefers-reduced-motion: reduce/);
assert.match(backToTop, /\.portal-admin-shell/);
assert.match(backToTop, /aria-label/);
assert.match(backToTop, /window\.scrollTo\(/);
assert.match(backToTop, /prefers-reduced-motion: reduce/);
assert.match(build, /portal-admin-navigation-progress\.js/);

process.stdout.write(
  "CKAN admin navigation progress preserves native navigation, skips non-navigation actions, and respects reduced motion.\n",
);
