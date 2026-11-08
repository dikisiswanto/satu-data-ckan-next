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
const apiDocs = readFileSync(path.join(root, "docs/PANDUAN-PORTAL.md"), "utf8");
const errors = [];

function extractSet(source, declaration, label) {
  const escaped = declaration.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(
    new RegExp(`const ${escaped} = new Set\\(\\[([\\s\\S]*?)\\]\\)`),
  );
  if (!match) {
    errors.push(`${label}: declaration not found.`);
    return [];
  }
  return [...match[1].matchAll(/[\"']([a-z_]+)[\"']/g)].map((item) => item[1]);
}

const routeActions = extractSet(apiRoute, "ACTIONS", "Public API allowlist");
const requiredActions = [
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
for (const action of requiredActions) {
  if (!routeActions.includes(action))
    errors.push(`Public API allowlist is missing ${action}.`);
}
if (new Set(routeActions).size !== routeActions.length)
  errors.push("Public API allowlist contains duplicate actions.");

const endpointBlock = apiPage.match(/const endpoints = \[([\s\S]*?)\n\];/);
const pageActions = endpointBlock
  ? [...endpointBlock[1].matchAll(/name:\s*[\"']([a-z_]+)[\"']/g)].map(
      (item) => item[1],
    )
  : [];
if (!endpointBlock) {
  errors.push("Public API page must define its endpoint collection.");
} else {
  const missing = routeActions.filter(
    (action) => !pageActions.includes(action),
  );
  const extra = pageActions.filter((action) => !routeActions.includes(action));
  if (missing.length || extra.length) {
    errors.push(
      `Public API page and route allowlist differ. Missing: ${missing.join(", ") || "-"}; extra: ${extra.join(", ") || "-"}.`,
    );
  }
  if (new Set(pageActions).size !== pageActions.length)
    errors.push("Public API page contains duplicate actions.");
}

const sensitiveActions = extractSet(
  apiRoute,
  "VISIBILITY_SENSITIVE_ACTIONS",
  "Visibility-sensitive action set",
);
for (const action of sensitiveActions) {
  if (!routeActions.includes(action))
    errors.push(
      `Visibility-sensitive action ${action} is not in the public allowlist.`,
    );
}
if (
  !apiRoute.includes('"Cache-Control"') ||
  !apiRoute.includes('"private, no-store"') ||
  !apiRoute.includes("revalidate: 0")
) {
  errors.push(
    "API implementation must disable caching for authenticated/visibility-sensitive records.",
  );
}
if (!apiRoute.includes("include_hidden_activity: false")) {
  errors.push(
    "Activity endpoint must exclude hidden activity at the server boundary.",
  );
}
if (apiRoute.includes('assert(["id", "include_data"])')) {
  errors.push(
    "Activity endpoint still accepts the unsupported include_data parameter.",
  );
}

const narrativeChecks = [
  ["quick-start guidance", /Mulai integrasi[\s\S]*Uji endpoint pencarian/],
  [
    "accurate validation example",
    /Parameter 'include_private' tidak tersedia pada API publik/,
  ],
  [
    "unsupported query syntax warning",
    /Gunakan \*:\* untuk mencari seluruh katalog[\s\S]*sintaks Solr\/Lucene lainnya tidak didukung/,
  ],
  [
    "CORS configuration explanation",
    /PUBLIC_API_CORS_ORIGINS[\s\S]*PUBLIC_SITE_ORIGIN[\s\S]*NEXT_PUBLIC_SITE_URL/,
  ],
  [
    "session-aware access explanation",
    /Tanpa sesi CKAN[\s\S]*sesi CKAN yang valid[\s\S]*izin akun tersebut/,
  ],
  [
    "read-only and cache guidance",
    /Hanya untuk membaca data[\s\S]*Cache-Control: no-store/,
  ],
  [
    "automatic portal tag guidance",
    /portal-indikator[\s\S]*ditambahkan otomatis[\s\S]*portal-infografik[\s\S]*ditambahkan otomatis[\s\S]*portal-publikasi[\s\S]*ditambahkan otomatis/,
  ],
];
for (const [label, pattern] of narrativeChecks) {
  if (!pattern.test(apiPage))
    errors.push(`Public API page is missing ${label}.`);
}
if (/Parameter 'q' tidak tersedia pada API publik/.test(apiPage)) {
  errors.push(
    "The API error example incorrectly identifies the valid package_search q parameter as unsupported.",
  );
}
if (!/\*:\*` didukung untuk pencarian seluruh katalog/.test(apiDocs)) {
  errors.push("docs/API.md must document the supported all-catalog q value.");
}
if (!/tag `portal-indikator` yang ditambahkan otomatis/.test(apiDocs)) {
  errors.push(
    "docs/API.md must explain that portal content tags are added by the CKAN form.",
  );
}
if (!/cookie sesi CKAN yang valid/.test(apiDocs)) {
  errors.push(
    "docs/API.md must explain that valid CKAN browser sessions are permission-checked by CKAN.",
  );
}
if (
  /package_search` tidak dapat memilih dataset privat melalui facade/.test(
    apiDocs,
  )
) {
  errors.push(
    "docs/API.md still describes package_search as never allowing permission-checked private records.",
  );
}

if (errors.length) {
  console.error(`Public API contract failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
process.stdout.write(
  `Public API contract passed: ${routeActions.length} route actions match the public page; parameter validation, session-aware visibility, CORS, cache policy, and narrative examples are checked.\n`,
);
