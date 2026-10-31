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

  // The public Next.js catalog discovers these packages by tag. Keep the
  // CKAN metadata selector and public-portal tag in sync from one mapping.
  const PORTAL_TYPE_TAGS = Object.freeze({
    indikator: "portal-indikator",
    infografik: "portal-infografik",
    publikasi: "portal-publikasi",
  });

  const PORTAL_TYPE_GUIDANCE = Object.freeze({
    dataset: {
      title: "Dataset umum",
      description:
        "Gunakan untuk kumpulan data yang tidak memerlukan metadata indikator, infografik, atau publikasi khusus.",
    },
    indikator: {
      title: "Indikator statistik",
      description:
        "Lengkapi definisi, satuan, rumus, metodologi, periode, dan cakupan wilayah. Tag portal-indikator akan ditambahkan otomatis agar tampil di halaman Statistik.",
    },
    infografik: {
      title: "Infografik",
      description:
        "Lengkapi kategori, periode, atribusi, dan resource gambar utama. Tag portal-infografik akan ditambahkan otomatis agar tampil di halaman Infografik.",
    },
    publikasi: {
      title: "Publikasi dan laporan",
      description:
        "Lengkapi tanggal rilis, penerbit, periode, lisensi, dan resource dokumen. Tag portal-publikasi akan ditambahkan otomatis agar tampil di halaman Publikasi.",
    },
    geospasial: {
      title: "Data geospasial",
      description:
        "Lengkapi periode, cakupan wilayah, metodologi, serta resource spasial seperti GeoJSON, GeoPackage, KML, atau SHP. Data ini tetap ditemukan melalui katalog dataset umum dan pratinjau spasial; belum ada tag listing geospasial khusus.",
    },
  });

  const RESOURCE_ROLE_CONFIG = Object.freeze({
    data: {
      title: "Data terstruktur",
      accept: ".csv,.tsv,.xls,.xlsx,.ods,.json,.parquet",
      description:
        "Untuk tabel data yang akan dipratinjau atau diproses DataStore/XLoader. Gunakan CSV, TSV, XLSX, ODS, JSON, atau Parquet.",
    },
    sumber: {
      title: "Berkas sumber",
      accept: "",
      description:
        "Berkas pendukung atau arsip sumber. Format tidak dibatasi oleh pilihan peran; tetap ikuti kebijakan jenis dan ukuran berkas server.",
    },
    infografik: {
      title: "Gambar atau infografik utama",
      accept: ".png,.jpg,.jpeg,.gif,.webp",
      description:
        "Unggah gambar utama dalam format PNG, JPEG, GIF, atau WebP. Sertakan atribusi dan sumber angka pada metadata dataset.",
    },
    publikasi: {
      title: "Publikasi atau laporan",
      accept: ".pdf,.doc,.docx,.xls,.xlsx,.csv,.ods",
      description:
        "Unggah dokumen publikasi atau lampiran data pendukung. PDF disarankan untuk dokumen final yang siap dibaca publik.",
    },
    metodologi: {
      title: "Metodologi atau dokumentasi",
      accept: ".pdf,.doc,.docx,.md,.txt",
      description:
        "Unggah metodologi, definisi operasional, pedoman, atau dokumentasi teknis yang menjelaskan data.",
    },
    geospasial: {
      title: "Data geospasial",
      accept: ".geojson,.json,.gpkg,.shp,.zip,.kml,.kmz,.csv",
      description:
        "Unggah GeoJSON, GeoPackage, KML/KMZ, SHP dalam ZIP, atau CSV dengan koordinat.",
    },
  });

  const WRAPPER_SELECTORS = [
    ".control-group",
    ".form-group",
    ".form-element",
    "fieldset",
  ];

  function fieldControl(fieldName) {
    return (
      document.getElementById(`field-${fieldName}`) ||
      document.querySelector(`[name="${fieldName}"]`)
    );
  }

  function fieldWrapper(fieldName) {
    const control = fieldControl(fieldName);
    if (!control) return null;
    for (const selector of WRAPPER_SELECTORS) {
      const wrapper = control.closest(selector);
      if (wrapper) return wrapper;
    }
    return control.parentElement?.parentElement || control.parentElement;
  }

  function setFieldVisibility(fieldName, visible, contentTypes = []) {
    const wrapper = fieldWrapper(fieldName);
    if (!wrapper) return;
    wrapper.hidden = !visible;
    wrapper.setAttribute("aria-hidden", String(!visible));
    wrapper.classList.toggle("wajo-form-field-hidden", !visible);
    wrapper.dataset.wajoContentTypes = contentTypes.join(" ");
  }

  function selectedValue(name, fallback) {
    const control = fieldControl(name);
    return String(control?.value || fallback || "")
      .trim()
      .toLowerCase();
  }

  function isNewDatasetForm() {
    return /\/dataset\/new\/?$/.test(window.location?.pathname || "");
  }

  function isNewResourceForm() {
    return /\/resource\/new\/?$/.test(window.location?.pathname || "");
  }

  function requestedPortalType() {
    try {
      const value = new URLSearchParams(window.location?.search || "").get(
        "portal_type",
      );
      return Object.hasOwn(PORTAL_TYPE_GUIDANCE, value) ? value : "";
    } catch {
      return "";
    }
  }

  function triggerControlEvents(control) {
    const EventConstructor = window.Event;
    if (typeof EventConstructor !== "function") return;
    control.dispatchEvent(new EventConstructor("input", { bubbles: true }));
    control.dispatchEvent(new EventConstructor("change", { bubbles: true }));
  }

  function readTagValues(control) {
    if (!control) return [];
    if (control.tagName === "SELECT" && control.multiple) {
      return Array.from(control.options || [])
        .filter((option) => option.selected)
        .map((option) => option.value);
    }
    return String(control.value || "")
      .split(/[,\n]/)
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  function writeTagValues(control, values) {
    if (!control) return;
    const unique = [
      ...new Map(values.map((tag) => [tag.toLowerCase(), tag])).values(),
    ];
    if (control.tagName === "SELECT" && control.multiple) {
      for (const option of Array.from(control.options || []))
        option.selected = unique.some((tag) => tag === option.value);
    } else {
      control.value = unique.join(", ");
    }
    triggerControlEvents(control);
  }

  function inferPortalTypeFromTags() {
    const tags = readTagValues(fieldControl("tag_string")).map((tag) =>
      tag.toLowerCase(),
    );
    for (const [type, tag] of Object.entries(PORTAL_TYPE_TAGS)) {
      if (tags.includes(tag.toLowerCase())) return type;
    }
    return "";
  }

  function syncPortalTypeTag(portalType) {
    const control = fieldControl("tag_string");
    if (!control) return;

    const previous = control.dataset.wajoManagedPortalTag || "";
    const next = PORTAL_TYPE_TAGS[portalType] || "";
    const values = readTagValues(control).filter((tag) => tag !== previous);
    if (next && !values.some((tag) => tag.toLowerCase() === next))
      values.push(next);
    writeTagValues(control, values);
    control.dataset.wajoManagedPortalTag = next;
  }

  function buildPortalTypeContext(_control) {
    const wrapper = fieldWrapper("portal_type");
    if (!wrapper || typeof document.createElement !== "function") return null;
    let panel = wrapper.nextElementSibling;
    if (panel?.classList?.contains("wajo-form-context")) return panel;

    panel = document.createElement("section");
    panel.className = "wajo-form-context";
    panel.setAttribute("role", "status");
    panel.setAttribute("aria-live", "polite");
    const icon = document.createElement("span");
    icon.className = "wajo-form-context__icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "◈";
    const copy = document.createElement("div");
    copy.className = "wajo-form-context__copy";
    const title = document.createElement("strong");
    const description = document.createElement("span");
    description.className = "wajo-form-context__description";
    const tag = document.createElement("code");
    tag.className = "wajo-form-context__tag";
    copy.append(title, description, tag);
    panel.append(icon, copy);
    wrapper.insertAdjacentElement("afterend", panel);
    panel._wajoTitle = title;
    panel._wajoDescription = description;
    panel._wajoTag = tag;
    return panel;
  }

  function updatePortalTypeContext(control, type) {
    const panel = buildPortalTypeContext(control);
    if (!panel) return;
    const guidance = PORTAL_TYPE_GUIDANCE[type] || PORTAL_TYPE_GUIDANCE.dataset;
    panel.dataset.type = type;
    panel._wajoTitle.textContent = guidance.title;
    panel._wajoDescription.textContent = guidance.description;
    const tag = PORTAL_TYPE_TAGS[type] || "";
    panel._wajoTag.textContent = tag
      ? `Tag portal otomatis: ${tag}`
      : "Tidak memerlukan tag khusus portal.";
    panel._wajoTag.hidden = !tag;
  }

  function bindConditionalFields(selectorName, fallback, rules, onUpdate) {
    const control = fieldControl(selectorName);
    if (!control) return false;

    if (!control.value && fallback && !control.disabled) {
      const hasFallback = Array.from(control.options || []).some(
        (option) => option.value === fallback,
      );
      if (hasFallback) control.value = fallback;
    }

    const update = () => {
      const value = selectedValue(selectorName, fallback);
      for (const [fieldName, allowedValues] of Object.entries(rules)) {
        setFieldVisibility(
          fieldName,
          allowedValues.includes(value),
          allowedValues,
        );
      }
      onUpdate?.(control, value);
    };

    control.addEventListener("change", update);
    update();
    return true;
  }

  function bindDatasetForm() {
    const control = fieldControl("portal_type");
    if (!control) return false;

    // Explicit dashboard/menu entry points may preselect a type. Generic
    // /dataset/new remains a regular dataset. Never override edit forms.
    const isNew = isNewDatasetForm();
    const requested = isNew ? requestedPortalType() : "";
    if (
      requested &&
      Array.from(control.options || []).some(
        (option) => option.value === requested,
      )
    ) {
      control.value = requested;
    } else if (!isNew) {
      // Older portal records may have the public discovery tag but no
      // portal_type extra yet. Infer the selector from that existing tag so
      // opening an edit form never silently removes content from the FE.
      const inferred = inferPortalTypeFromTags();
      if (
        inferred &&
        (!control.value || control.value === "dataset") &&
        Array.from(control.options || []).some(
          (option) => option.value === inferred,
        )
      ) {
        control.value = inferred;
      }
    }

    const update = (selector, type) => {
      selector.dataset.wajoPortalType = type;
      const tagControl = fieldControl("tag_string");
      if (tagControl && !tagControl.dataset.wajoManagedPortalTag) {
        const existing = readTagValues(tagControl).find((tag) =>
          Object.values(PORTAL_TYPE_TAGS).includes(tag),
        );
        if (existing) tagControl.dataset.wajoManagedPortalTag = existing;
      }
      syncPortalTypeTag(type);
      updatePortalTypeContext(selector, type);
      const form = selector.closest("form");
      if (form) form.dataset.wajoPortalType = type;
    };

    bindConditionalFields(
      "portal_type",
      "dataset",
      DATASET_FIELD_RULES,
      update,
    );
    const form =
      control.closest("form") ||
      document.querySelector(".wajo-admin-workspace form");
    if (form && !form.dataset.wajoPortalTypeSubmitBound) {
      form.dataset.wajoPortalTypeSubmitBound = "1";
      form.addEventListener("submit", () =>
        syncPortalTypeTag(selectedValue("portal_type", "dataset")),
      );
    }
    return true;
  }

  function enhanceGroupForm() {
    const categoryControl = fieldControl("portal_group_category");
    if (!categoryControl || fieldControl("portal_type")) return;
    const form =
      categoryControl.closest("form") ||
      document.querySelector(".wajo-admin-workspace form");
    if (!form || form.querySelector?.(".wajo-category-form-note")) return;

    const panel = document.createElement("section");
    panel.className = "wajo-category-form-note";
    panel.setAttribute("role", "note");
    const title = document.createElement("strong");
    title.textContent = "Kategori tematik";
    const description = document.createElement("p");
    description.textContent =
      "Form ini membuat kelompok kategori untuk mengelompokkan dataset berdasarkan tema atau wilayah. Kategori bukan tipe konten dataset. Untuk membuat indikator, infografik, publikasi, atau data geospasial, gunakan jenis konten berikut.";
    const links = document.createElement("div");
    links.className = "wajo-category-form-note__links";
    for (const [type, label] of [
      ["indikator", "Tambah indikator"],
      ["infografik", "Tambah infografik"],
      ["publikasi", "Tambah publikasi"],
      ["geospasial", "Tambah data geospasial"],
    ]) {
      const link = document.createElement("a");
      link.href = `/dataset/new?portal_type=${encodeURIComponent(type)}`;
      link.textContent = label;
      links.append(link);
    }
    panel.append(title, description, links);
    form.insertAdjacentElement("afterbegin", panel);
    form.dataset.wajoEntityForm = "thematic-category";
  }

  function packagePortalType() {
    const shell = document.querySelector(
      ".wajo-admin-shell[data-wajo-package-portal-type]",
    );
    return shell?.dataset.wajoPackagePortalType || "";
  }

  function buildResourceRoleHint() {
    const wrapper = fieldWrapper("portal_resource_role");
    if (!wrapper || typeof document.createElement !== "function") return null;
    let panel = wrapper.nextElementSibling;
    if (panel?.classList?.contains("wajo-resource-role-context")) return panel;
    panel = document.createElement("div");
    panel.className = "wajo-resource-role-context";
    panel.setAttribute("role", "status");
    panel.setAttribute("aria-live", "polite");
    const title = document.createElement("strong");
    const description = document.createElement("span");
    panel.append(title, description);
    wrapper.insertAdjacentElement("afterend", panel);
    panel._wajoTitle = title;
    panel._wajoDescription = description;
    return panel;
  }

  function updateResourceRole(role) {
    const config = RESOURCE_ROLE_CONFIG[role] || RESOURCE_ROLE_CONFIG.data;
    const panel = buildResourceRoleHint();
    if (panel) {
      panel.dataset.role = role;
      panel._wajoTitle.textContent = config.title;
      panel._wajoDescription.textContent = config.description;
    }
    document
      .querySelectorAll(".wajo-admin-workspace input[type='file']")
      .forEach((input) => {
        if (config.accept) input.setAttribute("accept", config.accept);
        else input.removeAttribute("accept");
        input.dataset.wajoResourceRole = role;
      });
  }

  function bindResourceForm() {
    const control = fieldControl("portal_resource_role");
    if (!control) return false;

    if (isNewResourceForm()) {
      const parentType = packagePortalType();
      const roleByPackageType = {
        infografik: "infografik",
        publikasi: "publikasi",
        geospasial: "geospasial",
        dataset: "data",
        indikator: "data",
      };
      const suggested = roleByPackageType[parentType];
      if (suggested && (control.value === "" || control.value === "data")) {
        if (
          Array.from(control.options || []).some(
            (option) => option.value === suggested,
          )
        )
          control.value = suggested;
      }
    }

    bindConditionalFields(
      "portal_resource_role",
      "data",
      RESOURCE_FIELD_RULES,
      (_selector, role) => updateResourceRole(role),
    );
    return true;
  }

  function enhanceFileInputs() {
    document
      .querySelectorAll(".wajo-admin-workspace input[type='file']")
      .forEach((input) => {
        if (input.dataset.wajoFileReady) return;
        input.dataset.wajoFileReady = "1";
        input.classList.add("wajo-file-input");
        const wrapper =
          fieldWrapper(input.id?.replace(/^field-/, "")) || input.parentElement;
        if (!wrapper) return;
        const imageUpload =
          /image/i.test(input.accept || "") ||
          /(?:image|logo|og_image)/i.test(
            `${input.name || ""} ${input.id || ""}`,
          );
        if (!imageUpload) return;

        const panel = document.createElement("div");
        panel.className = "wajo-file-preview";
        panel.hidden = true;
        panel.setAttribute("aria-live", "polite");
        const preview = document.createElement("img");
        preview.alt = "Pratinjau gambar yang dipilih";
        preview.hidden = true;
        const details = document.createElement("div");
        details.className = "wajo-file-preview__details";
        const filename = document.createElement("strong");
        const hint = document.createElement("span");
        hint.textContent = "Periksa pratinjau sebelum menyimpan formulir.";
        details.append(filename, hint);
        panel.append(preview, details);
        input.insertAdjacentElement("afterend", panel);

        let objectUrl = "";
        input.addEventListener("change", () => {
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          objectUrl = "";
          const file = input.files?.[0];
          if (!file) {
            panel.hidden = true;
            preview.hidden = true;
            filename.textContent = "";
            return;
          }
          filename.textContent = file.name;
          panel.hidden = false;
          preview.hidden = true;
          const isImage = /^image\/(?:png|jpeg|gif|webp)$/.test(file.type);
          const maxBytes = 5 * 1024 * 1024;
          if (!isImage || file.size > maxBytes) {
            hint.textContent =
              "Gambar harus PNG, JPEG, GIF, atau WebP dengan ukuran maksimal 5 MiB.";
            hint.classList.add("is-error");
            input.setCustomValidity(
              "Pilih PNG, JPEG, GIF, atau WebP maksimal 5 MiB.",
            );
            return;
          }
          hint.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MiB · Gambar siap diunggah saat formulir disimpan.`;
          hint.classList.remove("is-error");
          input.setCustomValidity("");
          objectUrl = URL.createObjectURL(file);
          preview.src = objectUrl;
          preview.hidden = false;
        });
      });
  }

  function init() {
    bindDatasetForm();
    bindResourceForm();
    enhanceGroupForm();
    enhanceFileInputs();
  }

  window.WajoAdminFormRules = Object.freeze({
    dataset: DATASET_FIELD_RULES,
    resource: RESOURCE_FIELD_RULES,
    portalTypeTags: PORTAL_TYPE_TAGS,
    portalTypeGuidance: PORTAL_TYPE_GUIDANCE,
    resourceRoleConfig: RESOURCE_ROLE_CONFIG,
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
