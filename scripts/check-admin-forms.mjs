import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const schema = await read(
  "deploy/ckan/theme/ckanext/wajo_theme/schemas/dataset.yaml",
);
const organizationSchema = await read(
  "deploy/ckan/theme/ckanext/wajo_theme/schemas/organization.yaml",
);
const groupSchema = await read(
  "deploy/ckan/theme/ckanext/wajo_theme/schemas/group.yaml",
);
const bootstrap = await read("deploy/ckan/bootstrap-upstream.sh");
const envTemplate = await read(".env.ckan.example");
const renderer = await read("deploy/ckan/render-upstream-env.py");
const configure = await read("deploy/ckan/configure-upstream-extensions.py");
const base = await read(
  "deploy/ckan/theme/ckanext/wajo_theme/templates/base.html",
);
const script = await read(
  "deploy/ckan/theme/ckanext/wajo_theme/public/wajo-admin-forms.js",
);
const publicIndicatorSource = await read("src/lib/data/public-indicators.js");
const publicInfographicSource = await read(
  "src/lib/data/public-infographics.js",
);
const publicPublicationSource = await read(
  "src/lib/data/public-publications.js",
);

assert.match(
  schema,
  /^dataset_type:\s*dataset/m,
  "Dataset package type must remain the CKAN-compatible `dataset`.",
);
assert.match(
  schema,
  /field_name:\s*portal_type[\s\S]{0,100}default:\s*dataset/,
  "New dataset forms should default to the `dataset` portal type.",
);
assert.match(
  schema,
  /field_name:\s*portal_resource_role[\s\S]{0,100}default:\s*data/,
  "New resource forms should default to the data role.",
);
for (const field of [
  "portal_definition",
  "portal_unit",
  "portal_formula",
  "portal_category",
  "portal_period",
  "portal_attribution",
]) {
  assert.ok(
    schema.includes(`field_name: ${field}`),
    `Dataset schema is missing ${field}.`,
  );
}
assert.match(
  organizationSchema,
  /^organization_type:\s*organization/m,
  "Organization schema must bind to the native organization entity type.",
);
assert.match(
  organizationSchema,
  /field_name:\s*image_url[\s\S]{0,140}preset:\s*organization_url_upload/,
  "Organization logo must use CKAN's native image_url upload field.",
);
assert.match(
  groupSchema,
  /field_name:\s*image_url[\s\S]{0,140}preset:\s*organization_url_upload/,
  "Thematic category image must use CKAN's native image_url upload field.",
);
assert.match(
  groupSchema,
  /^group_type:\s*group/m,
  "Group schema must bind to the native group entity type.",
);
for (const field of [
  "organization_code",
  "organization_category",
  "organization_website",
  "organization_contact_email",
  "organization_contact_phone",
]) {
  assert.ok(
    organizationSchema.includes(`field_name: ${field}`),
    `Organization form is missing ${field}.`,
  );
}
for (const field of ["portal_group_category", "portal_group_scope"]) {
  assert.ok(
    groupSchema.includes(`field_name: ${field}`),
    `Group form is missing ${field}.`,
  );
}

for (const [key, path] of [
  ["DATASET", "dataset.yaml"],
  ["ORGANIZATION", "organization.yaml"],
  ["GROUP", "group.yaml"],
]) {
  assert.ok(
    bootstrap.includes(`CKAN___SCHEMING__${key}_SCHEMAS`),
    `Bootstrap must configure ${key.toLowerCase()} schema.`,
  );
  assert.ok(
    envTemplate.includes(
      `CKAN___SCHEMING__${key}_SCHEMAS=ckanext.wajo_theme:schemas/${path}`,
    ),
    `Canonical environment must declare ${key.toLowerCase()} schema.`,
  );
  assert.ok(
    renderer.includes(`CKAN___SCHEMING__${key}_SCHEMAS`),
    `Filtered service env must validate ${key.toLowerCase()} schema.`,
  );
  assert.ok(
    configure.includes(`schemas/${path}`),
    `Build context must copy ${path}.`,
  );
}
for (const plugin of [
  "scheming_datasets",
  "scheming_organizations",
  "scheming_groups",
]) {
  assert.ok(
    bootstrap.includes(`"${plugin}"`),
    `Bootstrap must activate ${plugin}.`,
  );
}
assert.match(
  base,
  /<script defer src="\/wajo-admin-forms\.js"><\/script>/,
  "Admin conditional form script must load from CKAN extension public assets.",
);

