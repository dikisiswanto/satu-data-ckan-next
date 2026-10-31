import "server-only";
import { sanitizePublicSearchResult } from "@/lib/ckan/public-api-sanitize";

/**
 * CKAN 2.12 Action API client.
 * Public data objects are returned in CKAN's native shape
 * (Package, Resource and Organization), without a duplicate portal schema.
 */
const BASE = (
  process.env.CKAN_API_INTERNAL_URL || "http://ckan:5000/api/3/action"
).replace(/\/$/, "");
const TIMEOUT_MS = Math.min(
  Math.max(Number(process.env.CKAN_API_TIMEOUT_MS || 8000), 1000),
  30000,
);

export async function ckanAction(
  action,
  params = {},
  { revalidate = 60 } = {},
) {
  if (!/^[a-z][a-z0-9_]*$/.test(action))
    throw new TypeError("invalid_ckan_action");
  const url = new URL(`${BASE}/${action}`);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value) url.searchParams.append(key, String(item));
    } else if (typeof value === "object") {
      url.searchParams.set(key, JSON.stringify(value));
    } else {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next:
      revalidate > 0
        ? { revalidate, tags: ["ckan-public", `ckan-action:${action}`] }
        : undefined,
    cache: revalidate > 0 ? undefined : "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    const error = new Error(`ckan_http_${response.status}`);
    error.status = response.status;
    throw error;
  }
  const payload = await response.json();
  if (!payload || payload.success !== true) {
    const message = payload?.error?.message || `ckan_action_failed:${action}`;
    const type = String(payload?.error?.__type || "");
    const error = new Error(message);
    error.status = /not found/i.test(type)
      ? 404
      : /authori[sz]ation|not authori[sz]ed/i.test(type)
        ? 403
        : /validation/i.test(type)
          ? 400
          : 502;
    throw error;
  }
  return payload.result;
}

/** CKAN package_search using CKAN-native parameters and result objects. */
export async function searchPackages({
  q = "*:*",
  rows = 24,
  start = 0,
  sort = "metadata_modified desc",
  fq = [],
  facets = false,
} = {}) {
  const params = {
    q: String(q || "*:*"),
    rows: Math.min(
      Math.max(Number.isFinite(Number(rows)) ? Number(rows) : 24, 0),
      100,
    ),
    start: Math.min(Math.max(Number(start) || 0, 0), 1_000_000),
    sort,
    include_private: false,
  };
  if (fq.length) params.fq = fq;
  if (facets) {
    params["facet.field"] = [
      "groups",
      "organization",
      "res_format",
      "extras_portal_reference_period",
    ];
    params["facet.limit"] = 1000;
    params["facet.mincount"] = 1;
  }
  return sanitizePublicSearchResult(await ckanAction("package_search", params));
}

export function ckanPackageCategory(pkg = {}) {
  return (
    pkg.groups?.[0]?.title ||
    pkg.groups?.[0]?.display_name ||
    pkg.tags?.[0]?.display_name ||
    pkg.tags?.[0]?.name ||
    "Dataset publik"
  );
}

export function ckanResourceFormat(resource = {}) {
  const raw = resource.format || resource.mimetype || "";
  return String(raw).toLowerCase().replace(/^.*\//, "");
}

/** True for GeoJSON files, independent of service endpoint detection. */
export function isGeoJSONResource(resource = {}) {
  const formats = [resource.format, resource.mimetype, resource.mimetype_inner]
    .filter(Boolean)
    .map((value) => String(value).split(";", 1)[0].trim().toLowerCase());
  if (
    formats.some((value) => {
      const normalized = value.replace(/[^a-z0-9]/g, "");
      return (
        normalized === "geojson" ||
        value === "application/geo+json" ||
        value === "application/vnd.geo+json"
      );
    })
  )
    return true;

  const fileCandidates = [resource.name, resource.url]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase().split(/[?#]/, 1)[0]);
  return fileCandidates.some((value) => /\.geojson$/i.test(value));
}

/** True for service endpoints, which should be opened as services rather than labeled as file downloads. */
export function isGeospatialServiceResource(resource = {}) {
  const format = String(resource.format || resource.mimetype || "")
    .toLowerCase()
    .replace(/^.*\//, "");
  const normalizedFormat = format.replace(/[^a-z0-9]/g, "");
  if (["wms", "wfs", "wmts", "wcs", "arcgisrest"].includes(normalizedFormat))
    return true;
  if (String(resource.url_type || "").toLowerCase() === "api") return true;
  const url = String(resource.url || "");
  return /[?&](?:service|request)=?(?:wms|wfs|wmts|wcs|getcapabilities)\b/i.test(
    url,
  );
}

export function ckanResourceName(resource = {}) {
  return (
    resource.name || resource.description || resource.id || "Resource dataset"
  );
}

export function ckanExtraValues(pkg = {}) {
  const extras = Array.isArray(pkg.extras) ? pkg.extras : [];
  const fromExtras = Object.fromEntries(
    extras
      .filter((item) => item && typeof item.key === "string")
      .map((item) => [item.key, item.value]),
  );
  // Scheming can expose configured custom fields as first-class properties,
  // while core CKAN packages can still return them inside `extras`.
  const fromSchema = Object.fromEntries(
    Object.entries(pkg).filter(
      ([key, value]) =>
        key.startsWith("portal_") && value !== undefined && value !== null,
    ),
  );
  return { ...fromExtras, ...fromSchema };
}

export function ckanExtraValue(pkg = {}, keys = []) {
  const extras = ckanExtraValues(pkg);
  for (const key of keys) {
    const value = pkg?.[key] ?? extras[key];
    if (value !== undefined && value !== null && String(value).trim() !== "")
      return String(value);
  }
  return null;
}
