import "server-only";
import { cache } from "react";
import {
  ckanAction,
  ckanExtraValue,
  ckanExtraValues,
  searchPackages,
} from "@/lib/ckan/client";
import { sanitizePublicPackage } from "@/lib/ckan/public-api-sanitize";
import { isPrivateMarker } from "@/lib/ckan/privacy";
import { publicResourceUrl } from "@/lib/ckan/public-resource-url";
import {
  buildPortalContentDiscoveryFilter,
  isPortalContentPackage,
} from "@/lib/data/portal-content-types";

export const PUBLICATION_TAG =
  process.env.CKAN_PUBLICATION_TAG || "portal-publikasi";

export function isPublicPublicationPackage(pkg) {
  return Boolean(
    pkg &&
    (!pkg.state || pkg.state === "active") &&
    !isPrivateMarker(pkg.private) &&
    isPortalContentPackage(pkg, "publication"),
  );
}

export function getPublicationResources(pkg = {}) {
  return (pkg.resources || []).filter(
    (resource) =>
      resource &&
      (!resource.state || resource.state === "active") &&
      !isPrivateMarker(resource.private) &&
      resource.url,
  );
}

export function getPublicationReleaseDate(pkg = {}) {
  return (
    ckanExtraValue(pkg, ["portal_publication_date", "publication_date"]) || ""
  );
}

function toPublication(pkg) {
  const extras = ckanExtraValues(pkg);
  return {
    package: pkg,
    name: pkg.name,
    title: pkg.title || pkg.name,
    notes: pkg.notes || "",
    organization: pkg.organization || null,
    resources: getPublicationResources(pkg)
      .map((resource) => ({
        ...resource,
        url: publicResourceUrl(resource.url),
      }))
      .filter((resource) => resource.url),
    period:
      ckanExtraValue(pkg, [
        "portal_reference_period",
        "portal_period",
        "period",
        "periode_data",
      ]) || "",
    publicationDate: getPublicationReleaseDate(pkg),
    version:
      ckanExtraValue(pkg, ["portal_version", "version_release"]) ||
      pkg.version ||
      "",
    revisionNote:
      ckanExtraValue(pkg, ["portal_revision_note", "revision_note"]) || "",
    methodology:
      ckanExtraValue(pkg, [
        "portal_methodology",
        "methodology",
        "methodology_description",
      ]) || "",
    category:
      ckanExtraValue(pkg, ["portal_category", "category"]) ||
      pkg.groups?.[0]?.title ||
      "Publikasi statistik",
    attribution:
      ckanExtraValue(pkg, ["portal_attribution", "publisher"]) ||
      pkg.organization?.title ||
      "",
    extras,
  };
}

export async function getPublishedPublicationsResult({
  limit = 18,
  page = 1,
} = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 18, 1), 100);
  const safePage = Math.min(Math.max(Number(page) || 1, 1), 10000);
  try {
    const result = await searchPackages({
      q: "*:*",
      rows: safeLimit,
      start: (safePage - 1) * safeLimit,
      sort: "metadata_modified desc",
      fq: buildPortalContentDiscoveryFilter("publication"),
    });
    const packages = (
      Array.isArray(result.results) ? result.results : []
    ).filter(isPublicPublicationPackage);
    return {
      data: packages.map(toPublication),
      meta: {
        current_page: safePage,
        per_page: safeLimit,
        total: Number(result.count || 0),
        last_page: Math.max(
          1,
          Math.ceil(Number(result.count || 0) / safeLimit),
        ),
      },
      unavailable: false,
    };
  } catch (error) {
    console.error("ckan_public_publications_failed", {
      status: error?.status || null,
      detail: error?.detail || null,
    });
    return {
      data: [],
      meta: {
        current_page: safePage,
        per_page: safeLimit,
        total: 0,
        last_page: 1,
      },
      unavailable: true,
    };
  }
}

export const getPublicPublicationBySlugResult = cache(
  async function getPublicPublicationBySlugResult(name) {
    if (typeof name !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(name))
      return { data: null, unavailable: false };
    try {
      const pkg = sanitizePublicPackage(
        await ckanAction("package_show", { id: name }),
      );
      if (!isPublicPublicationPackage(pkg))
        return { data: null, unavailable: false };
      return { data: toPublication(pkg), unavailable: false };
    } catch (error) {
      if (error?.status === 404) return { data: null, unavailable: false };
      console.error("ckan_public_publication_detail_failed", {
        status: error?.status || null,
        detail: error?.detail || null,
      });
      return { data: null, unavailable: true };
    }
  },
);