const sandbox = {
  window: {},
  document: { readyState: "loading", addEventListener() {} },
};
vm.runInNewContext(script, sandbox, { filename: "wajo-admin-forms.js" });
const rules = sandbox.window.WajoAdminFormRules;
assert.ok(
  rules,
  "Conditional form rules must be exposed for deterministic validation.",
);
for (const [field, types] of Object.entries(rules.dataset)) {
  assert.ok(
    Array.isArray(types) && types.length > 0,
    `${field} must be associated with at least one portal type.`,
  );
}
for (const [field, roles] of Object.entries(rules.resource)) {
  assert.ok(
    Array.isArray(roles) && roles.length > 0,
    `${field} must be associated with at least one resource role.`,
  );
}
assert.ok(rules.dataset.portal_definition.includes("indikator"));
assert.ok(!rules.dataset.portal_definition.includes("dataset"));
assert.deepEqual(Array.from(rules.dataset.portal_category), [
  "infografik",
  "publikasi",
]);
assert.ok(rules.resource.portal_resource_period.includes("geospasial"));
assert.equal(rules.portalTypeTags.indikator, "portal-indikator");
assert.equal(rules.portalTypeTags.infografik, "portal-infografik");
assert.equal(rules.portalTypeTags.publikasi, "portal-publikasi");
assert.equal(
  rules.portalTypeTags.geospasial,
  undefined,
  "Geospatial resources are currently discoverable in the general dataset catalog and should not receive a fake FE category tag.",
);
assert.ok(publicIndicatorSource.includes('"portal-indikator"'));
assert.ok(publicInfographicSource.includes('"portal-infografik"'));
assert.ok(publicPublicationSource.includes('"portal-publikasi"'));
assert.ok(
  script.includes("portal-indikator") &&
    script.includes("portal-infografik") &&
    script.includes("portal-publikasi"),
  "Admin type selection must use the same public tags as the FE data queries.",
);
assert.equal(
  rules.resourceRoleConfig.infografik.accept,
  ".png,.jpg,.jpeg,.gif,.webp",
);
assert.ok(rules.portalTypeGuidance.geospasial.description.includes("GeoJSON"));
assert.ok(
  rules.portalTypeGuidance.geospasial.description.includes(
    "katalog dataset umum",
  ),
);

// Exercise initialization and change events without requiring a browser or jsdom.
const controls = new Map();
const wrappers = new Map();
const makeControl = (name, value, options = []) => {
  const listeners = new Map();
  const wrapper = {
    hidden: false,
    attributes: {},
    classes: new Set(),
    dataset: {},
    setAttribute(key, item) {
      this.attributes[key] = item;
    },
    classList: {
      toggle(key, active) {
        active ? wrapper.classes.add(key) : wrapper.classes.delete(key);
      },
    },
  };
  const control = {
    id: `field-${name}`,
    tagName: name === "tag_string" ? "INPUT" : "SELECT",
    value,
    dataset: {},
    options: options.map((option) => ({ value: option })),
    closest(selector) {
      return selector === ".control-group" ? wrapper : null;
    },
    addEventListener(type, callback) {
      listeners.set(type, callback);
    },
    dispatchEvent() {},
    setAttribute() {},
    removeAttribute() {},
    dispatch(type) {
      listeners.get(type)?.();
    },
  };
  controls.set(control.id, control);
  wrappers.set(name, wrapper);
  return control;
};
const liveDocument = {
  readyState: "complete",
  getElementById(id) {
    return controls.get(id) || null;
  },
  querySelector() {
    return null;
  },
  querySelectorAll() {
    return [];
  },
};
const liveWindow = { location: { pathname: "/dataset/new", search: "" } };
for (const field of Object.keys(rules.dataset)) makeControl(field, "");
for (const field of Object.keys(rules.resource)) makeControl(field, "");
const portalType = makeControl("portal_type", "", [
  "dataset",
  "indikator",
  "infografik",
  "publikasi",
  "geospasial",
]);
const resourceRole = makeControl("portal_resource_role", "", [
  "data",
  "sumber",
  "infografik",
  "publikasi",
  "metodologi",
  "geospasial",
]);
const tagString = makeControl("tag_string", "", []);
vm.runInNewContext(
  script,
  { window: liveWindow, document: liveDocument, URLSearchParams },
  { filename: "wajo-admin-forms-runtime.js" },
);
assert.equal(
  portalType.value,
  "dataset",
  "Dataset form should choose dataset automatically on a fresh record.",
);
assert.equal(
  resourceRole.value,
  "data",
  "Resource form should choose data automatically on a fresh record.",
);
assert.equal(
  wrappers.get("portal_definition").hidden,
  true,
  "Indicator definition must be hidden for regular datasets.",
);
assert.equal(
  wrappers.get("portal_reference_period").hidden,
  false,
  "Shared period metadata should be visible on regular datasets.",
);
portalType.value = "indikator";
portalType.dispatch("change");
assert.equal(
  wrappers.get("portal_definition").hidden,
  false,
  "Indicator definition must appear for indicator content.",
);
assert.equal(
  wrappers.get("portal_formula").hidden,
  false,
  "Indicator formula must appear for indicator content.",
);
assert.equal(
  wrappers.get("portal_category").hidden,
  true,
  "Infographic/publication categories must stay hidden for indicators.",
);
portalType.value = "infografik";
portalType.dispatch("change");
assert.equal(
  wrappers.get("portal_category").hidden,
  false,
  "Category must appear for infographics.",
);
assert.equal(
  wrappers.get("portal_definition").hidden,
  true,
  "Indicator-only fields must hide when switching to infographics.",
);
resourceRole.value = "sumber";
resourceRole.dispatch("change");
assert.equal(
  wrappers.get("portal_resource_period").hidden,
  true,
  "Resource period should hide for source-file role.",
);
assert.equal(
  wrappers.get("portal_resource_version").hidden,
  true,
  "Resource version should hide for source-file role.",
);
resourceRole.value = "data";
resourceRole.dispatch("change");
assert.equal(
  wrappers.get("portal_resource_period").hidden,
  false,
  "Resource period should reappear for structured data.",
);

