/**
 * CKAN package records are the shared storage model, while portal_type and its
 * discovery tag decide which public-facing catalogue owns each record.
 * Keep these tags aligned with the CKAN admin form and the three dedicated
 * public adapters (indicators, infographics and publications).
 */
export const PORTAL_CONTENT_TAGS = Object.freeze({
  indicator: process.env.CKAN_INDICATOR_TAG || "portal-indikator",
  infographic: process.env.CKAN_INFOGRAPHIC_TAG || "portal-infografik",
  publication: process.env.CKAN_PUBLICATION_TAG || "portal-publikasi",
});

export const NON_GENERAL_DATASET_TYPES = Object.freeze([
  "indikator",
  "infografik",
  "publikasi",
]);

/**
 * Solr filters that keep portal editorial/analytic products out of the
 * ordinary dataset catalogue without deleting or duplicating their CKAN
 * package records. The explicit tag filters cover existing legacy records;
 * the portal_type filters cover records whose tags were not synchronized.
 */
export function buildDatasetCatalogExclusionFilters() {
  const tags = [...new Set(Object.values(PORTAL_CONTENT_TAGS).filter(Boolean))];
  return [
    ...tags.map((tag) => `-tags:${tag}`),
    ...NON_GENERAL_DATASET_TYPES.map((type) => `-extras_portal_type:${type}`),
  ];
}
