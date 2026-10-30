import { createServer } from "node:http";

const PORT = Number(process.env.E2E_CKAN_PORT || 8010);
const now = "2026-10-29T00:00:00Z";
const packages = [
  {
    id: "package-sekolah",
    name: "data-sekolah-wajo",
    title: "Data Sekolah Kabupaten Wajo",
    notes: "Daftar sekolah dan satuan pendidikan di Kabupaten Wajo.",
    state: "active",
    private: false,
    metadata_created: "2026-01-01T00:00:00Z",
    metadata_modified: now,
    license_title: "Creative Commons Attribution",
    tags: [{ name: "pendidikan", display_name: "Pendidikan" }],
    groups: [{ name: "pendidikan", title: "Pendidikan" }],
    organization: {
      id: "org-bappeda",
      name: "bappeda-wajo",
      title: "Bappeda Wajo",
    },
    resources: [
      {
        id: "resource-sekolah",
        package_id: "package-sekolah",
        name: "Data Sekolah CSV",
        description: "Data tabular sekolah",
        format: "CSV",
        mimetype: "text/csv",
        url: "http://127.0.0.1:8010/files/data-sekolah.csv",
        state: "active",
        private: false,
        datastore_active: true,
      },
      {
        id: "resource-private-on-public-package",
        package_id: "package-sekolah",
        name: "Lampiran internal",
        description: "Tidak untuk publik",
        format: "CSV",
        mimetype: "text/csv",
        url: "http://ckan:5000/storage/internal.csv",
        state: "active",
        private: true,
        datastore_active: false,
      },
    ],
    extras: [{ key: "temporal_coverage", value: "2026" }],
  },
  {
    id: "package-ipm",
    name: "indikator-ipm",
    title: "Indeks Pembangunan Manusia",
    notes:
      "Indeks pembangunan manusia Kabupaten Wajo berdasarkan sumber statistik yang dikelola resmi.",
    state: "active",
    private: false,
    metadata_created: "2024-01-01T00:00:00Z",
    metadata_modified: now,
    tags: [
      { name: "portal-indikator", display_name: "portal-indikator" },
      { name: "pembangunan-manusia", display_name: "Pembangunan Manusia" },
    ],
    groups: [{ name: "sosial", title: "Sosial dan Kesejahteraan" }],
    organization: {
      id: "org-bappeda",
      name: "bappeda-wajo",
      title: "Bappeda Wajo",
    },
    extras: [
      { key: "portal_unit", value: "poin" },
      { key: "portal_periodicity", value: "Tahunan" },
      {
        key: "portal_definition",
        value:
          "Indeks gabungan untuk menggambarkan capaian pembangunan manusia.",
      },
      { key: "portal_formula", value: "Metodologi resmi penghitungan IPM." },
      { key: "portal_source", value: "BPS Kabupaten Wajo" },
      { key: "portal_geography", value: "Kabupaten Wajo" },
      { key: "portal_reference_period", value: "2024" },
    ],
    resources: [
      {
        id: "resource-ipm",
        package_id: "package-ipm",
        name: "Seri IPM",
        description: "Observasi IPM per tahun",
        format: "CSV",
        mimetype: "text/csv",
        url: "http://127.0.0.1:8010/files/ipm.csv",
        state: "active",
        private: false,
        datastore_active: true,
      },
    ],
  },
  {
    id: "package-publikasi",
    name: "publikasi-wajo-dalam-angka",
    title: "Kabupaten Wajo Dalam Angka 2025",
    notes:
      "Publikasi statistik tahunan Kabupaten Wajo dengan tabel indikator dan metodologi sumber.",
    state: "active",
    private: false,
    metadata_created: "2025-03-01T00:00:00Z",
    metadata_modified: now,
    version: "2025.1",
    tags: [
      { name: "portal-publikasi", display_name: "portal-publikasi" },
      { name: "statistik", display_name: "Statistik" },
    ],
    groups: [{ name: "publikasi", title: "Publikasi Statistik" }],
    organization: {
      id: "org-bappeda",
      name: "bappeda-wajo",
      title: "Bappeda Wajo",
    },
    extras: [
      { key: "portal_category", value: "Kabupaten Dalam Angka" },
      { key: "portal_reference_period", value: "2025" },
      { key: "portal_publication_date", value: "2025-03-01" },
      { key: "portal_version", value: "2025.1" },
      {
        key: "portal_revision_note",
        value: "Rilis pertama untuk periode 2025.",
      },
      {
        key: "portal_methodology",
        value: "Kompilasi data sektoral terverifikasi.",
      },
      { key: "portal_attribution", value: "Pemerintah Kabupaten Wajo" },
    ],
    resources: [
      {
        id: "resource-publikasi-pdf",
        package_id: "package-publikasi",
        name: "Wajo Dalam Angka 2025 PDF",
        description: "Buku statistik tahunan",
        format: "PDF",
        mimetype: "application/pdf",
        url: "https://files.example.test/wajo-dalam-angka-2025.pdf",
        state: "active",
        private: false,
        datastore_active: false,
      },
    ],
  },
  {
    id: "package-infografik",
    name: "infografik-stunting-wajo",
    title: "Infografik Stunting Kabupaten Wajo",
    notes: "Ringkasan visual data stunting Kabupaten Wajo.",
    state: "active",
    private: false,
    metadata_created: "2025-01-01T00:00:00Z",
    metadata_modified: now,
    tags: [
      { name: "portal-infografik", display_name: "portal-infografik" },
      { name: "kesehatan", display_name: "Kesehatan" },
    ],
    groups: [{ name: "kesehatan", title: "Kesehatan" }],
    organization: {
      id: "org-dinkes",
      name: "dinas-kesehatan",
      title: "Dinas Kesehatan Kabupaten Wajo",
    },
    extras: [
      { key: "portal_category", value: "Kesehatan" },
      { key: "portal_period", value: "2025" },
      { key: "portal_attribution", value: "Dinas Kesehatan Kabupaten Wajo" },
    ],
    resources: [
      {
        id: "resource-infografik-image",
        package_id: "package-infografik",
        name: "Infografik PNG",
        description: "Infografik utama stunting",
        format: "PNG",
        mimetype: "image/png",
        url: "https://images.example.test/stunting-wajo.png",
        state: "active",
        private: false,
        datastore_active: false,
      },
      {
        id: "resource-infografik-pdf",
        package_id: "package-infografik",
        name: "Laporan PDF",
        description: "Dokumen pendukung",
        format: "PDF",
        mimetype: "application/pdf",
        url: "https://files.example.test/stunting-wajo.pdf",
        state: "active",
        private: false,
        datastore_active: false,
      },
    ],
  },
  {
    id: "package-private",
    name: "internal-draft-dataset",
    title: "Dataset Internal Rahasia",
    notes: "Fixture internal yang tidak boleh terlihat pada API publik.",
    state: "active",
    private: true,
    metadata_created: "2026-02-01T00:00:00Z",
    metadata_modified: now,
    tags: [{ name: "internal", display_name: "Internal" }],
    groups: [{ name: "internal", title: "Internal" }],
    organization: {
      id: "org-bappeda",
      name: "bappeda-wajo",
      title: "Bappeda Wajo",
    },
    resources: [
      {
        id: "resource-private",
        package_id: "package-private",
        name: "Rahasia.csv",
        format: "CSV",
        url: "http://127.0.0.1:8010/dataset/internal-draft-dataset/resource/resource-private/download/rahasia.csv",
        state: "active",
        private: true,
        datastore_active: true,
      },
    ],
  },
];
const orgs = [
  {
    id: "org-bappeda",
    name: "bappeda-wajo",
    title: "Bappeda Wajo",
    state: "active",
    package_count: 2,
  },
  {
    id: "org-dinkes",
    name: "dinas-kesehatan",
    title: "Dinas Kesehatan Kabupaten Wajo",
    state: "active",
    package_count: 1,
  },
];
const indicatorRecords = [
  {
    _id: 1,
    period: "2021",
    region: "Kabupaten Wajo",
    value: 71.25,
    unit: "poin",
    source: "BPS Kabupaten Wajo",
  },
  {
    _id: 2,
    period: "2022",
    region: "Kabupaten Wajo",
    value: 72.01,
    unit: "poin",
    source: "BPS Kabupaten Wajo",
  },
  {
    _id: 3,
    period: "2023",
    region: "Kabupaten Wajo",
    value: 73.1,
    unit: "poin",
    source: "BPS Kabupaten Wajo",
  },
  {
    _id: 4,
    period: "2024",
    region: "Kabupaten Wajo",
    value: 74.02,
    unit: "poin",
    source: "BPS Kabupaten Wajo",
  },
];
const cmsPages = [
  {
    name: "tentang-satu-data",
    title: "Tentang Satu Data Wajo",
    page_type: "page",
    private: false,
    publish_date: "2026-10-01",
    content:
      "# Satu Data Wajo\n\nPortal ini menyediakan data resmi yang dapat ditemukan dan digunakan kembali.",
    excerpt: "Mengenal Portal Satu Data Kabupaten Wajo.",
    category: "Profil portal",
    template_type: "landing",
    featured: true,
    show_in_menu: true,
    menu_label: "Tentang",
    menu_order: "1",
    seo_title: "Tentang Portal Satu Data Wajo",
    seo_description: "Profil dan tujuan Portal Satu Data Kabupaten Wajo.",
    content_blocks: JSON.stringify([
      {
        type: "stats",
        title: "Prinsip layanan",
        items: [
          { label: "Sumber", value: "Resmi", source: "Pengelola portal" },
        ],
      },
      {
        type: "dataset_links",
        title: "Dataset contoh",
        items: [{ slug: "data-sekolah-wajo", label: "Lihat dataset sekolah" }],
      },
      {
        type: "cta",
        title: "Jelajahi katalog",
        description: "Temukan data publik Kabupaten Wajo.",
        label: "Buka katalog",
        href: "/dataset",
      },
    ]),
  },
  {
    name: "warta-data-wajo",
    title: "Warta Data Wajo",
    page_type: "blog",
    private: false,
    publish_date: "2026-10-28",
    content:
      "# Warta Data Wajo\n\nPengelola memperkenalkan pembaruan portal data daerah.",
    excerpt: "Pembaruan dan publikasi terbaru Portal Satu Data Wajo.",
    category: "Kabar portal",
    template_type: "article",
    featured: true,
    show_in_menu: false,
    menu_order: "99",
    og_image: "/uploads/page_images/cms-cover.png",
    seo_title: "Warta Data Wajo",
    seo_description: "Berita dan pembaruan data Kabupaten Wajo.",
    content_blocks: JSON.stringify([
      {
        type: "rich_text",
        title: "Catatan",
        markdown: "Konten ini bersumber dari CKAN Pages.",
      },
    ]),
  },
  {
    name: "artikel-terjadwal",
    title: "Artikel Terjadwal",
    page_type: "blog",
    private: false,
    publish_date: "2099-01-01",
    content: "Belum terbit.",
    excerpt: "Tidak boleh tampil sebelum tanggal publikasi.",
  },
  {
    name: "halaman-internal",
    title: "Halaman Internal",
    page_type: "page",
    private: true,
    publish_date: "2026-10-01",
    content: "Rahasia.",
    excerpt: "Konten internal.",
    og_image: "/uploads/page_images/private-doc.png",
  },
];

