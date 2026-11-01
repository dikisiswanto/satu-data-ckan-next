import "server-only";
import { sanitizePublicSearchResult } from "@/lib/ckan/public-api-sanitize";
import { buildCkanSessionCookieHeader } from "@/lib/ckan/session";

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
// Public read actions are cacheable because CKAN filters their result set by
// public permissions and every supported mutation sends the signed
// `ckan-public` invalidation webhook. Authenticated reads are always no-store.
// Actions that may expose private activity/file metadata remain uncached.
const NEVER_CACHE_ACTIONS = new Set(["package_activity_list", "file_show"]);
const DEFAULT_PUBLIC_FACET_FIELDS = Object.freeze([
  "groups",
  "organization",
  "res_format",
  "extras_portal_reference_period",
]);
const ALLOWED_FACET_FIELDS = new Set(DEFAULT_PUBLIC_FACET_FIELDS);

function normalizeFilterValues(value) {
  if (value === undefined || value === null || value === "") return [];
  const values = Array.isArray(value) ? value : [value];
  return values.map((item) => String(item ?? "").trim()).filter(Boolean);
}

/**
 * CKAN 2.12 PackageSearchQuery.run() treats fq as one string but extends fq
 * with fq_list. A string accidentally supplied as fq_list is therefore split
 * into individual characters. Normalize every package_search filter into one
 * scalar fq and never send fq_list over the wire.
 */
export function normalizeCkanActionParams(action, params = {}) {
  const normalized = { ...params };
  if (action !== "package_search") return normalized;

  const filters = [
    ...normalizeFilterValues(normalized.fq),
    ...normalizeFilterValues(normalized.fq_list),
  ];
  delete normalized.fq_list;
  if (filters.length) {
    normalized.fq =
      filters.length === 1
        ? filters[0]
        : filters.map((filter) => `(${filter})`).join(" AND ");
  } else {
    delete normalized.fq;
  }
  return normalized;
}

