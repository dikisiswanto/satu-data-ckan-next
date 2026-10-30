import { getPublicSiteOrigin } from "@/lib/site-config";
import { getPublishedDatasetsResult } from "@/lib/data/public";
import { getPublicOrganizationsResult } from "@/lib/data/organizations";
import { getPublishedIndicatorsResult } from "@/lib/data/public-indicators";
import { getPublishedInfographicsResult } from "@/lib/data/public-infographics";
import { getPublishedPublicationsResult } from "@/lib/data/public-publications";
import {
  getPublicCmsPagesResult,
  getPublicCmsBlogPostsResult,
} from "@/lib/cms/pages";
import { connection } from "next/server";

export const dynamic = "force-dynamic";
const SITEMAP_URL_LIMIT = 50_000;
const DATASET_PAGE_SIZE = 100;

function validDate(value) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

async function getSitemapTaggedContent(fetchPage) {
  const items = [];
  let unavailable = false;
  for (
    let page = 1;
    page <= Math.ceil(SITEMAP_URL_LIMIT / DATASET_PAGE_SIZE);
    page += 1
  ) {
    const result = await fetchPage(page);
    if (result.unavailable) {
      unavailable = true;
      break;
    }
    const batch = result.data || [];
    items.push(...batch);
    if (batch.length < DATASET_PAGE_SIZE || items.length >= SITEMAP_URL_LIMIT)
      break;
  }
  return { data: items.slice(0, SITEMAP_URL_LIMIT), unavailable };
}

async function getSitemapDatasets() {
  const datasets = [];
  let unavailable = false;
  // The public search RPC caps each response at 100 rows. Paginate explicitly
  // so a growing catalog is not silently omitted from SEO discovery.
  for (
    let offset = 0;
    offset < SITEMAP_URL_LIMIT;
    offset += DATASET_PAGE_SIZE
  ) {
    const result = await getPublishedDatasetsResult({
      limit: DATASET_PAGE_SIZE,
      offset,
      sort: "updated",
    });
    if (result.unavailable) {
      unavailable = true;
      console.error("sitemap_dataset_catalog_incomplete", { offset });
      break;
    }
    const batch = result.data || [];
    datasets.push(...batch);
    if (batch.length < DATASET_PAGE_SIZE) break;
  }
  return { data: datasets.slice(0, SITEMAP_URL_LIMIT), unavailable };
}

export default async function sitemap() {
  const base = getPublicSiteOrigin();
  if (!base) {
    console.error("sitemap_unavailable_site_origin_not_configured");
    return [];
  }
  const [
    datasetResult,
    organizationResult,
    indicatorsResult,
    infographicsResult,
    publicationsResult,
    cmsPagesResult,
    cmsBlogResult,
  ] = await Promise.all([
    getSitemapDatasets(),
    getPublicOrganizationsResult(),
    getSitemapTaggedContent((page) =>
      getPublishedIndicatorsResult({
        limit: DATASET_PAGE_SIZE,
        page,
        includeLatest: false,
      }),
    ),
    getSitemapTaggedContent((page) =>
      getPublishedInfographicsResult({ limit: DATASET_PAGE_SIZE, page }),
    ),
    getSitemapTaggedContent((page) =>
      getPublishedPublicationsResult({ limit: DATASET_PAGE_SIZE, page }),
    ),
    getPublicCmsPagesResult(),
    getPublicCmsBlogPostsResult(),
  ]);
  // Avoid caching a partial sitemap as complete while any public query is failing.
  if (
    datasetResult.unavailable ||
    organizationResult.unavailable ||
    indicatorsResult.unavailable ||
    infographicsResult.unavailable ||
    publicationsResult.unavailable ||
    cmsPagesResult.unavailable ||
    cmsBlogResult.unavailable
  )
    await connection();
  const datasets = datasetResult.data;
  const organizations = organizationResult.data;
  const indicators = indicatorsResult.data || [];
  const infographics = infographicsResult.data || [];
  const publications = publicationsResult.data || [];
  const cmsPages = cmsPagesResult.data || [];
  const cmsBlogPosts = cmsBlogResult.data || [];
  const fixed = [
    "",
    "/dataset",
    "/statistik",
    "/infografik",
    "/publikasi",
    "/informasi",
    "/berita",
    "/organisasi",
    "/bantuan",
    "/api-data",
  ].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: path === "" ? "weekly" : "daily",
    priority: path === "" ? 1 : 0.7,
  }));
  const datasetEntries = datasets.map((item) => ({
    url: `${base}/dataset/${item.name}`,
    ...(validDate(item.metadata_modified || item.metadata_created)
      ? {
          lastModified: validDate(
            item.metadata_modified || item.metadata_created,
          ),
        }
      : {}),
    changeFrequency: "monthly",
    priority: 0.6,
  }));
  const organizationEntries = organizations.map((item) => ({
    url: `${base}/organisasi/${item.name}`,
    ...(validDate(item.metadata_modified)
      ? { lastModified: validDate(item.metadata_modified) }
      : {}),
    changeFrequency: "monthly",
    priority: 0.5,
  }));
  // Preserve room for fixed pages and organizations within the sitemap ceiling.
  const indicatorEntries = indicators.map((item) => ({
    url: `${base}/statistik/${item.name}`,
    ...(validDate(item.metadataModified)
      ? { lastModified: validDate(item.metadataModified) }
      : {}),
    changeFrequency: "monthly",
    priority: 0.7,
  }));
  const infographicEntries = infographics.map((item) => ({
    url: `${base}/infografik/${item.name}`,
    ...(validDate(
      item.package?.metadata_modified || item.package?.metadata_created,
    )
      ? {
          lastModified: validDate(
            item.package?.metadata_modified || item.package?.metadata_created,
          ),
        }
      : {}),
    changeFrequency: "monthly",
    priority: 0.6,
  }));
  const publicationEntries = publications.map((item) => ({
    url: `${base}/publikasi/${item.name}`,
    ...(validDate(
      item.package?.metadata_modified || item.package?.metadata_created,
    )
      ? {
          lastModified: validDate(
            item.package?.metadata_modified || item.package?.metadata_created,
          ),
        }
      : {}),
    changeFrequency: "monthly",
    priority: 0.6,
  }));
  const cmsPageEntries = cmsPages.map((item) => ({
    url: `${base}/informasi/${encodeURIComponent(item.name)}`,
    ...(validDate(item.publishDate)
      ? { lastModified: validDate(item.publishDate) }
      : {}),
    changeFrequency: "monthly",
    priority: item.showInMenu ? 0.7 : 0.5,
  }));
  const cmsBlogEntries = cmsBlogPosts.map((item) => ({
    url: `${base}/berita/${encodeURIComponent(item.name)}`,
    ...(validDate(item.publishDate)
      ? { lastModified: validDate(item.publishDate) }
      : {}),
    changeFrequency: "weekly",
    priority: item.featured ? 0.75 : 0.6,
  }));
  const fixedRoom = Math.max(
    0,
    SITEMAP_URL_LIMIT -
      fixed.length -
      organizationEntries.length -
      indicatorEntries.length -
      infographicEntries.length -
      publicationEntries.length -
      cmsPageEntries.length -
      cmsBlogEntries.length,
  );
  return [
    ...fixed,
    ...indicatorEntries,
    ...infographicEntries,
    ...publicationEntries,
    ...cmsPageEntries,
    ...cmsBlogEntries,
    ...datasetEntries.slice(0, fixedRoom),
    ...organizationEntries,
  ].slice(0, SITEMAP_URL_LIMIT);
}