function readExtra(pkg, key) {
  const directKey = key.startsWith("extras_")
    ? key.slice("extras_".length)
    : key;
  return (
    pkg?.[directKey] ??
    pkg?.extras?.find((extra) => extra.key === directKey)?.value ??
    null
  );
}

function matchesFilter(pkg, filter) {
  if (!filter) return true;
  const tag = filter.match(/^tags:([a-z0-9_-]+)$/i);
  if (tag) return (pkg.tags || []).some((item) => item.name === tag[1]);

  const formats = filter.match(/^res_format:([a-z0-9.+_-]+)$/i);
  if (formats)
    return (pkg.resources || []).some(
      (resource) =>
        String(resource.format || "").toLowerCase() ===
        formats[1].toLowerCase(),
    );

  const referencePeriod = filter.match(
    /^extras_portal_reference_period:(\d{4})$/i,
  );
  if (referencePeriod)
    return (
      String(readExtra(pkg, "extras_portal_reference_period") || "") ===
      referencePeriod[1]
    );

  const modified = filter.match(/^metadata_modified:\[([^\]]+) TO \*\]$/i);
  if (modified) {
    const lowerBound = new Date(modified[1]);
    const modifiedAt = new Date(
      pkg.metadata_modified || pkg.metadata_created || 0,
    );
    return (
      !Number.isNaN(lowerBound.getTime()) &&
      !Number.isNaN(modifiedAt.getTime()) &&
      modifiedAt >= lowerBound
    );
  }

  const tokens = [
    ...filter.matchAll(/(-?)(organization|groups):([a-z0-9_-]+)/gi),
  ].map((match) => ({
    negative: Boolean(match[1]),
    field: match[2].toLowerCase(),
    value: match[3].toLowerCase(),
  }));
  if (!tokens.length) return true;
  const matches = tokens.map(({ field, value }) => {
    const candidates =
      field === "organization"
        ? [pkg.organization?.name, pkg.organization?.id]
        : (pkg.groups || []).map((group) => group.name);
    return candidates.some(
      (candidate) => String(candidate || "").toLowerCase() === value,
    );
  });
  if (filter.includes(" OR ") && tokens.every((token) => !token.negative))
    return matches.some(Boolean);
  return tokens.every((token, index) =>
    token.negative ? !matches[index] : matches[index],
  );
}

