import { isPrivateMarker } from "@/lib/ckan/privacy";

/**
 * Sanitize CKAN responses before they cross the public Next.js boundary.
 *
 * CKAN core authorizes Resource visibility through the parent Package. It does
 * not provide a per-resource private ACL. A non-core `resource.private` marker
 * therefore must never be exposed merely because a browser has a CKAN session.
 * If per-resource privacy is introduced later, it must be backed by a CKAN
 * auth plugin before this sanitizer can be relaxed.
 */
export function sanitizePublicPackage(pkg) {
  if (!pkg || typeof pkg !== "object" || Array.isArray(pkg)) return pkg;
  if (!Array.isArray(pkg.resources)) return pkg;
  return {
    ...pkg,
    resources: pkg.resources.filter(
      (resource) =>
        resource &&
        !isPrivateMarker(resource.private) &&
        (!resource.state || resource.state === "active"),
    ),
  };
}

export function sanitizePublicSearchResult(result) {
  if (!result || typeof result !== "object" || !Array.isArray(result.results))
    return result;
  return {
    ...result,
    results: result.results.map((pkg) => sanitizePublicPackage(pkg)),
  };
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
