export const DATASET_VIEW_COOKIE_NAME = "portal_dataset_view";
export const LEGACY_DATASET_VIEW_COOKIE_NAME =
  process.env.NEXT_PUBLIC_LEGACY_DATASET_VIEW_COOKIE_NAME || "";
export const DATASET_VIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function normalizeDatasetView(value) {
  return value === "list" ? "list" : "cards";
}

export function getDatasetViewPreference(cookieStore) {
  const value =
    cookieStore?.get?.(DATASET_VIEW_COOKIE_NAME)?.value ??
    (LEGACY_DATASET_VIEW_COOKIE_NAME
      ? cookieStore?.get?.(LEGACY_DATASET_VIEW_COOKIE_NAME)?.value
      : undefined);
  return normalizeDatasetView(value);
}

export function getSafeDatasetReturnPath(value, requestUrl) {
  const fallback = "/dataset";
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;
  try {
    const target = new URL(value, requestUrl);
    const requestOrigin = new URL(requestUrl).origin;
    if (target.origin !== requestOrigin || target.pathname !== "/dataset")
      return fallback;
    // View mode belongs to the saved preference cookie, not the bookmark URL.
    // Strip legacy query values so the loading boundary cannot disagree with
    // the final page while honoring a stale `tampilan` parameter.
    const search = new URLSearchParams(target.search);
    search.delete("tampilan");
    const suffix = search.toString();
    return suffix ? `${target.pathname}?${suffix}` : target.pathname;
  } catch {
    return fallback;
  }
}
