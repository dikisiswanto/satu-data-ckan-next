import "server-only";
import { ckanAction } from "@/lib/ckan/client";

function isActiveResource(resource) {
  return Boolean(resource && (!resource.state || resource.state === "active"));
}

/**
 * CKAN package_show can carry resource summaries as part of the package.
 * A cookie merely being present is NOT proof that its holder may read every
 * private resource in that package. Ask CKAN's resource_show authorization
 * for each private resource and retain only the records CKAN returns to this
 * exact browser session.
 *
 * Public resources are kept as returned by an already-authorized package_show.
 * Anonymous callers never get private resource metadata. The caller must still
 * run sanitizePublicPackage after this function to remove inactive records.
 */
export async function resolveAuthorizedPackageResources(
  pkg,
  sessionCookie = null,
) {
  if (!pkg || typeof pkg !== "object" || !Array.isArray(pkg.resources))
    return pkg;

  const resources = await Promise.all(
    pkg.resources.map(async (resource) => {
      if (!isActiveResource(resource)) return null;
      if (resource.private !== true) return resource;
      if (!sessionCookie || !resource.id) return null;

      try {
        const authorizedResource = await ckanAction(
          "resource_show",
          { id: resource.id },
          { revalidate: 0, sessionCookie },
        );
        if (
          !isActiveResource(authorizedResource) ||
          authorizedResource.id !== resource.id
        )
          return null;

        const resourcePackageId =
          authorizedResource.package_id || authorizedResource.package_name;
        if (
          pkg.id &&
          resourcePackageId &&
          resourcePackageId !== pkg.id &&
          resourcePackageId !== pkg.name
        )
          return null;
        return authorizedResource;
      } catch (error) {
        // Lack of permission is an ordinary visibility outcome, not a failure of
        // the whole package page. Real CKAN/network failures still surface.
        if (error?.status === 403 || error?.status === 404) return null;
        throw error;
      }
    }),
  );

  return { ...pkg, resources: resources.filter(Boolean) };
}