// Dashboard deep links must override the generic Scheming default on create forms,
// and the system tag used by the public FE must follow the selected content type.
portalType.value = "dataset";
tagString.value = "kesehatan";
liveWindow.location = {
  pathname: "/dataset/new",
  search: "?portal_type=infografik",
};
vm.runInNewContext(
  script,
  { window: liveWindow, document: liveDocument, URLSearchParams },
  { filename: "wajo-admin-forms-prefill.js" },
);
assert.equal(
  portalType.value,
  "infografik",
  "An infographic create link must preselect the infographic content type.",
);
assert.equal(
  tagString.value,
  "kesehatan, portal-infografik",
  "Infographic must receive the public FE discovery tag automatically.",
);
portalType.value = "publikasi";
portalType.dispatch("change");
assert.equal(
  tagString.value,
  "kesehatan, portal-publikasi",
  "Changing content type must replace the previously managed public tag.",
);
portalType.value = "dataset";
portalType.dispatch("change");
assert.equal(
  tagString.value,
  "kesehatan",
  "Returning to a regular dataset must remove only the managed content tag.",
);
for (const [type, expectedTag] of [
  ["dataset", ""],
  ["indikator", "portal-indikator"],
  ["infografik", "portal-infografik"],
  ["publikasi", "portal-publikasi"],
  ["geospasial", ""],
]) {
  tagString.value = "topik-lain";
  tagString.dataset.wajoManagedPortalTag = "";
  portalType.value = "dataset";
  liveWindow.location = {
    pathname: "/dataset/new",
    search: `?portal_type=${type}`,
  };
  vm.runInNewContext(
    script,
    { window: liveWindow, document: liveDocument, URLSearchParams },
    { filename: `wajo-admin-prefill-${type}.js` },
  );
  assert.equal(
    portalType.value,
    type,
    `${type} shortcut must preselect its own content type.`,
  );
  assert.equal(
    tagString.value,
    expectedTag ? `topik-lain, ${expectedTag}` : "topik-lain",
    `${type} should maintain the matching public discovery tag without touching user tags.`,
  );
}
// Legacy FE records may have only a managed public tag and no portal_type extra.
tagString.value = "topik-lama, portal-infografik";
tagString.dataset.wajoManagedPortalTag = "";
portalType.value = "dataset";
liveWindow.location = { pathname: "/dataset/infografik-lama/edit", search: "" };
vm.runInNewContext(
  script,
  { window: liveWindow, document: liveDocument, URLSearchParams },
  { filename: "wajo-admin-legacy-tag-inference.js" },
);
assert.equal(
  portalType.value,
  "infografik",
  "Legacy infographic packages should infer their content type from the public tag on edit.",
);
assert.equal(
  tagString.value,
  "topik-lama, portal-infografik",
  "Opening an old edit form must not silently remove its FE discovery tag.",
);
portalType.value = "publikasi";
portalType.dispatch("change");
assert.equal(
  wrappers.get("portal_publication_date").hidden,
  false,
  "Publication date must be visible for publications.",
);
assert.equal(
  wrappers.get("portal_formula").hidden,
  true,
  "Indicator formula must stay hidden for publications.",
);
portalType.value = "geospasial";
portalType.dispatch("change");
assert.equal(
  wrappers.get("portal_geography").hidden,
  false,
  "Geospatial coverage must be visible for geospatial datasets.",
);
assert.equal(
  wrappers.get("portal_definition").hidden,
  true,
  "Indicator-only metadata must stay hidden for geospatial datasets.",
);

