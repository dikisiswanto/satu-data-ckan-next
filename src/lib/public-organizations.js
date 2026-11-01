function normalizeSearchValue(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("id-ID");
}

export const ORGANIZATION_CONTENT_TYPES = Object.freeze([
  "datasets",
  "indicators",
  "infographics",
  "publications",
]);

export function organizationContentCount(organization, kind) {
  if (!ORGANIZATION_CONTENT_TYPES.includes(kind)) return null;
  const counts = organization?.public_content_counts;
  const source =
    counts && Object.prototype.hasOwnProperty.call(counts, kind)
      ? counts[kind]
      : kind === "datasets" &&
          Object.prototype.hasOwnProperty.call(
            organization || {},
            "public_dataset_count",
          )
        ? organization.public_dataset_count
        : null;
  const count = Number(source);
  return source !== null && source !== undefined && Number.isFinite(count)
    ? Math.max(0, Math.trunc(count))
    : null;
}

export function organizationDatasetCount(organization) {
  return organizationContentCount(organization, "datasets");
}

export function organizationTotalContentCount(organization) {
  const counts = ORGANIZATION_CONTENT_TYPES.map((kind) =>
    organizationContentCount(organization, kind),
  );
  return counts.every((count) => count !== null)
    ? counts.reduce((total, count) => total + count, 0)
    : null;
}

/** Summarize public records by the catalog family that actually owns them. */
export function summarizePublicOrganizations(organizations = []) {
  const validOrganizations = Array.isArray(organizations) ? organizations : [];
  const totals = Object.fromEntries(
    ORGANIZATION_CONTENT_TYPES.map((kind) => {
      const counts = validOrganizations.map((organization) =>
        organizationContentCount(organization, kind),
      );
      return [
        kind,
        counts.every((count) => count !== null)
          ? counts.reduce((total, count) => total + count, 0)
          : null,
      ];
    }),
  );
  const knownOrganizationTotals = validOrganizations.map(
    organizationTotalContentCount,
  );
  return {
    organizations: validOrganizations.length,
    ...totals,
    totalPublicItems: knownOrganizationTotals.every((count) => count !== null)
      ? knownOrganizationTotals.reduce((total, count) => total + count, 0)
      : null,
    withContent: knownOrganizationTotals.every((count) => count !== null)
      ? knownOrganizationTotals.filter((count) => count > 0).length
      : null,
    withoutContent: knownOrganizationTotals.every((count) => count !== null)
      ? knownOrganizationTotals.filter((count) => count === 0).length
      : null,
    countsAvailable: knownOrganizationTotals.every((count) => count !== null),
  };
}

/** Filter and sort the public directory without mutating the CKAN response. */
export function filterAndSortPublicOrganizations(
  organizations = [],
  { query = "", sort = "name", contentState = "all", contentType = "all" } = {},
) {
  const source = Array.isArray(organizations) ? organizations : [];
  const terms = normalizeSearchValue(query).match(/[\p{L}\p{N}]+/gu) || [];
  const filtered = source.filter((organization) => {
    const total = organizationTotalContentCount(organization);
    if (contentState === "with-content" && !(total > 0)) return false;
    if (contentState === "without-content" && total !== 0) return false;
    if (
      contentType !== "all" &&
      !(organizationContentCount(organization, contentType) > 0)
    )
      return false;

    if (!terms.length) return true;
    const searchableTokens =
      normalizeSearchValue(
        [organization.title, organization.name, organization.description]
          .filter(Boolean)
          .join(" "),
      ).match(/[\p{L}\p{N}]+/gu) || [];
    return terms.every(
      (term) =>
        term.length > 1 &&
        searchableTokens.some((token) => token.startsWith(term)),
    );
  });

  const countForSort = (organization) => {
    if (sort === "datasets-desc" || sort === "datasets-asc")
      return organizationContentCount(organization, "datasets");
    if (sort === "indicators-desc" || sort === "indicators-asc")
      return organizationContentCount(organization, "indicators");
    if (sort === "infographics-desc" || sort === "infographics-asc")
      return organizationContentCount(organization, "infographics");
    if (sort === "publications-desc" || sort === "publications-asc")
      return organizationContentCount(organization, "publications");
    if (sort === "content-desc" || sort === "content-asc")
      return organizationTotalContentCount(organization);
    return null;
  };
  const ascending = /-asc$/.test(sort);
  return filtered.sort((left, right) => {
    const leftName = String(left.title || left.name || "");
    const rightName = String(right.title || right.name || "");
    const leftCount = countForSort(left);
    const rightCount = countForSort(right);
    if (leftCount !== null && rightCount !== null && leftCount !== rightCount) {
      return ascending ? leftCount - rightCount : rightCount - leftCount;
    }
    return leftName.localeCompare(rightName, "id-ID");
  });
}
