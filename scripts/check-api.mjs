import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const apiRoute = readFileSync(
  path.join(root, "src/app/api/3/action/[...action]/route.js"),
  "utf8",
);
const apiPage = readFileSync(
  path.join(root, "src/app/(public)/api-data/page.jsx"),
  "utf8",
);
const apiMarkdown = readFileSync(path.join(root, "docs/API.md"), "utf8");
const errors = [];

function extractActionNames(source, label) {
  const match = source.match(/const ACTIONS = new Set\(\[([\s\S]*?)\]\)/);
  if (!match) {
    errors.push(`${label}: daftar action tidak ditemukan.`);
    return [];
  }
  return [...match[1].matchAll(/"([a-z_]+)"/g)].map((item) => item[1]);
}

const routeActions = extractActionNames(apiRoute, "Route API");
const REQUIRED_ACTIONS = [
  "status_show",
  "package_search",
  "package_show",
  "package_activity_list",
  "organization_list",
  "organization_show",
  "group_list",
  "group_show",
  "tag_list",
  "resource_show",
  "file_show",
  "datastore_search",
];
for (const action of REQUIRED_ACTIONS) {
  if (!routeActions.includes(action)) {
    errors.push(
      `Route API: action publik wajib \`${action}\` hilang dari allowlist.`,
    );
  }
}
const endpointBlock = apiPage.match(/const endpoints = \[([\s\S]*?)\n\];/);
const pageActions = endpointBlock
  ? [...endpointBlock[1].matchAll(/name:\s*"([a-z_]+)"/g)].map(
      (item) => item[1],
    )
  : [];
const markdownActions = [...apiMarkdown.matchAll(/^\| `([a-z_]+)` \|/gm)].map(
  (item) => item[1],
);

if (!endpointBlock) errors.push("Laman API: daftar endpoint tidak ditemukan.");
for (const [label, actions] of [
  ["Laman API", pageActions],
  ["docs/API.md", markdownActions],
]) {
  const missing = routeActions.filter((action) => !actions.includes(action));
  const extra = actions.filter((action) => !routeActions.includes(action));
  if (missing.length || extra.length) {
    errors.push(
      `${label}: daftar action tidak sama dengan allowlist route. Tambahkan action yang hilang ke tabel/daftar endpoint dokumentasi dan hapus action yang sudah tidak diizinkan. Hilang: ${missing.join(", ") || "-"}; ekstra: ${extra.join(", ") || "-"}.`,
    );
  }
  if (new Set(actions).size !== actions.length)
    errors.push(`${label}: terdapat action duplikat.`);
}

const sensitiveBlock = apiRoute.match(
  /const VISIBILITY_SENSITIVE_ACTIONS = new Set\(\[([\s\S]*?)\]\)/,
);
const sensitiveActions = sensitiveBlock
  ? [...sensitiveBlock[1].matchAll(/"([a-z_]+)"/g)].map((item) => item[1])
  : [];
if (!sensitiveBlock)
  errors.push("Route API: daftar action no-store tidak ditemukan.");
for (const action of sensitiveActions) {
  if (!apiPage.includes(action) || !apiMarkdown.includes(action)) {
    errors.push(`Dokumentasi cache harus menyebut action no-store: ${action}.`);
  }
}
if (!apiPage.includes("no-store") || !apiMarkdown.includes("no-store")) {
  errors.push(
    "Laman API dan docs/API.md harus menjelaskan penggunaan no-store.",
  );
}
if (
  !apiPage.includes(
    "Ganti tanggal contoh dengan waktu UTC dari sinkronisasi terakhir yang berhasil",
  ) ||
  !apiMarkdown.includes(
    "checkpoint UTC dari sinkronisasi terakhir yang berhasil",
  )
) {
  errors.push(
    "Contoh harvesting harus menjelaskan bahwa tanggal tetap hanya contoh dan perlu diganti dengan checkpoint harvester.",
  );
}
if (
  !apiPage.includes("package_activity_list?id=nama-dataset&limit=8&offset=0") ||
  !apiMarkdown.includes(
    "package_activity_list?id=nama-dataset&limit=8&offset=0",
  ) ||
  !apiRoute.includes("include_hidden_activity: false")
) {
  errors.push(
    "package_activity_list harus memakai limit/offset dan memaksa include_hidden_activity=false pada server.",
  );
}
if (
  apiRoute.includes('assert(["id", "include_data"])') ||
  apiPage.includes("include_data=false") ||
  apiMarkdown.includes("include_data=false")
) {
  errors.push(
    "Kontrak package_activity_list masih memakai parameter include_data yang tidak valid untuk CKAN 2.12.",
  );
}

if (errors.length) {
  console.error(
    `Pemeriksaan konsistensi dokumentasi API gagal (${errors.length}):`,
  );
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
process.stdout.write(
  `API documentation consistency passed: ${routeActions.length} allowlisted actions (including all ${REQUIRED_ACTIONS.length} required actions) match the public API page and docs/API.md; visibility/cache rules, activity privacy, and harvesting checkpoint guidance align.\n`,
);