function sortPackages(items, sort = "metadata_modified desc") {
  const fields = String(sort || "metadata_modified desc")
    .split(",")
    .map((part) => {
      const [rawField, rawDirection] = part.trim().split(/\s+/);
      const field = rawField === "title_string" ? "title" : rawField;
      return {
        field,
        direction: rawDirection?.toLowerCase() === "asc" ? 1 : -1,
      };
    });
  return [...items].sort((left, right) => {
    for (const { field, direction } of fields) {
      const a = field === "score" ? 0 : (left[field] ?? "");
      const b = field === "score" ? 0 : (right[field] ?? "");
      const comparison =
        field === "metadata_modified" || field === "metadata_created"
          ? new Date(a).getTime() - new Date(b).getTime()
          : String(a).localeCompare(String(b), "id-ID", {
              sensitivity: "base",
              numeric: true,
            });
      if (comparison !== 0 && Number.isFinite(comparison))
        return comparison * direction;
    }
    return String(left.name).localeCompare(String(right.name));
  });
}

function buildFacets(items) {
  const countBy = (keyFor, labelFor = keyFor) => {
    const counts = new Map();
    for (const item of items) {
      const values = keyFor(item);
      for (const value of new Set(
        (Array.isArray(values) ? values : [values]).filter(Boolean),
      )) {
        counts.set(value, (counts.get(value) || 0) + 1);
      }
    }
    return [...counts.entries()].map(([name, count]) => ({
      name,
      display_name: labelFor(name),
      count,
    }));
  };
  return {
    groups: {
      items: countBy(
        (pkg) => (pkg.groups || []).map((group) => group.name),
        (name) => {
          for (const pkg of items)
            for (const group of pkg.groups || [])
              if (group.name === name) return group.title || name;
          return name;
        },
      ),
    },
    organization: {
      items: countBy(
        (pkg) => pkg.organization?.name,
        (name) => {
          for (const pkg of items)
            if (pkg.organization?.name === name)
              return pkg.organization.title || name;
          return name;
        },
      ),
    },
    res_format: {
      items: countBy((pkg) =>
        (pkg.resources || []).map((resource) =>
          String(resource.format || "").toUpperCase(),
        ),
      ),
    },
    extras_portal_reference_period: {
      items: countBy((pkg) =>
        String(readExtra(pkg, "extras_portal_reference_period") || "").trim(),
      ),
    },
  };
}

