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
import {
  buildPortalContentDiscoveryFilter,
  isPortalContentPackage,
} from "@/lib/data/portal-content-types";

/**
 * CKAN-native publishing convention for public statistics.
 * An indicator is a public CKAN Package discovered by its editorial tag,
 * Scheming `portal_type` extra, or true CKAN custom dataset type, with a public
 * tabular Resource whose DataStore is active. The resource uses `period`,
 * `region`, `value`, `unit` and optional `source` columns.
 */
export const INDICATOR_TAG =
  process.env.CKAN_INDICATOR_TAG || "portal-indikator";
const PAGE_SIZE_MAX = 100;
const OBSERVATION_LIMIT = 1000;
const INDICATOR_FQ = buildPortalContentDiscoveryFilter("indicator");

function pageMeta(total, page, limit) {
  return {
    current_page: page,
    per_page: limit,
    total,
    last_page: Math.max(1, Math.ceil(total / limit)),
  };
}

export function isPublicIndicatorPackage(pkg) {
  return Boolean(
    pkg &&
    (!pkg.state || pkg.state === "active") &&
    !isPrivateMarker(pkg.private) &&
    isPortalContentPackage(pkg, "indicator"),
  );
}

export function getIndicatorMetadata(pkg = {}) {
  const extras = ckanExtraValues(pkg);
  return {
    unit:
      ckanExtraValue(pkg, ["portal_unit", "unit", "satuan"]) ||
      "Satuan belum dicantumkan",
    periodicity:
      ckanExtraValue(pkg, [
        "portal_periodicity",
        "periodicity",
        "frekuensi_data",
      ]) || "",
    definition:
      ckanExtraValue(pkg, ["portal_definition", "definition"]) ||
      pkg.notes ||
      "Definisi indikator belum dilengkapi.",
    formula: ckanExtraValue(pkg, ["portal_formula", "formula"]) || "",
    source:
      ckanExtraValue(pkg, ["portal_source", "source", "sumber_data"]) || "",
    geography:
      ckanExtraValue(pkg, [
        "portal_geography",
        "geography",
        "cakupan_wilayah",
      ]) || "",
    referencePeriod:
      ckanExtraValue(pkg, [
        "portal_reference_period",
        "reference_period",
        "periode_data",
      ]) || "",
    dataStart:
      ckanExtraValue(pkg, [
        "portal_data_start",
        "data_start",
        "temporal_start",
      ]) || "",
    dataEnd:
      ckanExtraValue(pkg, ["portal_data_end", "data_end", "temporal_end"]) ||
      "",
    updateFrequency:
      ckanExtraValue(pkg, ["portal_update_frequency", "update_frequency"]) ||
      "",
    publicationDate:
      ckanExtraValue(pkg, ["portal_publication_date", "publication_date"]) ||
      "",
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
    extras,
  };
}

export function getIndicatorResource(pkg = {}) {
  const resources = (pkg.resources || []).filter(
    (resource) =>
      resource &&
      (!resource.state || resource.state === "active") &&
      resource.datastore_active === true &&
      resource.id &&
      !isPrivateMarker(resource.private),
  );
  return (
    resources.find((resource) => {
      const extras = Array.isArray(resource.extras) ? resource.extras : [];
      const role =
        resource.portal_resource_role ??
        extras.find((item) => item?.key === "portal_resource_role")?.value;
      return String(role || "").toLowerCase() === "data";
    }) ||
    resources[0] ||
    null
  );
}

function firstDefined(record, fields) {
  for (const field of fields) {
    if (
      record?.[field] !== undefined &&
      record[field] !== null &&
      String(record[field]).trim() !== ""
    )
      return record[field];
  }
  return null;
}

export function normalizeObservation(record = {}, fallbackUnit = "") {
  const rawValue = firstDefined(record, [
    "value",
    "nilai",
    "value_numeric",
    "nilai_indikator",
  ]);
  const asNumber = rawValue === null ? null : Number(rawValue);
  return {
    id:
      record._id ??
      `${firstDefined(record, ["period", "periode", "tahun", "year"]) ?? "period"}-${firstDefined(record, ["region", "wilayah"]) ?? "region"}`,
    period: String(
      firstDefined(record, ["period", "periode", "tahun", "year", "tanggal"]) ??
        "Periode tidak diketahui",
    ),
    region: String(
      firstDefined(record, ["region", "wilayah", "nama_wilayah"]) ??
        "Wilayah tidak dicantumkan",
    ),
    value: rawValue,
    numericValue:
      rawValue !== null && Number.isFinite(asNumber) ? asNumber : null,
    unit: String(firstDefined(record, ["unit", "satuan"]) ?? fallbackUnit),
    source: String(firstDefined(record, ["source", "sumber"]) ?? ""),
  };
}

