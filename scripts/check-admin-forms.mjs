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
  /field_name:\s*url[\s\S]{0,120}preset:\s*organization_url_upload/,
  "Organization logo must use CKAN's native upload preset.",
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

// Exercise initialization and change events without requiring a browser or jsdom.
const controls = new Map();
const wrappers = new Map();
const makeControl = (name, value, options = []) => {
  const listeners = new Map();
  const wrapper = {
    hidden: false,
    attributes: {},
    classes: new Set(),
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
    value,
    options: options.map((option) => ({ value: option })),
    closest(selector) {
      return selector === ".control-group" ? wrapper : null;
    },
    addEventListener(type, callback) {
      listeners.set(type, callback);
    },
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
};
const liveWindow = {};
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
vm.runInNewContext(
  script,
  { window: liveWindow, document: liveDocument },
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
console.log(
  "Admin custom forms passed: dataset/resource fields are context-aware; organization and group schemas are separate; dataset API type stays compatible; default and change behavior verified.",
);
