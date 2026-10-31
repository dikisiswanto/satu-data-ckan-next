/**
 * Keep CKAN-native public responses useful without exposing separately private
 * resources or staff identifiers that are not needed by public consumers.
 */
export function sanitizePublicPackage(
  pkg,
  { includePrivateResources = false } = {},
) {
  if (!pkg || typeof pkg !== "object" || Array.isArray(pkg)) return pkg;
  if (!Array.isArray(pkg.resources)) return pkg;
  return {
    ...pkg,
    resources: pkg.resources.filter(
      (resource) =>
        resource &&
        (includePrivateResources || resource.private !== true) &&
        (!resource.state || resource.state === "active"),
    ),
  };
}

export function sanitizePublicSearchResult(result) {
  if (!result || typeof result !== "object" || !Array.isArray(result.results))
    return result;
  return { ...result, results: result.results.map(sanitizePublicPackage) };
}

export function sanitizePublicActivity(result) {
  if (!Array.isArray(result)) return result;
  return result.map((entry) => {
    if (!entry || typeof entry !== "object") return entry;
    const safeEntry = { ...entry };
    delete safeEntry.user;
    delete safeEntry.user_id;
    delete safeEntry.activity_user_id;
    delete safeEntry.data;
    return safeEntry;
  });
}
