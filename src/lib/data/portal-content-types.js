/**
 * CKAN package records are the shared storage model, while portal_type and its
 * discovery tag decide which public-facing catalogue owns each record.
 * Keep these values aligned with the CKAN admin form and public adapters.
 */
export const PORTAL_CONTENT_TAGS = Object.freeze({
  indicator: process.env.CKAN_INDICATOR_TAG || "portal-indikator",
  infographic: process.env.CKAN_INFOGRAPHIC_TAG || "portal-infografik",
  publication: process.env.CKAN_PUBLICATION_TAG || "portal-publikasi",
});

export const PORTAL_CONTENT_TYPES = Object.freeze({
  indicator: "indikator",
  infographic: "infografik",
  publication: "publikasi",
});

export const NON_GENERAL_DATASET_TYPES = Object.freeze(
  Object.values(PORTAL_CONTENT_TYPES),
);

/** Build a validated CKAN organization filter shared by every public content type. */
export function buildOrganizationFilter(organizationId) {
  const organization = String(organizationId || "")
    .trim()
    .slice(0, 100);
  return /^[a-z0-9][a-z0-9_-]*$/i.test(organization)
    ? `organization:${organization}`
    : null;
}

/**
 * Match CKAN's own legacy tag-query handling: escape Solr metacharacters and
 * wrap the value as a quoted phrase. Tags such as `portal-indikator` contain
 * a hyphen, which Solr can otherwise interpret as query syntax.
 */
function solrPhrase(value) {
  const escaped = String(value).replace(/[\\+\-&|!(){}\[\]^"~*?:]/g, "\\$&");
  return `"${escaped}"`;
}

/**
 * Find a portal content record by discovery tag, Scheming's `portal_type`
 * extra, or CKAN's native custom dataset type. The OR is important for older
 * records whose tags were never synchronized when custom fields were introduced.
 */
export function buildPortalContentDiscoveryFilter(kind) {
  const tag = PORTAL_CONTENT_TAGS[kind];
  const type = PORTAL_CONTENT_TYPES[kind];
  if (!tag || !type) throw new TypeError(`unknown_portal_content_kind:${kind}`);
  return `(tags:${solrPhrase(tag)} OR extras_portal_type:${solrPhrase(type)} OR dataset_type:${solrPhrase(type)})`;
}

/**
 * Recognize both modern tagged records and legacy Scheming records that only
 * carry portal_type. `type` is included for installations using true CKAN
 * dataset-form types instead of the project's portal_type extra.
 */
export function isPortalContentPackage(pkg, kind) {
  const tag = PORTAL_CONTENT_TAGS[kind];
  const type = PORTAL_CONTENT_TYPES[kind];
  if (!tag || !type || !pkg || typeof pkg !== "object") return false;

  const hasTag = (pkg.tags || []).some(
    (item) => String(item?.name || item?.display_name || "").trim() === tag,
  );
  const extras = Array.isArray(pkg.extras) ? pkg.extras : [];
  const extraType =
    pkg.portal_type ??
    extras.find((item) => item?.key === "portal_type")?.value;
  const normalizedType = String(extraType || "")
    .trim()
    .toLowerCase();
  const datasetType = String(pkg.type || pkg.dataset_type || "")
    .trim()
    .toLowerCase();

  return hasTag || normalizedType === type || datasetType === type;
}

/**
 * A single positive-anchor filter excludes every editorial/analytic type from
 * the ordinary dataset catalogue. The `*:*` clause prevents each negative
 * clause from becoming a stand-alone negative-only Solr query.
 */
export function buildDatasetCatalogExclusionFilters() {
  const terms = [
    ...[...new Set(Object.values(PORTAL_CONTENT_TAGS).filter(Boolean))].map(
      (tag) => `-tags:${solrPhrase(tag)}`,
    ),
    ...NON_GENERAL_DATASET_TYPES.flatMap((type) => [
      `-extras_portal_type:${solrPhrase(type)}`,
      `-dataset_type:${solrPhrase(type)}`,
    ]),
  ];
  return terms.length ? [`(*:* AND ${terms.join(" AND ")})`] : [];
}
