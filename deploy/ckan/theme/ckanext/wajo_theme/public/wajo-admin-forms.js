(() => {
  "use strict";

  const DATASET_FIELD_RULES = {
    portal_reference_period: [
      "dataset",
      "indikator",
      "infografik",
      "publikasi",
      "geospasial",
    ],
    portal_data_start: ["dataset", "indikator", "geospasial"],
    portal_data_end: ["dataset", "indikator", "geospasial"],
    portal_periodicity: ["dataset", "indikator", "geospasial"],
    portal_update_frequency: ["dataset", "indikator", "geospasial"],
    portal_publication_date: ["publikasi"],
    portal_version: ["dataset", "indikator", "publikasi", "geospasial"],
    portal_revision_note: ["dataset", "indikator", "publikasi", "geospasial"],
    portal_methodology: ["dataset", "indikator", "geospasial"],
    portal_definition: ["indikator"],
    portal_unit: ["indikator"],
    portal_formula: ["indikator"],
    portal_source: [
      "dataset",
      "indikator",
      "infografik",
      "publikasi",
      "geospasial",
    ],
    portal_geography: ["dataset", "indikator", "infografik", "geospasial"],
    portal_category: ["infografik", "publikasi"],
    portal_period: ["infografik", "publikasi"],
    portal_attribution: ["infografik", "publikasi"],
  };

  const RESOURCE_FIELD_RULES = {
    portal_resource_period: ["data", "publikasi", "geospasial"],
    portal_resource_version: [
      "data",
      "infografik",
      "publikasi",
      "metodologi",
      "geospasial",
    ],
  };

  const WRAPPER_SELECTORS = [
    ".control-group",
    ".form-group",
    ".form-element",
    "fieldset",
  ];

  function fieldWrapper(fieldName) {
    const control =
      document.getElementById(`field-${fieldName}`) ||
      document.querySelector(`[name="${fieldName}"]`);
    if (!control) return null;

    for (const selector of WRAPPER_SELECTORS) {
      const wrapper = control.closest(selector);
      if (wrapper) return wrapper;
    }

    return control.parentElement?.parentElement || control.parentElement;
  }

  function setFieldVisibility(fieldName, visible) {
    const wrapper = fieldWrapper(fieldName);
    if (!wrapper) return;
    wrapper.hidden = !visible;
    wrapper.setAttribute("aria-hidden", String(!visible));
    wrapper.classList.toggle("wajo-form-field-hidden", !visible);
  }

  function selectedValue(name, fallback) {
    const control =
      document.getElementById(`field-${name}`) ||
      document.querySelector(`[name="${name}"]`);
    return String(control?.value || fallback || "")
      .trim()
      .toLowerCase();
  }

  function bindConditionalFields(selectorName, fallback, rules) {
    const control =
      document.getElementById(`field-${selectorName}`) ||
      document.querySelector(`[name="${selectorName}"]`);
    if (!control) return false;

    // CKAN's Scheming `default` remains authoritative. This fallback also covers
    // older existing records and create forms rendered without a selected value.
    if (!control.value && fallback && !control.disabled) {
      const hasFallback = Array.from(control.options || []).some(
        (option) => option.value === fallback,
      );
      if (hasFallback) control.value = fallback;
    }

    const update = () => {
      const value = selectedValue(selectorName, fallback);
      for (const [fieldName, allowedValues] of Object.entries(rules)) {
        setFieldVisibility(fieldName, allowedValues.includes(value));
      }
    };

    control.addEventListener("change", update);
    update();
    return true;
  }

  function init() {
    bindConditionalFields("portal_type", "dataset", DATASET_FIELD_RULES);
    bindConditionalFields("portal_resource_role", "data", RESOURCE_FIELD_RULES);
  }

  window.WajoAdminFormRules = Object.freeze({
    dataset: DATASET_FIELD_RULES,
    resource: RESOURCE_FIELD_RULES,
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
