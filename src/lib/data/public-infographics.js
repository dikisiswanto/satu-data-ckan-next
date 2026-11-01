import "server-only";
import { cache } from "react";
import { ckanAction, ckanExtraValues, searchPackages } from "@/lib/ckan/client";
import { sanitizePublicPackage } from "@/lib/ckan/public-api-sanitize";
import { isPrivateMarker } from "@/lib/ckan/privacy";
import { publicResourceUrl } from "@/lib/ckan/public-resource-url";

export const INFOGRAPHIC_TAG =
  process.env.CKAN_INFOGRAPHIC_TAG || "portal-infografik";
const IMAGE_FORMATS = new Set(["png", "jpg", "jpeg", "webp", "gif", "avif"]);

export function isPublicInfographicPackage(pkg) {
  return Boolean(
    pkg &&
    (!pkg.state || pkg.state === "active") &&
    !isPrivateMarker(pkg.private) &&
    (pkg.tags || []).some(
      (tag) => (tag.name || tag.display_name) === INFOGRAPHIC_TAG,
    ),
  );
}

export function isImageResource(resource) {
  if (
    !resource ||
    (resource.state && resource.state !== "active") ||
    isPrivateMarker(resource.private) ||
    !resource.url
  )
    return false;
  const format = String(resource.format || "")
    .toLowerCase()
    .replace(/^.*\//, "");
  const mime = String(resource.mimetype || "").toLowerCase();
  return (
    IMAGE_FORMATS.has(format) || /^image\/(png|jpeg|webp|gif|avif)$/.test(mime)
  );
}

export function getInfographicResources(pkg) {
  return (pkg.resources || []).filter(
    (resource) =>
      resource &&
      (!resource.state || resource.state === "active") &&
      !isPrivateMarker(resource.private) &&
      resource.url,
  );
}

function toInfographic(pkg) {
  const extras = ckanExtraValues(pkg);
  // Public resource routes use the public host; never expose the Basic-Auth admin origin.
  const resources = getInfographicResources(pkg)
    .map((resource) => ({ ...resource, url: publicResourceUrl(resource.url) }))
    .filter((resource) => resource.url);
  const cover = resources.find(isImageResource) || null;
  return {
    package: pkg,
    name: pkg.name,
    title: pkg.title || pkg.name,
    notes: pkg.notes || "",
    organization: pkg.organization || null,
    resources,
    cover,
    category:
      extras.portal_category ||
      extras.category ||
      pkg.groups?.[0]?.title ||
      pkg.tags?.find((tag) => (tag.name || "") !== INFOGRAPHIC_TAG)
        ?.display_name ||
      "Infografik",
    period: extras.portal_period || extras.period || extras.tahun || "",
    attribution:
      extras.portal_attribution ||
      extras.attribution ||
      pkg.organization?.title ||
      "",
  };
}

export async function getPublishedInfographicsResult({
  limit = 24,
  page = 1,
} = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 24, 1), 100);
  const safePage = Math.min(Math.max(Number(page) || 1, 1), 10000);
  try {
    const result = await searchPackages({
      q: "*:*",
      rows: safeLimit,
      start: (safePage - 1) * safeLimit,
      sort: "metadata_modified desc",
      fqList: [`tags:${INFOGRAPHIC_TAG}`],
    });
    const packages = (
      Array.isArray(result.results) ? result.results : []
    ).filter(isPublicInfographicPackage);
    return {
      data: packages.map(toInfographic),
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
    console.error("ckan_public_infographics_failed", {
      status: error?.status || null,
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

export const getPublicInfographicBySlugResult = cache(
  async function getPublicInfographicBySlugResult(name) {
    if (typeof name !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(name))
      return { data: null, unavailable: false };
    try {
      const pkg = sanitizePublicPackage(
        await ckanAction("package_show", { id: name }),
      );
      if (!isPublicInfographicPackage(pkg))
        return { data: null, unavailable: false };
      return { data: toInfographic(pkg), unavailable: false };
    } catch (error) {
      if (error?.status === 404) return { data: null, unavailable: false };
      console.error("ckan_public_infographic_detail_failed", {
        status: error?.status || null,
      });
      return { data: null, unavailable: true };
    }
  },
);