function actionResult(action, params) {
  switch (action) {
    case "status_show":
      return { ckan_version: "2.12.1" };
    case "ckanext_pages_list": {
      const pageType = params.get("page_type") || "page";
      const items = cmsPages.filter(
        (item) => item.private !== true && item.page_type === pageType,
      );
      if (params.get("order_publish_date") === "true")
        items.sort((left, right) =>
          String(right.publish_date || "").localeCompare(
            String(left.publish_date || ""),
          ),
        );
      return items;
    }
    case "ckanext_pages_show": {
      const page = cmsPages.find(
        (item) => item.name === params.get("page") && item.private !== true,
      );
      return page || { __not_found: true };
    }
    case "package_search": {
      let selected = packages.filter(
        (item) => item.state !== "deleted" && item.private !== true,
      );
      for (const filter of params.getAll("fq"))
        selected = selected.filter((item) => matchesFilter(item, filter));
      const q = params.get("q") || "*:*";
      if (q !== "*:*") {
        // Model the portal's OR-across-terms Solr query: any meaningful term may match
        // title, notes, tags, organization/group names or resource metadata.
        const fieldTerms = [
          ...q.matchAll(
            /(?:title|notes|tags|organization|groups|res_name|res_description):\"([^\"]+)\"/g,
          ),
        ].map((match) => match[1]);
        const terms = [
          ...new Set(
            fieldTerms.length
              ? fieldTerms
              : (q.match(/[\p{L}\p{N}]+/gu) || []).filter(
                  (word) => word.toLowerCase() !== "or",
                ),
          ),
        ].map((word) => word.toLocaleLowerCase("id-ID"));
        if (terms.length)
          selected = selected.filter((item) => {
            const searchable = [
              item.name,
              item.title,
              item.notes,
              item.organization?.name,
              item.organization?.title,
              ...(item.tags || []).map((tag) => tag.name),
              ...(item.groups || []).map((group) => group.name),
              ...(item.resources || []).flatMap((resource) => [
                resource.name,
                resource.description,
                resource.format,
              ]),
            ]
              .filter(Boolean)
              .join(" ")
              .toLocaleLowerCase("id-ID");
            return terms.some((term) => searchable.includes(term));
          });
      }
      selected = sortPackages(selected, params.get("sort"));
      const count = selected.length;
      const start = Number(params.get("start") || 0);
      const rows = Number(params.get("rows") ?? 20);
      return {
        count,
        results: selected.slice(start, start + rows),
        facets: {},
        search_facets: buildFacets(selected),
      };
    }
    case "package_show": {
      const id = params.get("id");
      const result = packages.find(
        (item) => item.name === id || item.id === id,
      );
      return result || { __not_found: true };
    }
    case "package_activity_list": {
      const id = params.get("id");
      const pkg = packages.find((item) => item.name === id || item.id === id);
      return pkg
        ? [
            {
              id: `activity-${pkg.name}`,
              activity_type: "changed package",
              timestamp: pkg.metadata_modified,
              user: "admin-data",
              user_id: "internal-user-id",
              ...(params.get("include_data") === "true"
                ? { data: { package: { name: pkg.name, title: pkg.title } } }
                : {}),
            },
          ]
        : { __not_found: true };
    }
    case "organization_list":
      return orgs;
    case "organization_show":
      return (
        orgs.find(
          (item) =>
            item.name === params.get("id") || item.id === params.get("id"),
        ) || { __not_found: true }
      );
    case "group_list":
      return [
        { name: "pendidikan", title: "Pendidikan" },
        { name: "kesehatan", title: "Kesehatan" },
      ];
    case "group_show":
      return (
        [
          { name: "pendidikan", title: "Pendidikan" },
          { name: "kesehatan", title: "Kesehatan" },
        ].find((item) => item.name === params.get("id")) || {
          __not_found: true,
        }
      );
    case "tag_list":
      return [
        ...new Set(
          packages
            .filter((item) => item.private !== true)
            .flatMap((item) => item.tags.map((tag) => tag.name)),
        ),
      ].filter(
        (tag) => !params.get("query") || tag.includes(params.get("query")),
      );
    case "resource_show":
    case "file_show":
      return (
        packages
          .filter(
            (item) =>
              item.private !== true || item.name === "internal-draft-dataset",
          )
          .flatMap((item) => item.resources)
          .find((item) => item.id === params.get("id")) || { __not_found: true }
      );
    case "datastore_search": {
      const id = params.get("resource_id");
      const rows =
        id === "resource-ipm"
          ? [...indicatorRecords]
          : id === "resource-sekolah"
            ? [
                {
                  _id: 1,
                  nama_sekolah: "SMP Negeri 1 Sengkang",
                  kecamatan: "Tempe",
                },
              ]
            : id === "resource-private"
              ? [{ _id: 1, catatan: "RAHASIA" }]
              : [];
      const sort = params.get("sort") || "";
      if (sort.includes("desc")) rows.reverse();
      const offset = Number(params.get("offset") || 0);
      const limit = Number(params.get("limit") || 10);
      return {
        fields: rows.length
          ? Object.keys(rows[0]).map((id) => ({
              id,
              type: typeof rows[0][id] === "number" ? "numeric" : "text",
            }))
          : [],
        records: rows.slice(offset, offset + limit),
        total: rows.length,
        offset,
        limit,
        resource_id: id,
      };
    }
    default:
      return { __not_found: true };
  }
}

