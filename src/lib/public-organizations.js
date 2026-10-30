function normalizeSearchValue(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("id-ID");
}

function organizationDatasetCount(organization) {
  const count = Number(organization?.package_count || 0);
  return Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;
}

/** Summarize organization records returned by CKAN's organization_list action. */
export function summarizePublicOrganizations(organizations = []) {
  const validOrganizations = Array.isArray(organizations) ? organizations : [];
  return {
    organizations: validOrganizations.length,
    datasets: validOrganizations.reduce(
      (total, organization) => total + organizationDatasetCount(organization),
      0,
    ),
    withDatasets: validOrganizations.filter(
      (organization) => organizationDatasetCount(organization) > 0,
    ).length,
    withoutDatasets: validOrganizations.filter(
      (organization) => organizationDatasetCount(organization) === 0,
    ).length,
  };
}

/** Filter and sort the public directory without mutating the CKAN response. */
export function filterAndSortPublicOrganizations(
  organizations = [],
  { query = "", sort = "name", datasetState = "all" } = {},
) {
  const source = Array.isArray(organizations) ? organizations : [];
  const terms = normalizeSearchValue(query).match(/[\p{L}\p{N}]+/gu) || [];
  const filtered = source.filter((organization) => {
    const count = organizationDatasetCount(organization);
    if (datasetState === "with-data" && count === 0) return false;
    if (datasetState === "without-data" && count > 0) return false;

    if (!terms.length) return true;
    const searchableTokens =
      normalizeSearchValue(
        [organization.title, organization.name, organization.description]
          .filter(Boolean)
          .join(" "),
      ).match(/[\p{L}\p{N}]+/gu) || [];
    // Every query term must match a token (prefix matching is supported):
    // "dinas" must not accidentally match "koordinasi".
    return terms.every(
      (term) =>
        term.length > 1 &&
        searchableTokens.some((token) => token.startsWith(term)),
    );
  });

  return filtered.sort((left, right) => {
    const leftName = String(left.title || left.name || "");
    const rightName = String(right.title || right.name || "");
    if (sort === "datasets-desc") {
      return (
        organizationDatasetCount(right) - organizationDatasetCount(left) ||
        leftName.localeCompare(rightName, "id-ID")
      );
    }
    if (sort === "datasets-asc") {
      return (
        organizationDatasetCount(left) - organizationDatasetCount(right) ||
        leftName.localeCompare(rightName, "id-ID")
      );
    }
    return leftName.localeCompare(rightName, "id-ID");
  });
}

export { organizationDatasetCount };
