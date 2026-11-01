import "server-only";
import { cache } from "react";
import { ckanAction, searchPackages } from "@/lib/ckan/client";
import { sanitizePublicPackage } from "@/lib/ckan/public-api-sanitize";
import { isPrivateMarker } from "@/lib/ckan/privacy";
import { normalizeCkanSessionCookieValue } from "@/lib/ckan/session";
import {
  buildDatasetCatalogExclusionFilters,
  buildPortalContentDiscoveryFilter,
} from "@/lib/data/portal-content-types";
import { buildPublicCatalogQuery } from "@/lib/data/catalog-query";
export { buildPublicCatalogQuery } from "@/lib/data/catalog-query";

const safeLimit = (value, fallback = 24) =>
  Math.min(Math.max(Number(value) || fallback, 1), 100);
const safeSlug = (value) => {
  const slug = String(value ?? "")
    .trim()
    .slice(0, 100);
  return /^[a-z0-9][a-z0-9_-]*$/i.test(slug) ? slug : "";
};
const toPageMeta = (count, page, limit) => ({
  current_page: page,
  per_page: limit,
  total: count,
  last_page: Math.max(1, Math.ceil(count / limit)),
});
function buildCkanFilters({ organizationId, category, year, format }) {
  const filters = [];
  const organization = safeSlug(organizationId);
  const group = safeSlug(category);
  if (organization) filters.push(`organization:${organization}`);
  if (group) filters.push(`groups:${group}`);
  // Scheming stores portal fields as CKAN extras. Filter by the declared data
  // period rather than confusing a dataset's publication/update time with the
  // period represented by its contents.
  if (Number.isInteger(year) && year >= 1900 && year <= 2200) {
    filters.push(`extras_portal_reference_period:${year}`);
  }
  const normalizedFormat = String(format || "")
    .toUpperCase()
    .replace(/[^A-Z0-9.+_-]/g, "");
  if (normalizedFormat) filters.push(`res_format:${normalizedFormat}`);
  return filters;
}

async function queryPublishedDatasets(options = {}, sessionCookie = null) {
  const {
    query = "",
    limit = 24,
    organizationId = null,
    category = null,
    sort = "updated",
    year = null,
    format = null,
    offset = 0,
    page: requestedPage = null,
  } = options;
  const perPage = safeLimit(limit);
  const numericPage = Number(requestedPage);
  const page =
    Number.isSafeInteger(numericPage) && numericPage > 0
      ? numericPage
      : Math.floor(Math.max(0, Number(offset) || 0) / perPage) + 1;
  const order =
    sort === "title"
      ? "title_string asc"
      : sort === "relevance" && String(query).trim()
        ? "score desc, metadata_modified desc"
        : "metadata_modified desc";
  const result = await searchPackages({
    q: buildPublicCatalogQuery(
      String(query || "")
        .trim()
        .slice(0, 100),
    ),
    rows: perPage,
    start: (page - 1) * perPage,
    sort: order,
    fq: [
      ...buildDatasetCatalogExclusionFilters(),
      ...buildCkanFilters({ organizationId, category, year, format }),
    ].join(" AND "),
    sessionCookie,
  });
  const searchRows = Array.isArray(result.results) ? result.results : [];
  return {
    // CKAN package_search applies the logged-in user's dataset permissions.
    // Sanitize again at the data boundary so a future client refactor cannot
    // accidentally expose unsupported resource.private markers.
    data: searchRows.map((pkg) => sanitizePublicPackage(pkg)),
    meta: toPageMeta(Number(result.count || 0), page, perPage),
  };
}

export async function getPublishedDatasetsResult(
  options = {},
  rawSessionCookie = null,
) {
  const sessionCookie = normalizeCkanSessionCookieValue(rawSessionCookie);
  try {
    const result = await queryPublishedDatasets(options, sessionCookie);
    return { ...result, unavailable: false };
  } catch (error) {
    console.error("ckan_public_dataset_search_failed", {
      status: error?.status || null,
      detail: error?.detail || null,
    });
    return { data: [], meta: null, unavailable: true };
  }
}
export async function getPublishedDatasets(options = {}) {
  return (await getPublishedDatasetsResult(options)).data;
}

export async function getPublishedDatasetFacetsResult(rawSessionCookie = null) {
  const sessionCookie = normalizeCkanSessionCookieValue(rawSessionCookie);
  try {
    const result = await searchPackages({
      rows: 0,
      facets: true,
      fq: buildDatasetCatalogExclusionFilters().join(" AND "),
      sessionCookie,
    });
    const facets = result.search_facets || {};
    const categories = (facets.groups?.items || [])
      .map((item) => ({
        id: item.name,
        name: item.display_name || item.name,
        count: Number(item.count || 0),
      }))
      .filter((item) => item.id && item.name);
    const organizations = (facets.organization?.items || [])
      .map((item) => ({
        id: item.name,
        name: item.display_name || item.name,
      }))
      .filter((item) => item.id && item.name);
    // Offer period filters only for exact year values present in CKAN metadata.
    // A synthetic rolling year list invites users to select filters that return no data.
    const periodItems = facets.extras_portal_reference_period?.items || [];
    const years = [
      ...new Set(
        periodItems
          .map((item) => String(item.name || "").trim())
          .filter(
            (value) =>
              /^\d{4}$/.test(value) &&
              Number(value) >= 1900 &&
              Number(value) <= 2200,
          )
          .map(Number),
      ),
    ].sort((a, b) => b - a);
    return { data: { categories, organizations, years }, unavailable: false };
  } catch (error) {
    console.error("ckan_public_facets_failed", {
      status: error?.status || null,
      detail: error?.detail || null,
    });
    return {
      data: { categories: [], organizations: [], years: [] },
      unavailable: true,
    };
  }
}

