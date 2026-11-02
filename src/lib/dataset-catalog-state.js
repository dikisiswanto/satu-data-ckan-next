const FILTER_KEYS = new Set([
  "q",
  "kategori",
  "organisasi",
  "tahun",
  "format",
  "urut",
]);

/**
 * Build a stable dataset catalogue URL from normalized page state.
 * View mode is intentionally excluded: it lives in the HttpOnly preference
 * cookie so loading and final layouts always use the same source of truth.
 */
export function buildDatasetCatalogHref(
  state,
  { omit = [], pageNumber = 1 } = {},
) {
  const omitted = new Set(omit.filter((key) => FILTER_KEYS.has(key)));
  const search = new URLSearchParams();

  if (!omitted.has("q") && state.query) search.set("q", state.query);
  if (!omitted.has("kategori") && state.category)
    search.set("kategori", state.category);
  if (!omitted.has("organisasi") && state.organizationId)
    search.set("organisasi", state.organizationId);
  if (!omitted.has("tahun") && state.year)
    search.set("tahun", String(state.year));
  if (!omitted.has("format") && state.format)
    search.set("format", state.format);

  const queryRemains = Boolean(state.query) && !omitted.has("q");
  const sortCanApply =
    state.hasExplicitSort &&
    !omitted.has("urut") &&
    (state.sort !== "relevance" || queryRemains);
  if (sortCanApply) search.set("urut", state.sort);

  if (Number.isSafeInteger(pageNumber) && pageNumber > 1) {
    search.set("halaman", String(pageNumber));
  }

  const suffix = search.toString();
  return suffix ? `/dataset?${suffix}` : "/dataset";
}

export function buildDatasetClearFiltersHref(state) {
  return buildDatasetCatalogHref(state, {
    omit: ["kategori", "organisasi", "tahun", "format"],
  });
}
