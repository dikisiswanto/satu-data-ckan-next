import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getPublicOrganizationImageUrl } from "../src/lib/ckan/public-media-url.js";
import { createCkanGroupMediaTarget } from "../src/lib/ckan/media-proxy.js";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const target = createCkanGroupMediaTarget(
  ["group", "logo-wajo_20261030.webp"],
  "http://ckan:5000/api/3/action",
);
assert.equal(
  target?.href,
  "http://ckan:5000/uploads/group/logo-wajo_20261030.webp",
);
assert.equal(
  createCkanGroupMediaTarget(["group", "../secret.png"], "http://ckan:5000"),
  null,
);
assert.equal(
  createCkanGroupMediaTarget(["resources", "dataset.xlsx"], "http://ckan:5000"),
  null,
);
assert.equal(
  createCkanGroupMediaTarget(["group", "payload.svg"], "http://ckan:5000"),
  null,
);
assert.equal(
  createCkanGroupMediaTarget(["group", "logo.png"], "file:///etc/passwd"),
  null,
);

assert.equal(
  getPublicOrganizationImageUrl({ image_url: "logo-wajo.webp" }),
  "/uploads/group/logo-wajo.webp",
);
assert.equal(
  getPublicOrganizationImageUrl({
    image_display_url: "https://data.example.go.id/uploads/group/logo.png",
  }),
  "/uploads/group/logo.png",
);
assert.equal(
  getPublicOrganizationImageUrl({ image_url: "/uploads/group/logo.jpg" }),
  "/uploads/group/logo.jpg",
);
assert.equal(
  getPublicOrganizationImageUrl({
    url: "https://data.example.go.id/uploads/group/legacy-logo.png",
  }),
  "/uploads/group/legacy-logo.png",
  "Legacy logo URLs previously stored in `url` should remain displayable.",
);
assert.equal(
  getPublicOrganizationImageUrl({ image_url: "javascript:alert(1)" }),
  null,
);
assert.equal(
  getPublicOrganizationImageUrl({
    image_url: "data:image/svg+xml;base64,PHN2Zz4=",
  }),
  null,
);
assert.equal(
  getPublicOrganizationImageUrl({
    image_url: "https://cdn.example.org/instansi/logo.png",
  }),
  "https://cdn.example.org/instansi/logo.png",
);

const organizationSchema = await read(
  "deploy/ckan/theme/ckanext/wajo_theme/schemas/organization.yaml",
);
const groupSchema = await read(
  "deploy/ckan/theme/ckanext/wajo_theme/schemas/group.yaml",
);
const organizationPage = await read(
  "src/app/(public)/organisasi/[slug]/page.jsx",
);
const organizationCard = await read(
  "src/components/organization-directory.jsx",
);
const mediaRoute = await read("src/app/uploads/[...path]/route.js");
const errorCss = await read(
  "deploy/ckan/theme/ckanext/wajo_theme/assets/css/wajo-admin-design-system.css",
);

assert.match(
  organizationSchema,
  /field_name:\s*image_url[\s\S]{0,160}preset:\s*organization_url_upload/,
);
assert.match(
  groupSchema,
  /field_name:\s*image_url[\s\S]{0,160}preset:\s*organization_url_upload/,
);
assert.match(mediaRoute, /createCkanGroupMediaTarget/);
assert.match(mediaRoute, /ALLOWED_IMAGE_TYPES/);
assert.match(organizationPage, /getPublicOrganizationImageUrl/);
assert.match(organizationCard, /getPublicOrganizationImageUrl/);
assert.match(
  errorCss,
  /control-group\.error[\s\S]*background:\s*transparent\s*!important/,
);
assert.match(errorCss, /#fff4f4[\s\S]*#7f1d1d/);
assert.match(
  errorCss,
  /input\[type="file"\]\.wajo-file-input:not\(\[hidden\]\)/,
  "Hidden media file pickers must remain hidden; only visible controls get file input styling.",
);

console.log(
  "Public CKAN media proxy, logo schema, and readable validation-state checks passed.",
);