async function queryPublishedDatasetBySlug(name, sessionCookie = null) {
  if (typeof name !== "string" || !/^[a-z0-9][a-z0-9_-]{0,99}$/i.test(name))
    return null;
  try {
    const authenticated = Boolean(sessionCookie);
    const pkg = await ckanAction(
      "package_show",
      { id: name },
      authenticated ? { revalidate: 0, sessionCookie } : {},
    );
    // For anonymous requests, private records remain invisible. For a request
    // carrying a signed CKAN session, successful package_show is the authority:
    // CKAN has already checked this user's organization/sysadmin permission.
    if (
      (!authenticated && isPrivateMarker(pkg?.private)) ||
      (pkg?.state && pkg.state !== "active")
    )
      return null;
    // CKAN core's resource_show inherits the parent dataset permission; it is
    // not a separate per-resource ACL. Hide any custom private marker until a
    // CKAN authorization plugin explicitly implements that feature.
    return sanitizePublicPackage(pkg);
  } catch (error) {
    if (error?.status === 403 || error?.status === 404) return null;
    throw error;
  }
}

const getCachedPublicDatasetBySlugResult = cache(
  async function getCachedPublicDatasetBySlugResult(name) {
    try {
      return {
        data: await queryPublishedDatasetBySlug(name),
        unavailable: false,
      };
    } catch (error) {
      console.error("ckan_public_dataset_detail_failed", {
        status: error?.status || null,
        detail: error?.detail || null,
      });
      return { data: null, unavailable: true };
    }
  },
);

export async function getPublishedDatasetBySlugResult(
  name,
  rawSessionCookie = null,
) {
  const sessionCookie = normalizeCkanSessionCookieValue(rawSessionCookie);
  // Never put authenticated/private dataset responses in a shared React cache.
  if (!sessionCookie) return getCachedPublicDatasetBySlugResult(name);
  try {
    return {
      data: await queryPublishedDatasetBySlug(name, sessionCookie),
      unavailable: false,
    };
  } catch (error) {
    console.error("ckan_authenticated_dataset_detail_failed", {
      status: error?.status || null,
      detail: error?.detail || null,
    });
    return { data: null, unavailable: true };
  }
}

async function countActivePublicResources() {
  const pageSize = 500;
  let offset = 0;
  let total = 0;
  let visibleCount = 0;

  do {
    const result = await ckanAction("resource_search", {
      // CKAN 2.12.1 resource_search does not expose `id` in
      // Resource.get_columns(). `url` is a required, non-nullable resource
      // column, so an empty substring matches every active public resource.
      query: "url:",
      limit: pageSize,
      offset,
    });
    const resources = Array.isArray(result?.results) ? result.results : [];
    total = Math.max(0, Number(result?.count || 0));
    visibleCount += resources.filter(
      (resource) =>
        resource &&
        (!resource.state || resource.state === "active") &&
        !isPrivateMarker(resource.private),
    ).length;
    if (!resources.length) break;
    offset += resources.length;
  } while (offset < total);

  return visibleCount;
}

export async function getPublicPortalStatsResult() {
  const requests = await Promise.allSettled([
    ckanAction("package_search", {
      q: "*:*",
      rows: 0,
      fq: buildDatasetCatalogExclusionFilters().join(" AND "),
      include_private: false,
    }),
    ckanAction("organization_list", {
      // Homepage only needs the active organization names for the count.
      // Avoid hydrating full metadata/package_count for every organization.
      all_fields: false,
      limit: 1000,
    }),
    ckanAction("package_search", {
      q: "*:*",
      rows: 0,
      fq: buildPortalContentDiscoveryFilter("indicator"),
      include_private: false,
    }),
    countActivePublicResources(),
  ]);

  const [packages, organizations, indicators, resources] = requests;
  const failed = requests.filter((result) => result.status === "rejected");
  const valueOrNull = (result, read) =>
    result.status === "fulfilled" ? read(result.value) : null;

  for (const [name, result] of [
    ["datasets", packages],
    ["organizations", organizations],
    ["indicators", indicators],
    ["resources", resources],
  ]) {
    if (result.status === "rejected") {
      console.error(`ckan_public_${name}_count_failed`, {
        status: result.reason?.status || null,
        detail: result.reason?.detail || null,
      });
    }
  }

  return {
    data: {
      datasets: valueOrNull(packages, (result) => Number(result.count || 0)),
      organizations: valueOrNull(organizations, (result) =>
        Array.isArray(result) ? result.length : null,
      ),
      indicators: valueOrNull(indicators, (result) =>
        Number(result.count || 0),
      ),
      resources: valueOrNull(resources, (result) => Number(result)),
    },
    // A single failing counter must not blank otherwise healthy homepage metrics.
    unavailable: failed.length === requests.length,
    partial: failed.length > 0,
  };
}

// Indicators are represented by tagged CKAN datasets and DataStore resources;
// this adapter builds only a page view model from CKAN-native records.
export { getPublishedIndicatorsResult } from "./public-indicators.js";