const server = createServer((request, response) => {
  const url = new URL(
    request.url || "/",
    `http://${request.headers.host || "127.0.0.1"}`,
  );
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  if (url.pathname === "/health") {
    response
      .writeHead(200)
      .end(JSON.stringify({ status: "ok", ckan_version: "2.12.1" }));
    return;
  }
  if (url.pathname === "/uploads/page_images/cms-cover.png") {
    const image = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p2sAAAAASUVORK5CYII=",
      "base64",
    );
    response
      .writeHead(200, {
        "Content-Type": "image/png",
        "Content-Length": image.length,
        "Cache-Control": "no-store",
      })
      .end(image);
    return;
  }
  const match = url.pathname.match(/^\/api\/3\/action\/([a-z][a-z0-9_]*)$/);
  if (!match) {
    response
      .writeHead(404)
      .end(
        JSON.stringify({
          success: false,
          error: { message: "Not found", __type: "Not Found" },
        }),
      );
    return;
  }
  const action = match[1];
  const result = actionResult(action, url.searchParams);
  if (result?.__not_found) {
    response
      .writeHead(200)
      .end(
        JSON.stringify({
          success: false,
          error: { message: "Not found", __type: "Not Found" },
        }),
      );
    return;
  }
  response
    .writeHead(200)
    .end(
      JSON.stringify({
        help: `https://docs.ckan.org/en/2.12/api/index.html#${action}`,
        success: true,
        result,
      }),
    );
});
server.listen(PORT, "127.0.0.1", () =>
  process.stdout.write(`CKAN 2.12 E2E mock listening on 127.0.0.1:${PORT}\n`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close(() => process.exit(0)));
