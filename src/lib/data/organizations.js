import "server-only";
import { cache } from "react";
import { ckanAction, searchPackages } from "@/lib/ckan/client";
import {
  buildDatasetCatalogExclusionFilters,
  buildPortalContentDiscoveryFilter,
} from "@/lib/data/portal-content-types";

const PUBLIC_ORGANIZATION_COUNT_QUERIES = Object.freeze({
  datasets: buildDatasetCatalogExclusionFilters().join(" AND "),
  indicators: buildPortalContentDiscoveryFilter("indicator"),
  infographics: buildPortalContentDiscoveryFilter("infographic"),
  publications: buildPortalContentDiscoveryFilter("publication"),
});

function organizationFacetMap(result) {
  const items = result?.search_facets?.organization?.items;
  if (!Array.isArray(items)) throw new Error("ckan_organization_facet_missing");
  return new Map(
    items.map((item) => [
      String(item.name || ""),
      Math.max(0, Number(item.count) || 0),
    ]),
  );
}

async function getOrganizationContentFacets() {
  const entries = Object.entries(PUBLIC_ORGANIZATION_COUNT_QUERIES);
  const results = await Promise.allSettled(
    entries.map(([, fq]) =>
      searchPackages({
        q: "*:*",
        rows: 0,
        facets: true,
        facetFields: ["organization"],
        fq,
      }),
    ),
  );
  const counts = {};
  entries.forEach(([kind], index) => {
    const result = results[index];
    if (result.status === "fulfilled") {
      try {
        counts[kind] = organizationFacetMap(result.value);
      } catch (error) {
        counts[kind] = null;
        console.error(`ckan_organization_${kind}_facets_invalid`, {
          status: error?.status || null,
          detail: error?.message || null,
        });
      }
    } else {
      counts[kind] = null;
      console.error(`ckan_organization_${kind}_facets_failed`, {
        status: result.reason?.status || null,
        detail: result.reason?.detail || null,
      });
    }
  });
  return counts;
}

/**
 * CKAN's native organization profile lives in `description`. Older portal
 * schemas stored the same text as a Scheming `notes` extra; read that value as
 * a compatibility fallback while existing organizations are migrated.
 */
const ORGANIZATION_EXTRA_FIELDS = [
  "organization_code",
  "organization_category",
  "organization_website",
  "organization_contact_email",
  "organization_contact_phone",
  "organization_data_contact",
];

export function normalizePublicOrganization(organization) {
  if (!organization || typeof organization !== "object") return organization;

  const legacyExtraNotes = Array.isArray(organization.extras)
    ? organization.extras.find((extra) => extra?.key === "notes")?.value
    : organization.extras && typeof organization.extras === "object"
      ? organization.extras.notes
      : undefined;
  const candidates = [
    organization.description,
    organization.notes,
    legacyExtraNotes,
  ];
  const description = candidates.find(
    (value) => typeof value === "string" && value.trim().length > 0,
  );
  const publicOrganization = { ...organization };
  delete publicOrganization.extras;
  delete publicOrganization.notes;
  for (const field of ORGANIZATION_EXTRA_FIELDS) {
    delete publicOrganization[field];
  }

  return {
    ...publicOrganization,
    description: description || "",
  };
}

export async function getPublicOrganizationsResult() {
  try {
    const [organizationsResult, contentFacets] = await Promise.all([
      ckanAction("organization_list", {
        all_fields: true,
        include_dataset_count: false,
        include_datasets: false,
        include_extras: true,
        include_users: false,
      }),
      getOrganizationContentFacets(),
    ]);
    const organizations = (
      Array.isArray(organizationsResult) ? organizationsResult : []
    )
      .filter((organization) => organization.state !== "deleted")
      .map((rawOrganization) => {
        const organization = normalizePublicOrganization(rawOrganization);
        const publicContentCounts = Object.fromEntries(
          Object.entries(contentFacets).map(([kind, counts]) => [
            kind,
            counts ? (counts.get(organization.name) ?? 0) : null,
          ]),
        );
        return {
          ...organization,
          public_content_counts: publicContentCounts,
          public_dataset_count: publicContentCounts.datasets,
        };
      });
    return { data: organizations, unavailable: false };
  } catch (error) {
    console.error("ckan_organization_list_failed", {
      status: error?.status || null,
      detail: error?.detail || null,
    });
    return { data: [], unavailable: true };
  }
}

export async function getPublicOrganizations() {
  return (await getPublicOrganizationsResult()).data;
}

export const getPublicOrganizationBySlugResult = cache(
  async function getOrganizationByName(name) {
    if (typeof name !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(name)) {
      return { data: null, unavailable: false };
    }
    try {
      const organization = await ckanAction("organization_show", {
        id: name,
        include_dataset_count: false,
        include_datasets: false,
        include_extras: true,
        include_users: false,
      });
      const normalizedOrganization = normalizePublicOrganization(organization);
      return {
        data:
          normalizedOrganization?.state === "deleted"
            ? null
            : normalizedOrganization,
        unavailable: false,
      };
    } catch (error) {
      if (error?.status === 404) return { data: null, unavailable: false };
      console.error("ckan_organization_detail_failed", {
        status: error?.status || null,
      });
      return { data: null, unavailable: true };
    }
  },
);