export async function ckanAction(
  action,
  params = {},
  { revalidate = 60, sessionCookie = null } = {},
) {
  if (!/^[a-z][a-z0-9_]*$/.test(action))
    throw new TypeError("invalid_ckan_action");
  const url = new URL(`${BASE}/${action}`);
  // Keep package_search on GET. CKAN's CSRF middleware protects unsafe
  // requests, so switching authenticated searches to JSON POST would require
  // forwarding a valid CSRF token. Preserve list parameters as repeated query
  // keys; CKAN 2.12.1 parses one occurrence as a scalar, therefore a single
  // facet.field value is repeated below to satisfy its list-valued schema.
  const actionParams = normalizeCkanActionParams(action, params);
  const entries = Object.entries(actionParams).filter(
    ([, value]) => value !== undefined && value !== null && value !== "",
  );
  const hasStructuredParams = entries.some(
    ([, value]) =>
      Array.isArray(value) || (typeof value === "object" && value !== null),
  );
  const useJsonBody = action !== "package_search" && hasStructuredParams;
  const headers = new Headers({ Accept: "application/json" });
  const requestInit = { signal: AbortSignal.timeout(TIMEOUT_MS) };
  if (useJsonBody) {
    headers.set("Content-Type", "application/json");
    requestInit.method = "POST";
    requestInit.body = JSON.stringify(Object.fromEntries(entries));
  } else {
    requestInit.method = "GET";
    for (const [key, value] of entries) {
      if (Array.isArray(value)) {
        const items = value.filter(
          (item) => item !== undefined && item !== null,
        );
        for (const item of items) url.searchParams.append(key, String(item));
        // CKAN 2.12.1 parses GET parameters with one occurrence as a scalar
        // and only turns repeated occurrences into a Python list. The
        // package_search schema requires facet.field to be a list, including
        // when requesting exactly one facet. Repeat that singleton so CKAN
        // receives ["organization"] instead of "organization". Duplicate
        // facet names are harmless to Solr and collapse to one result key.
        if (key === "facet.field" && items.length === 1) {
          url.searchParams.append(key, String(items[0]));
        }
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const forwardedSession = buildCkanSessionCookieHeader(sessionCookie);
  if (forwardedSession) headers.set("Cookie", forwardedSession);
  // Authenticated CKAN data must never enter Next's shared Data Cache, even
  // when a caller forgets to override the normal public revalidation period.
  const includePrivateValue =
    typeof params.include_private === "string"
      ? params.include_private.trim().toLowerCase()
      : params.include_private;
  const requestsPrivateRecords = [true, 1, "1", "true", "yes", "on"].includes(
    includePrivateValue,
  );
  const effectiveRevalidate =
    forwardedSession ||
    requestsPrivateRecords ||
    NEVER_CACHE_ACTIONS.has(action)
      ? 0
      : revalidate;

  const response = await fetch(url, {
    ...requestInit,
    headers,
    next:
      effectiveRevalidate > 0 && !useJsonBody
        ? {
            revalidate: effectiveRevalidate,
            tags: ["ckan-public", `ckan-action:${action}`],
          }
        : undefined,
    cache: effectiveRevalidate > 0 && !useJsonBody ? undefined : "no-store",
  });
  if (!response.ok) {
    // CKAN often returns a structured Action API error body with HTTP 409 for
    // Solr/SearchError. Preserve its short message for server logs so malformed
    // filters can be diagnosed without exposing request headers or cookies.
    const errorResponse = await response
      .clone()
      .text()
      .catch(() => "");
    let errorPayload = null;
    try {
      errorPayload = errorResponse ? JSON.parse(errorResponse) : null;
    } catch {
      // CKAN/Flask CSRF failures can return a plain-text or HTML 400 page
      // instead of an Action API JSON envelope. Keep a sanitized excerpt.
    }
    const rawDetail =
      typeof errorPayload?.error?.message === "string"
        ? errorPayload.error.message
        : errorResponse;
    const detail =
      String(rawDetail || "")
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<[^>]*>/g, " ")
        .replace(/&(?:nbsp|amp|lt|gt|quot);/gi, " ")
        .replace(/[\r\n\t]+/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim()
        .slice(0, 400) || null;
    const error = new Error(`ckan_http_${response.status}`);
    error.status = response.status;
    error.detail = detail;
    error.action = action;
    throw error;
  }
  const payload = await response.json();
  if (!payload || payload.success !== true) {
    const message = payload?.error?.message || `ckan_action_failed:${action}`;
    const type = String(payload?.error?.__type || "");
    const error = new Error(message);
    error.status = /not found/i.test(type)
      ? 404
      : /authori[szation]|not authori[sz]ed/i.test(type)
        ? 403
        : /validation/i.test(type)
          ? 400
          : 502;
    error.detail = String(message).slice(0, 400);
    error.action = action;
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
  fq = "",
  facets = false,
  facetFields = DEFAULT_PUBLIC_FACET_FIELDS,
  sessionCookie = null,
} = {}) {
  const params = {
    q: String(q || "*:*"),
    rows: Math.min(
      Math.max(Number.isFinite(Number(rows)) ? Number(rows) : 24, 0),
      100,
    ),
    start: Math.min(Math.max(Number(start) || 0, 0), 1_000_000),
    sort,
    // CKAN applies the current user's package authorization when private
    // records are requested. Anonymous searches remain strictly public.
    include_private: Boolean(sessionCookie),
  };
  // The public search contract is one scalar `fq`. Arrays supplied by callers
  // are safely combined before the Action API boundary; fq_list is normalized
  // only as a backwards-compatibility input inside ckanAction and never sent.
  const filterQueries = normalizeFilterValues(fq);
  if (filterQueries.length)
    params.fq =
      filterQueries.length === 1
        ? filterQueries[0]
        : filterQueries.map((filter) => `(${filter})`).join(" AND ");
  if (facets) {
    const requestedFields = Array.isArray(facetFields) ? facetFields : [];
    const fields = [
      ...new Set(
        requestedFields.filter((field) => ALLOWED_FACET_FIELDS.has(field)),
      ),
    ];
    params["facet.field"] = fields.length
      ? fields
      : [...DEFAULT_PUBLIC_FACET_FIELDS];
    params["facet.limit"] = 1000;
    params["facet.mincount"] = 1;
  }
  return sanitizePublicSearchResult(
    await ckanAction(
      "package_search",
      params,
      sessionCookie ? { revalidate: 0, sessionCookie } : {},
    ),
  );
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
