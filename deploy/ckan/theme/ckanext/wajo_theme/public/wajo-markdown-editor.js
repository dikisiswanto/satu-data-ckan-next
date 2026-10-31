(() => {
  "use strict";

  const TARGETS = [
    "#field-content",
    "#field-notes",
    "#field-description",
    "#field-body",
    "#field-text",
    "textarea[name='content']",
    "textarea[name='notes']",
    "textarea[name='description']",
    "textarea[name='body']",
    "textarea[name='text']",
    "textarea[name='markdown']",
    "textarea[name='excerpt']",
    "textarea[name='seo_description']",
    "textarea[name='portal_revision_note']",
    "textarea[name='portal_methodology']",
    "textarea[name='portal_definition']",
    "textarea[name='portal_formula']",
  ];
  const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
  const ALLOWED_IMAGE_TYPES = new Set([
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
  ]);

  function safeUrl(value, image = false) {
    const candidate = String(value || "").trim();
    if (
      !candidate ||
      candidate.startsWith("//") ||
      candidate.startsWith("\\") ||
      /[\u0000-\u001f]/.test(candidate)
    )
      return "";
    if (candidate.startsWith("/") && !candidate.startsWith("/\\"))
      return candidate;
    try {
      const url = new URL(candidate, window.location.origin);
      if (url.username || url.password) return "";
      return ["https:"].includes(url.protocol) ||
        (!image && ["mailto:", "tel:"].includes(url.protocol))
        ? url.href
        : "";
    } catch {
      return "";
    }
  }

  function appendInline(parent, source) {
    const text = String(source || "");
    const tokenPattern =
      /(!?)\[([^\]]*)\]\((<[^>]+>|[^\s)]+)(?:\s+["']([^"']*)["'])?\)|`([^`]+)`|\*\*([^*]+)\*\*|~~([^~]+)~~|\*([^*]+)\*|_([^_]+)_|(https?:\/\/[^\s<>]+|www\.[^\s<>]+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})|( {2,}\n|\\\n)|<((?:https?:\/\/|mailto:)[^ >]+)>/gi;
    let cursor = 0;
    for (const match of text.matchAll(tokenPattern)) {
      const index = match.index ?? 0;
      if (index > cursor)
        parent.append(document.createTextNode(text.slice(cursor, index)));
      const rawHref = (match[3] || "").replace(/^<|>$/g, "");
      if (match[1] === "!") {
        const href = safeUrl(rawHref, true);
        if (href) {
          const image = document.createElement("img");
          image.src = href;
          image.alt = match[2] || "Ilustrasi konten";
          image.loading = "lazy";
          image.decoding = "async";
          image.className = "wajo-md-preview-image";
          if (match[4]) image.title = match[4];
          image.addEventListener(
            "error",
            () => {
              image.replaceWith(
                document.createTextNode(
                  `[Gambar tidak dapat dimuat: ${image.alt}]`,
                ),
              );
            },
            { once: true },
          );
          parent.append(image);
        } else parent.append(document.createTextNode(match[2]));
      } else if (match[2] !== undefined && match[3] !== undefined) {
        const href = safeUrl(rawHref);
        if (href) {
          const link = document.createElement("a");
          link.href = href;
          link.textContent = match[2];
          link.rel = "noopener noreferrer nofollow";
          if (href.startsWith("https:")) link.target = "_blank";
          if (match[4]) link.title = match[4];
          parent.append(link);
        } else parent.append(document.createTextNode(match[2]));
      } else if (match[5]) {
        const code = document.createElement("code");
        code.textContent = match[5];
        parent.append(code);
      } else if (match[6]) {
        const strong = document.createElement("strong");
        strong.textContent = match[6];
        parent.append(strong);
      } else if (match[7]) {
        const del = document.createElement("del");
        del.textContent = match[7];
        parent.append(del);
      } else if (match[8] || match[9]) {
        const em = document.createElement("em");
        em.textContent = match[8] || match[9];
        parent.append(em);
      } else if (match[11]) {
        parent.append(document.createElement("br"));
      } else if (match[12]) {
        const href = safeUrl(match[12]);
        if (href) {
          const link = document.createElement("a");
          link.href = href;
          link.textContent = match[12];
          link.target = "_blank";
          link.rel = "noopener noreferrer nofollow";
          parent.append(link);
        } else parent.append(document.createTextNode(match[12]));
      } else if (match[10]) {
        const value = match[10];
        const target = value.startsWith("www.")
          ? `https://${value}`
          : value.includes("@") && !value.includes("://")
            ? `mailto:${value}`
            : value;
        const href = safeUrl(target);
        if (href) {
          const link = document.createElement("a");
          link.href = href;
          link.textContent = value;
          link.target = "_blank";
          link.rel = "noopener noreferrer nofollow";
          parent.append(link);
        } else parent.append(document.createTextNode(value));
      }
      cursor = index + match[0].length;
    }
    if (cursor < text.length)
      parent.append(document.createTextNode(text.slice(cursor)));
  }

  function splitTableRow(line) {
    const value = line.trim().replace(/^\|/, "").replace(/\|$/, "");
    const cells = [];
    let cell = "";
    let escaped = false;
    for (const char of value) {
      if (escaped) {
        cell += char;
        escaped = false;
      } else if (char === "\\") escaped = true;
      else if (char === "|") {
        cells.push(cell.trim());
        cell = "";
      } else cell += char;
    }
    cells.push(cell.trim());
    return cells;
  }

  function normalizeReference(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function expandReferenceLinks(source) {
    const definitions = new Map();
    const retained = [];
    for (const line of String(source || "")
      .replace(/\r\n?/g, "\n")
      .split("\n")) {
      const match = line.match(
        /^ {0,3}\[([^\]]+)\]:\s*(?:<([^>]+)>|(\S+))(?:\s+["'(](.*?)["')])?\s*$/,
      );
      if (match)
        definitions.set(normalizeReference(match[1]), match[2] || match[3]);
      else retained.push(line);
    }
    if (!definitions.size) return retained.join("\n");
    return retained
      .map((line) =>
        line.replace(
          /(!?)\[([^\]]+)\](?:\[([^\]]*)\])?(?!\()/g,
          (match, image, label, reference) => {
            const href = definitions.get(
              normalizeReference(reference || label),
            );
            return href ? `${image}[${label}](<${href}>)` : match;
          },
        ),
      )
      .join("\n");
  }

  function renderMarkdown(source, parent, depth = 0) {
    if (depth > 8) {
      parent.textContent = String(source || "");
      return;
    }
    const lines = expandReferenceLinks(source).split("\n");
    let index = 0;
    while (index < lines.length) {
      const line = lines[index];
      if (!line.trim()) {
        index += 1;
        continue;
      }

      const fence = line.match(/^ {0,3}(`{3,}|~{3,})([^`]*)$/);
      if (fence) {
        const marker = fence[1];
        const code = [];
        index += 1;
        const closer = new RegExp(
          `^ {0,3}${marker[0]}{${marker.length},}\\s*$`,
        );
        while (index < lines.length && !closer.test(lines[index]))
          code.push(lines[index++]);
        if (index < lines.length) index += 1;
        const pre = document.createElement("pre");
        const element = document.createElement("code");
        const language = (fence[2] || "")
          .trim()
          .split(/\s+/, 1)[0]
          .slice(0, 32);
        if (language) element.dataset.language = language;
        element.textContent = code.join("\n");
        pre.append(element);
        parent.append(pre);
        continue;
      }

      const heading = line.match(/^ {0,3}(#{1,6})\s+(.+)$/);
      if (heading) {
        const h = document.createElement(`h${heading[1].length}`);
        appendInline(h, heading[2].replace(/\s+#+\s*$/, ""));
        parent.append(h);
        index += 1;
        continue;
      }
      if (
        index + 1 < lines.length &&
        /^ {0,3}(?:=+|-+)\s*$/.test(lines[index + 1]) &&
        line.trim()
      ) {
        const h = document.createElement(
          lines[index + 1].trim().startsWith("=") ? "h1" : "h2",
        );
        appendInline(h, line.trim());
        parent.append(h);
        index += 2;
        continue;
      }
      if (/^ {0,3}(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/.test(line)) {
        parent.append(document.createElement("hr"));
        index += 1;
        continue;
      }

      if (
        line.includes("|") &&
        index + 1 < lines.length &&
        splitTableRow(lines[index + 1]).every((cell) =>
          /^:?-{3,}:?$/.test(cell),
        )
      ) {
        const headers = splitTableRow(line);
        const divider = splitTableRow(lines[index + 1]);
        const table = document.createElement("table");
        table.className = "wajo-md-preview-table";
        const head = table.createTHead().insertRow();
        headers.forEach((cell, column) => {
          const th = document.createElement("th");
          th.scope = "col";
          th.style.textAlign = divider[column]?.startsWith(":")
            ? divider[column]?.endsWith(":")
              ? "center"
              : "left"
            : divider[column]?.endsWith(":")
              ? "right"
              : "left";
          appendInline(th, cell);
          head.append(th);
        });
        index += 2;
        while (
          index < lines.length &&
          lines[index].trim() &&
          lines[index].includes("|")
        ) {
          const cells = splitTableRow(lines[index++]);
          const row = table.tBodies[0] || table.createTBody();
          const tr = row.insertRow();
          headers.forEach((_, column) => {
            const td = tr.insertCell();
            td.style.textAlign = head.cells[column]?.style.textAlign || "left";
            appendInline(td, cells[column] || "");
          });
        }
        const wrap = document.createElement("div");
        wrap.className = "wajo-md-preview-scroll";
        wrap.append(table);
        parent.append(wrap);
        continue;
      }

      if (/^ {0,3}>/.test(line)) {
        const quote = [];
        while (index < lines.length && /^ {0,3}>/.test(lines[index]))
          quote.push(lines[index++].replace(/^ {0,3}> ?/, ""));
        const block = document.createElement("blockquote");
        renderMarkdown(quote.join("\n"), block, depth + 1);
        parent.append(block);
        continue;
      }

      const listStart = line.match(/^( *)([-+*]|\d+[.)])\s+(.*)$/);
      if (listStart) {
        const indent = listStart[1].length;
        const ordered = /^\d/.test(listStart[2]);
        const list = document.createElement(ordered ? "ol" : "ul");
        if (ordered && Number.parseInt(listStart[2], 10) > 1)
          list.start = Number.parseInt(listStart[2], 10);
        while (index < lines.length) {
          const item = lines[index].match(/^( *)([-+*]|\d+[.)])\s+(.*)$/);
          if (
            !item ||
            item[1].length !== indent ||
            /^\d/.test(item[2]) !== ordered
          )
            break;
          const rawItem = [item[3]];
          index += 1;
          // Preserve indented continuations and nested lists inside the item.
          while (index < lines.length) {
            const next = lines[index];
            if (!next.trim()) {
              if (
                index + 1 < lines.length &&
                lines[index + 1].match(/^( *)([-+*]|\d+[.)])\s+/)?.[1].length >
                  indent
              ) {
                rawItem.push("");
                index += 1;
                continue;
              }
              break;
            }
            const nextMarker = next.match(/^( *)([-+*]|\d+[.)])\s+/);
            const nextIndent = next.match(/^ */)[0].length;
            if (nextMarker && nextIndent <= indent) break;
            if (nextIndent > indent) {
              rawItem.push(next.slice(indent));
              index += 1;
              continue;
            }
            break;
          }
          const li = document.createElement("li");
          const task = rawItem[0].match(/^\[([ xX])\]\s+(.*)$/);
          if (task) {
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.disabled = true;
            checkbox.checked = /x/i.test(task[1]);
            li.append(checkbox, document.createTextNode(" "));
            rawItem[0] = task[2];
          }
          renderMarkdown(rawItem.join("\n"), li, depth + 1);
          list.append(li);
        }
        parent.append(list);
        continue;
      }

      if (/^(?: {4}|\t)/.test(line)) {
        const code = [];
        while (
          index < lines.length &&
          (/^(?: {4}|\t)/.test(lines[index]) || !lines[index].trim())
        )
          code.push(lines[index++].replace(/^(?: {4}|\t)/, ""));
        while (code.length && !code.at(-1)) code.pop();
        const pre = document.createElement("pre");
        pre.textContent = code.join("\n");
        parent.append(pre);
        continue;
      }

      const paragraph = [line.replace(/^ {0,3}/, "")];
      index += 1;
      while (
        index < lines.length &&
        lines[index].trim() &&
        !/^ {0,3}(?:#{1,6}\s|>|[-+*]\s|\d+[.)]\s|`{3,}|~{3,})/.test(
          lines[index],
        )
      )
        paragraph.push(lines[index++].replace(/^ {0,3}/, ""));
      const p = document.createElement("p");
      appendInline(p, paragraph.join("\n"));
      parent.append(p);
    }
  }

  function insert(textarea, before, after) {
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? start;
    const selected = textarea.value.slice(start, end) || "teks";
    textarea.setRangeText(`${before}${selected}${after}`, start, end, "select");
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.focus();
  }

  function preview(textarea, panel) {
    const fragment = document.createDocumentFragment();
    renderMarkdown(textarea.value, fragment);
    panel.replaceChildren(fragment);
  }

  async function uploadMediaFile(file, status, button) {
    if (
      !file ||
      !ALLOWED_IMAGE_TYPES.has(file.type) ||
      file.size > MAX_IMAGE_BYTES
    ) {
      status.dataset.state = "error";
      status.textContent = "Pilih PNG, JPEG, GIF, atau WebP maksimal 8 MiB.";
      return null;
    }
    const csrf = document.querySelector(
      "#wajo-media-csrf input[name='csrf_token'], #wajo-media-csrf input[name='_csrf_token'], input[name='csrf_token'], input[name='_csrf_token']",
    );
    if (!csrf?.value) {
      status.dataset.state = "error";
      status.textContent =
        "Token keamanan tidak tersedia. Muat ulang halaman admin.";
      return null;
    }
    const data = new FormData();
    data.append("upload", file, file.name);
    data.append(csrf.name, csrf.value);
    if (button) button.disabled = true;
    delete status.dataset.state;
    status.textContent = "Mengunggah gambar ke Pustaka Media CKAN…";
    try {
      const response = await fetch("/admin/media/upload", {
        method: "POST",
        body: data,
        credentials: "same-origin",
        headers: { Accept: "application/json", "X-CSRFToken": csrf.value },
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success !== true || !payload.url)
        throw new Error(payload.message || "Upload gambar gagal.");
      return payload;
    } catch (error) {
      status.dataset.state = "error";
      status.textContent =
        error?.message || "Upload gambar gagal. Periksa koneksi dan izin akun.";
      return null;
    } finally {
      if (button) button.disabled = false;
    }
  }

  function uploadImage(textarea, shell, panel, status) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/gif,image/webp";
    input.hidden = true;
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      const button = shell.querySelector("[data-wajo-upload]");
      const payload = await uploadMediaFile(file, status, button);
      if (payload) {
        const alt =
          file.name
            .replace(/\.[^.]+$/, "")
            .replace(/[\[\]\\]/g, " ")
            .trim() || "Ilustrasi";
        const markdown = `![${alt}](${payload.url})`;
        const start = textarea.selectionStart ?? textarea.value.length;
        textarea.setRangeText(
          `${start > 0 && textarea.value[start - 1] !== "\n" ? "\n" : ""}${markdown}\n`,
          start,
          textarea.selectionEnd ?? start,
          "end",
        );
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        status.textContent =
          "Gambar berhasil diunggah dan ditambahkan ke Markdown.";
        if (!panel.hidden) preview(textarea, panel);
      }
      input.value = "";
    });
    shell.append(input);
    return () => input.click();
  }

  function attachImageUrlUpload() {
    document
      .querySelectorAll("[data-wajo-image-upload-for]")
      .forEach((button) => {
        if (button.dataset.wajoImageUploadReady) return;
        const field = document.getElementById(
          button.dataset.wajoImageUploadFor,
        );
        if (!field) return;
        button.dataset.wajoImageUploadReady = "1";
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/png,image/jpeg,image/gif,image/webp";
        input.hidden = true;
        const panel = button.parentElement.querySelector(
          "[data-wajo-image-preview-panel]",
        );
        const image = panel?.querySelector("[data-wajo-image-preview]");
        const status =
          panel?.querySelector("[data-wajo-image-status]") ||
          document.createElement("p");
        const setPreview = (url) => {
          const safe = safeUrl(url, true);
          if (!panel || !image) return;
          panel.hidden = !safe;
          image.hidden = !safe;
          if (safe) image.src = safe;
        };
        if (image) {
          image.addEventListener("error", () => {
            image.hidden = true;
            if (status) {
              status.classList.add("is-error");
              status.textContent =
                "Pratinjau gambar gagal dimuat. Periksa kembali URL atau unggah ulang.";
            }
          });
          image.addEventListener("load", () => {
            if (status) status.classList.remove("is-error");
          });
        }
        if (field.value) setPreview(field.value);
        field.addEventListener("input", () => setPreview(field.value));
        input.addEventListener("change", async () => {
          const file = input.files?.[0];
          if (!file) return;
          if (panel) panel.hidden = false;
          const payload = await uploadMediaFile(file, status, button);
          if (payload) {
            field.value = payload.url;
            field.dispatchEvent(new Event("input", { bubbles: true }));
            field.dispatchEvent(new Event("change", { bubbles: true }));
            setPreview(payload.url);
            delete status.dataset.state;
            status.textContent =
              "Gambar berhasil diunggah. URL tersimpan pada formulir.";
          }
          input.value = "";
        });
        button.insertAdjacentElement("afterend", input);
        button.addEventListener("click", () => input.click());
      });

    document
      .querySelectorAll("[data-wajo-image-upload-to-json]")
      .forEach((button) => {
        if (button.dataset.wajoImageUploadReady) return;
        const field = document.getElementById(
          button.dataset.wajoImageUploadToJson,
        );
        if (!field) return;
        button.dataset.wajoImageUploadReady = "1";
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/png,image/jpeg,image/gif,image/webp";
        input.hidden = true;
        const status =
          button.parentElement.querySelector("[data-wajo-json-image-status]") ||
          document.createElement("p");
        input.addEventListener("change", async () => {
          const file = input.files?.[0];
          if (!file) return;
          let value;
          try {
            value = field.value.trim() ? JSON.parse(field.value) : [];
            if (!Array.isArray(value))
              throw new Error("Konten blok harus berupa JSON array.");
          } catch {
            status.dataset.state = "error";
            status.textContent =
              "Perbaiki JSON terlebih dahulu. Gambar belum diunggah agar tidak membuat berkas yatim.";
            input.value = "";
            return;
          }
          const payload = await uploadMediaFile(file, status, button);
          if (payload) {
            value.push({
              type: "image",
              src: payload.url,
              alt: file.name.replace(/\.[^.]+$/, ""),
            });
            field.value = JSON.stringify(value, null, 2);
            field.dispatchEvent(new Event("input", { bubbles: true }));
            delete status.dataset.state;
            status.textContent =
              "Gambar berhasil diunggah dan komponen image ditambahkan di akhir daftar.";
          }
          input.value = "";
        });
        button.insertAdjacentElement("afterend", input);
        button.addEventListener("click", () => input.click());
      });
  }

  function attach(textarea) {
    if (textarea.dataset.wajoMarkdownReady) return;
    textarea.dataset.wajoMarkdownReady = "1";
    const shell = document.createElement("section");
    shell.className = "wajo-md-editor";
    const toolbar = document.createElement("div");
    toolbar.className = "wajo-md-toolbar";
    toolbar.setAttribute("role", "toolbar");
    toolbar.setAttribute("aria-label", "Pemformatan Markdown");
    const actions = [
      ["Judul", "Heading", "## ", ""],
      ["Tebal", "Tebal", "**", "**"],
      ["Miring", "Miring", "*", "*"],
      ["Coret", "Strikethrough", "~~", "~~"],
      ["Tautan", "Tautan", "[", "](https://)"],
      ["Daftar", "Daftar berpoin", "- ", ""],
      ["Nomor", "Daftar bernomor", "1. ", ""],
      ["Tugas", "Daftar tugas", "- [ ] ", ""],
      ["Kutipan", "Kutipan", "> ", ""],
      [
        "Tabel",
        "Tabel",
        "| Kolom 1 | Kolom 2 |\n| --- | --- |\n| Isi | Isi |",
        "",
      ],
      ["Kode", "Blok kode", "```\n", "\n```"],
      ["Garis", "Garis pemisah", "\n---\n", ""],
    ];
    actions.forEach(([label, title, before, after]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn btn-default btn-sm";
      button.textContent = label;
      button.title = title;
      button.addEventListener("click", () => insert(textarea, before, after));
      toolbar.append(button);
    });
    const status = document.createElement("p");
    status.className = "wajo-md-status";
    status.setAttribute("aria-live", "polite");
    const previewButton = document.createElement("button");
    previewButton.type = "button";
    previewButton.className = "btn btn-primary btn-sm";
    previewButton.textContent = "Pratinjau";
    previewButton.setAttribute("aria-expanded", "false");
    const panel = document.createElement("div");
    panel.className = "wajo-md-preview";
    panel.hidden = true;
    previewButton.addEventListener("click", () => {
      const open = panel.hidden;
      panel.hidden = !open;
      previewButton.setAttribute("aria-expanded", String(open));
      previewButton.textContent = open ? "Kembali ke editor" : "Pratinjau";
      if (open) preview(textarea, panel);
    });
    const uploadButton = document.createElement("button");
    uploadButton.type = "button";
    uploadButton.className = "btn btn-secondary btn-sm";
    uploadButton.textContent = "Unggah gambar";
    uploadButton.dataset.wajoUpload = "true";
    uploadButton.addEventListener("click", () => upload());
    toolbar.append(uploadButton, previewButton);
    const upload = uploadImage(textarea, shell, panel, status);
    textarea.parentNode.insertBefore(shell, textarea);
    shell.append(toolbar, textarea, status, panel);
    textarea.classList.add("wajo-md-input");
    textarea.addEventListener("input", () => {
      if (!panel.hidden) preview(textarea, panel);
    });
    shell.addEventListener("dragover", (event) => {
      if (
        [...(event.dataTransfer?.items || [])].some(
          (item) => item.kind === "file",
        )
      ) {
        event.preventDefault();
        shell.classList.add("is-drop-target");
      }
    });
    shell.addEventListener("dragleave", (event) => {
      if (!shell.contains(event.relatedTarget))
        shell.classList.remove("is-drop-target");
    });
    shell.addEventListener("drop", (event) => {
      shell.classList.remove("is-drop-target");
      const file = event.dataTransfer?.files?.[0];
      if (file) {
        event.preventDefault();
        status.textContent = "Gunakan tombol Unggah gambar untuk memilih file.";
      }
    });
  }

  function init() {
    const candidates = TARGETS.flatMap((selector) =>
      Array.from(document.querySelectorAll(selector)),
    );
    [...new Set(candidates)]
      .filter((textarea) => textarea instanceof HTMLTextAreaElement)
      // Do not mount the Markdown toolbar inside CKAN's optional CKEditor instance.
      .filter(
        (textarea) =>
          !textarea.matches('[data-module~="ckedit"], #field-content-ck'),
      )
      .forEach((textarea) => {
        try {
          attach(textarea);
        } catch (error) {
          console.error("Wajo Markdown editor could not attach", error);
        }
      });
    attachImageUrlUpload();
  }

  function start() {
    init();
    // Pages/News extensions can insert their form fields after the first paint.
    // Observe additions so the preview controls are not silently missed.
    if (document.body && "MutationObserver" in window) {
      let queued = false;
      const observer = new MutationObserver(() => {
        if (queued) return;
        queued = true;
        queueMicrotask(() => {
          queued = false;
          init();
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
