/**
 * Normalize CKAN `package_search` group facets for public category cards.
 * A facet count represents public datasets in a CKAN group. Duplicate aliases
 * are collapsed by normalized group ID or display name so the homepage never
 * renders the same category more than once.
 */
function categoryKey(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("id-ID")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizePublicCategoryFacets(categories = []) {
  if (!Array.isArray(categories)) return [];

  const candidates = categories
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
        idKey: categoryKey(id),
        nameKey: categoryKey(name),
      };
    })
    .filter(
      (category) =>
        /^[a-z0-9][a-z0-9_-]*$/i.test(category.id) &&
        category.name &&
        category.idKey &&
        category.nameKey,
    )
    .sort(
      (left, right) =>
        right.count - left.count ||
        left.name.localeCompare(right.name, "id-ID") ||
        left.id.localeCompare(right.id, "id-ID"),
    );

  const seenIds = new Set();
  const seenNames = new Set();
  const unique = [];
  for (const category of candidates) {
    if (seenIds.has(category.idKey) || seenNames.has(category.nameKey))
      continue;
    seenIds.add(category.idKey);
    seenNames.add(category.nameKey);
    const publicCategory = { ...category };
    delete publicCategory.idKey;
    delete publicCategory.nameKey;
    unique.push(publicCategory);
  }

  return unique.sort(
    (left, right) =>
      right.count - left.count || left.name.localeCompare(right.name, "id-ID"),
  );
}
