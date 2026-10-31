import "server-only";
import { cache } from "react";
import { ckanAction, searchPackages } from "@/lib/ckan/client";
import { sanitizePublicPackage } from "@/lib/ckan/public-api-sanitize";
import { normalizeCkanSessionCookieValue } from "@/lib/ckan/session";
import { resolveAuthorizedPackageResources } from "@/lib/ckan/viewer-package";
import { buildDatasetCatalogExclusionFilters } from "@/lib/data/portal-content-types";

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
const SEARCH_STOPWORDS_ID = new Set([
  "dan",
  "atau",
  "yang",
  "di",
  "ke",
  "dari",
  "untuk",
  "pada",
  "dengan",
  "sebagai",
  "dalam",
  "oleh",
  "adalah",
  "ini",
  "itu",
  "apa",
  "berapa",
  "dimana",
  "data",
]);

/**
 * Convert a natural-language portal query into a safe CKAN/Solr field query.
 * Each meaningful token can match independently (OR), across native CKAN
 * title, description, tags, organization, group and resource metadata fields.
 * Direct Action API clients can still use native CKAN `q` syntax themselves.
 */
export function buildPublicCatalogQuery(value) {
  const tokens =
    String(value || "")
      .normalize("NFKC")
      .match(/[\p{L}\p{N}]+/gu) || [];
  const uniqueTokens = [
    ...new Set(tokens.map((token) => token.toLocaleLowerCase("id-ID"))),
  ]
    .filter((token) => token.length > 1 && !SEARCH_STOPWORDS_ID.has(token))
    .slice(0, 12);
  if (!uniqueTokens.length) return "*:*";
  const fields = [
    "title",
    "notes",
    "tags",
    "organization",
    "groups",
    "res_name",
    "res_description",
  ];
  const clauses = uniqueTokens.map((token) => {
    const term = token.replace(/[\\"\^]/g, "\\$&");
    return `(${fields.map((field) => `${field}:"${term}"`).join(" OR ")})`;
  });
  return `(${clauses.join(" OR ")})`;
}

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
    ],
    sessionCookie,
    // Retain private resource candidates only for an authenticated search;
    // each is verified with resource_show below before reaching the page.
    includePrivateResources: Boolean(sessionCookie),
  });
  const searchRows = Array.isArray(result.results) ? result.results : [];
  const visibleRows = sessionCookie
    ? await Promise.all(
        searchRows.map((pkg) =>
          resolveAuthorizedPackageResources(pkg, sessionCookie),
        ),
      )
    : searchRows;
  return {
    // package_search returns CKAN Package dictionaries. Don't translate them
    // into synthetic `slug`, `published_at`, `dataset_resources`, or versions.
    data: visibleRows,
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
      fq: buildDatasetCatalogExclusionFilters(),
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
      (!authenticated && pkg?.private === true) ||
      (pkg?.state && pkg.state !== "active")
    )
      return null;
    // Never expose every private resource merely because a cookie exists.
    // Each private resource must independently pass CKAN resource_show for
    // this browser's signed session.
    const visiblePkg = await resolveAuthorizedPackageResources(
      pkg,
      sessionCookie,
    );
    return sanitizePublicPackage(visiblePkg, {
      includePrivateResources: authenticated,
    });
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
    });
    return { data: null, unavailable: true };
  }
}

export async function getPublicPortalStatsResult() {
  try {
    const indicatorTag = process.env.CKAN_INDICATOR_TAG || "portal-indikator";
    const [packages, organizations, indicators] = await Promise.all([
      ckanAction("package_search", {
        q: "*:*",
        rows: 0,
        fq: buildDatasetCatalogExclusionFilters(),
        include_private: false,
      }),
      ckanAction("organization_list", {
        all_fields: true,
        include_dataset_count: true,
        include_extras: false,
        include_users: false,
      }),
      ckanAction("package_search", {
        q: "*:*",
        rows: 0,
        fq: [`tags:${indicatorTag}`],
        include_private: false,
      }),
    ]);
    return {
      data: {
        datasets: Number(packages.count || 0),
        organizations: Array.isArray(organizations)
          ? organizations.filter((item) => item.state !== "deleted").length
          : 0,
        indicators: Number(indicators.count || 0),
      },
      unavailable: false,
    };
  } catch (error) {
    console.error("ckan_public_stats_failed", {
      status: error?.status || null,
    });
    return { data: null, unavailable: true };
  }
}

// Indicators are represented by tagged CKAN datasets and DataStore resources;
// this adapter builds only a page view model from CKAN-native records.
export { getPublishedIndicatorsResult } from "./public-indicators.js";