// A child resource inherits a sensible resource role from its parent dataset.
const resourceWindow = {
  location: { pathname: "/dataset/infografik-wajo/resource/new", search: "" },
};
const inheritedRole = {
  ...resourceRole,
  value: "data",
  dataset: {},
  options: resourceRole.options,
  addEventListener() {},
  closest: () => null,
};
const resourceDocument = {
  readyState: "complete",
  getElementById(id) {
    return id === "field-portal_resource_role" ? inheritedRole : null;
  },
  querySelector(selector) {
    return selector.includes("wajo-admin-shell")
      ? { dataset: { wajoPackagePortalType: "infografik" } }
      : null;
  },
  querySelectorAll() {
    return [];
  },
};
vm.runInNewContext(
  script,
  { window: resourceWindow, document: resourceDocument, URLSearchParams },
  { filename: "wajo-admin-resource-role.js" },
);
assert.equal(
  inheritedRole.value,
  "infografik",
  "A new resource under an infographic dataset should default to the infographic role.",
);

assert.equal(
  groupSchema.includes("field_name: portal_type"),
  false,
  "Thematic Group categories must not inherit the Dataset content-type selector.",
);
const groupControl = {
  id: "field-portal_group_category",
  closest: (selector) => (selector === "form" ? groupForm : null),
};
const groupChildren = [];
const groupForm = {
  dataset: {},
  querySelector: () => null,
  insertAdjacentElement(position, element) {
    groupChildren.push({ position, element });
  },
};
function makeNode(tagName) {
  return {
    tagName,
    children: [],
    attributes: {},
    className: "",
    textContent: "",
    dataset: {},
    setAttribute(key, value) {
      this.attributes[key] = value;
    },
    append(...nodes) {
      this.children.push(...nodes);
    },
  };
}
const groupDocument = {
  readyState: "complete",
  getElementById(id) {
    return id === groupControl.id ? groupControl : null;
  },
  querySelector() {
    return null;
  },
  querySelectorAll() {
    return [];
  },
  createElement: makeNode,
};
vm.runInNewContext(
  script,
  {
    window: { location: { pathname: "/group/new", search: "" } },
    document: groupDocument,
    URLSearchParams,
  },
  { filename: "wajo-admin-thematic-group.js" },
);
assert.equal(
  groupForm.dataset.wajoEntityForm,
  "thematic-category",
  "Group form should be clearly classified as a thematic category.",
);
assert.equal(
  groupChildren.length,
  1,
  "Thematic category form should receive one explanatory context panel.",
);
const categoryPanel = groupChildren[0].element;
assert.match(
  categoryPanel.children[1].textContent,
  /bukan tipe konten dataset/i,
  "Thematic category help must explain that a group is not a dataset content type.",
);
assert.equal(
  categoryPanel.children[2].children.length,
  4,
  "Thematic category form should offer direct create links for the portal content types.",
);
assert.ok(
  categoryPanel.children[2].children.every((link) =>
    link.href.startsWith("/dataset/new?portal_type="),
  ),
  "Category help links must open the correct dynamic dataset form.",
);
console.log(
  "Admin custom forms passed: content-type query defaults, FE discovery tags, dynamic field visibility, inherited resource roles, and distinct thematic Group behavior verified.",
);