async function readObservations(
  resource,
  { limit = OBSERVATION_LIMIT, sort = "period asc" } = {},
) {
  if (!resource?.id || resource.datastore_active !== true)
    return { records: [], total: 0, fields: [] };
  const result = await ckanAction("datastore_search", {
    resource_id: resource.id,
    limit: Math.min(Math.max(Number(limit) || 100, 1), OBSERVATION_LIMIT),
    offset: 0,
    sort,
  });
  return {
    records: Array.isArray(result.records) ? result.records : [],
    total: Number(result.total || 0),
    fields: Array.isArray(result.fields) ? result.fields : [],
  };
}

async function toIndicatorCard(pkg, { includeLatest = true } = {}) {
  const metadata = getIndicatorMetadata(pkg);
  const resource = getIndicatorResource(pkg);
  let latest = null;
  if (includeLatest && resource) {
    try {
      const { records } = await readObservations(resource, {
        limit: 100,
        sort: "period desc",
      });
      const observations = records.map((record) =>
        normalizeObservation(record, metadata.unit),
      );
      latest =
        observations.find(
          (item) => item.numericValue !== null || item.value !== null,
        ) ||
        observations[0] ||
        null;
    } catch (error) {
      // A metadata card remains useful if its DataStore has a transient problem.
      console.error("ckan_indicator_latest_value_failed", {
        resourceId: resource.id,
        status: error?.status || null,
      });
    }
  }
  return {
    package: pkg,
    name: pkg.name,
    title: pkg.title || pkg.name,
    notes: pkg.notes || "",
    organization: pkg.organization || null,
    metadata,
    resource,
    latest,
    metadataModified: pkg.metadata_modified || pkg.metadata_created || null,
  };
}

export async function getPublishedIndicatorsResult({
  limit = 24,
  page = 1,
  includeLatest = true,
} = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 24, 1), PAGE_SIZE_MAX);
  const safePage = Math.min(Math.max(Number(page) || 1, 1), 10000);
  try {
    const result = await searchPackages({
      q: "*:*",
      rows: safeLimit,
      start: (safePage - 1) * safeLimit,
      sort: "metadata_modified desc",
      fqList: [INDICATOR_FQ],
    });
    const packages = (
      Array.isArray(result.results) ? result.results : []
    ).filter(isPublicIndicatorPackage);
    const data = await Promise.all(
      packages.map((pkg) => toIndicatorCard(pkg, { includeLatest })),
    );
    return {
      data,
      meta: pageMeta(Number(result.count || 0), safePage, safeLimit),
      unavailable: false,
    };
  } catch (error) {
    console.error("ckan_public_indicators_failed", {
      status: error?.status || null,
      detail: error?.detail || null,
    });
    return {
      data: [],
      meta: pageMeta(0, safePage, safeLimit),
      unavailable: true,
    };
  }
}

export const getPublicIndicatorBySlugResult = cache(
  async function getPublicIndicatorBySlugResult(name) {
    if (typeof name !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(name))
      return { data: null, unavailable: false };
    try {
      const pkg = sanitizePublicPackage(
        await ckanAction("package_show", { id: name }),
      );
      if (!isPublicIndicatorPackage(pkg))
        return { data: null, unavailable: false };
      const metadata = getIndicatorMetadata(pkg);
      const resource = getIndicatorResource(pkg);
      let observations = [];
      let fields = [];
      let total = 0;
      if (resource) {
        // Fetch the most recent sample so datasets with more than 1,000 rows do not
        // accidentally show only their earliest observations. Reverse the sample for
        // the trend chart (oldest to newest); the table reverses it for newest first.
        const result = await readObservations(resource, {
          sort: "period desc",
        });
        fields = result.fields;
        total = result.total;
        observations = result.records
          .map((record) => normalizeObservation(record, metadata.unit))
          .reverse();
      }
      return {
        data: {
          package: pkg,
          name: pkg.name,
          title: pkg.title || pkg.name,
          notes: pkg.notes || "",
          organization: pkg.organization || null,
          metadata,
          resource,
          observations,
          fields,
          totalObservations: total,
        },
        unavailable: false,
      };
    } catch (error) {
      if (error?.status === 404) return { data: null, unavailable: false };
      console.error("ckan_public_indicator_detail_failed", {
        status: error?.status || null,
        detail: error?.detail || null,
      });
      return { data: null, unavailable: true };
    }
  },
);
