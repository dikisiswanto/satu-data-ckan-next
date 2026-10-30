import { safeHttpUrl } from "@/lib/utils";
import { getPublicSiteOrigin } from "@/lib/site-config";

/**
 * Keep CKAN's public download path on the public portal origin. CKAN's admin
 * hostname is a protected interface and must not leak into public download links.
 * External resource URLs are left untouched.
 */
export function publicResourceUrl(value) {
  const safe = safeHttpUrl(value);
  if (!safe) return null;

  let resourceUrl;
  try {
    resourceUrl = new URL(safe);
  } catch {
    return null;
  }

  const publicOrigin = getPublicSiteOrigin();
  const configuredAdmin =
    process.env.CKAN_ADMIN_URL || process.env.NEXT_PUBLIC_CKAN_ADMIN_URL;
  let adminOrigin = null;
  try {
    adminOrigin = configuredAdmin ? new URL(configuredAdmin).origin : null;
  } catch {
    adminOrigin = null;
  }

  const isInternalCkanHost = [
    "ckan",
    "nginx",
    "localhost",
    "127.0.0.1",
  ].includes(resourceUrl.hostname);
  const isProtectedOrigin = Boolean(
    (adminOrigin && resourceUrl.origin === adminOrigin) || isInternalCkanHost,
  );
  const isCkanDownload =
    /^\/dataset\/[^/]+\/resource\/[^/]+\/download\/[^/]+\/?$/.test(
      resourceUrl.pathname,
    );

  // Never publish a service-network/admin URL. Only the CKAN download route is
  // known to be routed safely through the public portal. A different internal
  // path is omitted rather than emitted as a broken or accidentally exposed URL.
  if (isProtectedOrigin) {
    if (!publicOrigin || !isCkanDownload) return null;
    return `${publicOrigin}${resourceUrl.pathname}${resourceUrl.search}${resourceUrl.hash}`;
  }

  // URLs that are already public or belong to a trusted external host stay as-is.
  return safe;
}

export function ckanResourceExtra(resource = {}, key) {
  if (!key) return null;
  const direct = resource[key];
  if (direct !== undefined && direct !== null && String(direct).trim() !== "")
    return String(direct);
  const extras = Array.isArray(resource.extras) ? resource.extras : [];
  const match = extras.find(
    (item) =>
      item?.key === key &&
      item.value !== undefined &&
      item.value !== null &&
      String(item.value).trim() !== "",
  );
  return match ? String(match.value) : null;
}

/**
 * Preserve CKAN's native Action API object shape while rewriting only CKAN
 * resource-download links that would otherwise expose the protected admin host.
 * External links and arbitrary metadata strings are left unchanged.
 */
export function rewriteCkanDownloadUrls(value, depth = 0) {
  if (depth > 14 || value === null || value === undefined) return value;
  if (Array.isArray(value))
    return value.map((item) => rewriteCkanDownloadUrls(item, depth + 1));
  if (typeof value !== "object") return value;
  const output = {};
  for (const [key, item] of Object.entries(value)) {
    output[key] =
      key === "url" && typeof item === "string"
        ? publicResourceUrl(item)
        : rewriteCkanDownloadUrls(item, depth + 1);
  }
  return output;
}
