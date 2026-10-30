/**
 * Normalize CKAN `package_search` group facets for public category cards.
 * The count is the number of public datasets assigned to each CKAN group.
 */
export function normalizePublicCategoryFacets(categories = []) {
  if (!Array.isArray(categories)) return [];

  return categories
    .filter((category) => category && typeof category === "object")
    .map((category) => {
      const id = String(category.id || category.name || "").trim();
      const name = String(category.name || category.display_name || id).trim();
      const rawCount = Number(category.count);
      return {
        id,
        name,
        count: Number.isFinite(rawCount)
          ? Math.max(0, Math.trunc(rawCount))
          : 0,
      };
    })
    .filter(
      (category) => /^[a-z0-9][a-z0-9_-]*$/i.test(category.id) && category.name,
    )
    .sort(
      (left, right) =>
        right.count - left.count ||
        left.name.localeCompare(right.name, "id-ID"),
    );
}
