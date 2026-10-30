/** Keep cache identity centralized so mutations invalidate consistent prefixes. */
export const portalQueryKeys = {
  root: ["portal"],
  dashboard: () => ["portal", "dashboard"],
  datasets: () => ["portal", "datasets"],
  dataset: (datasetId) => ["portal", "datasets", String(datasetId)],
  conversionStatus: (datasetId, version) => [
    "portal",
    "datasets",
    String(datasetId),
    "conversion-status",
    Number(version),
  ],
  indicators: () => ["portal", "indicators"],
  organizations: () => ["portal", "organizations"],
  memberships: () => ["portal", "memberships"],
};

export const publicQueryKeys = {
  root: ["public"],
  datasets: () => ["public", "datasets"],
  dataset: (slug) => ["public", "datasets", String(slug)],
  resourceRows: (slug, resourceId, page, limit = 10) => [
    "public",
    "datasets",
    String(slug),
    "resources",
    String(resourceId),
    "rows",
    { page: Number(page), limit: Number(limit) },
  ],
};
