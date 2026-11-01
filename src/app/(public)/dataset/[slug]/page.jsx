import Image from "next/image";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { cookies } from "next/headers";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  FileSpreadsheet,
  MapPinned,
  Code2,
  CalendarRange,
  Clock3,
  Activity,
  FileClock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getPublishedDatasetBySlugResult } from "@/lib/data/public";
import { formatDate, formatBytes, safeHttpUrl } from "@/lib/utils";
import {
  ckanAction,
  ckanExtraValue,
  ckanPackageCategory,
  ckanResourceFormat,
  ckanResourceName,
  isGeospatialServiceResource,
  isGeoJSONResource,
} from "@/lib/ckan/client";
import {
  CKAN_SESSION_COOKIE_NAME,
  normalizeCkanSessionCookieValue,
} from "@/lib/ckan/session";
import { isPrivateMarker } from "@/lib/ckan/privacy";
import {
  publicResourceUrl,
  ckanResourceExtra,
} from "@/lib/ckan/public-resource-url";
import {
  getCanonicalMetadata,
  getPublicSiteOrigin,
  getSocialMetadata,
  siteConfig,
} from "@/lib/site-config";
import { serializeJsonLd } from "@/lib/seo/json-ld";
import { DatasetResourcePreview } from "@/components/dataset-resource-preview";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { GeoJSONResourcePreview } from "@/components/geojson-resource-preview";
import { DatasetApiAccess } from "@/components/dataset-api-access";
import { PdfResourcePreview } from "@/components/pdf-resource-preview";

export const dynamic = "force-dynamic";

function getGeoPortalUrl() {
  return safeHttpUrl(process.env.NEXT_PUBLIC_GEOPORTAL_URL) || null;
}

async function getViewerCkanSessionCookie() {
  const cookieStore = await cookies();
  return normalizeCkanSessionCookieValue(
    cookieStore.get(CKAN_SESSION_COOKIE_NAME)?.value || null,
  );
}

function isTabularResource(resource = {}) {
  const candidates = [
    resource.format,
    resource.mimetype,
    resource.mimetype_inner,
  ]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase());
  const extensions = [resource.name, resource.url]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase().split(/[?#]/, 1)[0]);
  const supportedFormats = new Set([
    "csv",
    "application/csv",
    "text/csv",
    "tsv",
    "text/tab-separated-values",
    "xls",
    "application/vnd.ms-excel",
    "xlsx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "ods",
    "application/vnd.oasis.opendocument.spreadsheet",
  ]);
  return (
    candidates.some((value) => supportedFormats.has(value)) ||
    extensions.some((value) => /\.(csv|tsv|xls|xlsx|ods)$/i.test(value))
  );
}

function isGeospatialDataset(dataset) {
  const resources = Array.isArray(dataset.resources) ? dataset.resources : [];
  if (resources.some(isGeoJSONResource)) return true;
  const tags = (dataset.tags || []).map(
    (tag) => tag.display_name || tag.name || "",
  );
  const groups = (dataset.groups || []).map(
    (group) => group.title || group.display_name || group.name || "",
  );
  const searchableText = [
    ckanPackageCategory(dataset),
    dataset.name,
    dataset.title,
    dataset.notes,
    ...tags,
    ...groups,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("id-ID");
  return /geospasial|spasial|peta|geojson|shapefile|\bshp\b|koordinat|lintang|bujur|sungai|danau|jaringan jalan|tutupan lahan/.test(
    searchableText,
  );
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const sessionCookie = await getViewerCkanSessionCookie();
  const result = await getPublishedDatasetBySlugResult(slug, sessionCookie);
  if (result.unavailable) {
    return {
      title: "Dataset belum dapat dimuat",
      description: "Informasi dataset belum dapat dimuat.",
      robots: { index: false, follow: false },
    };
  }
  const dataset = result.data;
  if (!dataset)
    return {
      title: "Dataset tidak ditemukan",
      robots: { index: false, follow: false },
    };
  return {
    title: dataset.title || dataset.name,
    description: (
      dataset.notes || `Dataset resmi ${siteConfig.regionName}.`
    ).slice(0, 160),
    ...getCanonicalMetadata(`/dataset/${dataset.name}`),
    ...getSocialMetadata({
      path: `/dataset/${dataset.name}`,
      title: dataset.title || dataset.name,
      description: (
        dataset.notes || `Dataset resmi ${siteConfig.regionName}.`
      ).slice(0, 160),
      type: "article",
    }),
    ...(isPrivateMarker(dataset.private)
      ? { robots: { index: false, follow: false, noarchive: true } }
      : {}),
  };
}
export default async function DatasetDetailPage({ params }) {
  const { slug } = await params;
  const sessionCookie = await getViewerCkanSessionCookie();
  const datasetResult = await getPublishedDatasetBySlugResult(
    slug,
    sessionCookie,
  );
  if (datasetResult.unavailable) {
    // Prevent a temporary upstream failure from being cached as this dataset's page.
    await connection();
    return (
      <main className="page-container section-space public-interior-page">
        <section
          className="public-empty-panel mx-auto max-w-3xl p-8 text-center sm:p-12"
          role="alert"
        >
          <p className="eyebrow">Informasi katalog</p>
          <h1 className="mt-3 text-2xl font-semibold">
            Informasi dataset belum dapat ditampilkan
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted">
            Terjadi kendala saat memuat informasi dataset. Silakan coba kembali
            beberapa saat lagi.
          </p>
          <a
            href={`/dataset/${encodeURIComponent(slug)}`}
            className="public-empty-action mt-5"
          >
            Coba lagi
          </a>
          <Link
            href="/dataset"
            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary"
          >
            Kembali ke katalog
          </Link>
        </section>
      </main>
    );
  }
  const dataset = datasetResult.data;
  if (!dataset) notFound();
  const siteOrigin = getPublicSiteOrigin();
  const apiOrigin = siteOrigin || "";
  // getPublishedDatasetBySlugResult has already removed private resources
  // that CKAN did not authorize for this exact session.
  const resources = (
    Array.isArray(dataset.resources) ? dataset.resources : []
  ).filter(
    (resource) => resource && (!resource.state || resource.state === "active"),
  );
  const publicResources = resources.filter((resource) =>
    publicResourceUrl(resource.url),
  );
  const tags = (dataset.tags || [])
    .map((tag) => tag.display_name || tag.name)
    .filter(Boolean);
  const primaryGroup = Array.isArray(dataset.groups) ? dataset.groups[0] : null;
  const organizationName =
    dataset.organization?.title || dataset.organization?.name || null;
  const sourceUrl = safeHttpUrl(
    ckanExtraValue(dataset, ["source_url", "source_url_original"]),
  );
  const referencePeriod = ckanExtraValue(dataset, [
    "portal_reference_period",
    "portal_period",
    "temporal_coverage",
    "temporal_period",
    "periode_data",
  ]);
  const periodStart = ckanExtraValue(dataset, [
    "portal_data_start",
    "data_start",
    "temporal_start",
  ]);
  const periodEnd = ckanExtraValue(dataset, [
    "portal_data_end",
    "data_end",
    "temporal_end",
  ]);
  const periodicity = ckanExtraValue(dataset, [
    "portal_periodicity",
    "periodicity",
    "frekuensi_data",
  ]);
  const updateFrequency = ckanExtraValue(dataset, [
    "portal_update_frequency",
    "update_frequency",
  ]);
  const publicationDate = ckanExtraValue(dataset, [
    "portal_publication_date",
    "publication_date",
  ]);
  const releaseVersion =
    ckanExtraValue(dataset, ["portal_version", "version_release"]) ||
    dataset.version ||
    null;
  const revisionNote = ckanExtraValue(dataset, [
    "portal_revision_note",
    "revision_note",
  ]);
  const methodology = ckanExtraValue(dataset, [
    "portal_methodology",
    "methodology",
    "methodology_description",
  ]);
  const temporalCoverage =
    referencePeriod ||
    [periodStart, periodEnd].filter(Boolean).join("/") ||
    undefined;
  let activities = [];
  try {
    const activityResult = await ckanAction(
      "package_activity_list",
      { id: dataset.name, offset: 0, limit: 8, include_hidden_activity: false },
      sessionCookie ? { revalidate: 0, sessionCookie } : { revalidate: 30 },
    );
    activities = Array.isArray(activityResult)
      ? activityResult.slice(0, 8)
      : [];
  } catch {
    // Activity support is additive: a hidden/disabled activity endpoint must not break dataset details.
    activities = [];
  }
  const datasetJsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: dataset.title || dataset.name,
    description: dataset.notes || `Dataset resmi dari ${siteConfig.name}.`,
    ...(siteOrigin ? { url: `${siteOrigin}/dataset/${dataset.name}` } : {}),
    identifier: dataset.name,
    ...(organizationName
      ? { creator: { "@type": "Organization", name: organizationName } }
      : {}),
    publisher: {
      "@type": "GovernmentOrganization",
      name: siteConfig.organizationName,
    },
    ...(publicationDate ? { datePublished: publicationDate } : {}),
    ...(dataset.metadata_modified
      ? { dateModified: dataset.metadata_modified }
      : {}),
    ...(tags.length ? { keywords: tags } : {}),
    ...(temporalCoverage ? { temporalCoverage } : {}),
    isAccessibleForFree: !isPrivateMarker(dataset.private),
    distribution: resources.map((resource) => ({
      "@type": "DataDownload",
      name: ckanResourceName(resource),
      encodingFormat: resource.mimetype || resource.format || undefined,
      ...(publicResourceUrl(resource.url)
        ? { contentUrl: publicResourceUrl(resource.url) }
        : {}),
    })),
  };
  const metadata = [
    {
      label: "Perangkat daerah penerbit",
      value:
        organizationName && dataset.organization?.name ? (
          <Link
            className="font-semibold text-primary underline-offset-4 hover:underline"
            href={`/organisasi/${dataset.organization.name}`}
          >
            {organizationName}
          </Link>
        ) : (
          organizationName
        ),
    },
    {
      label: "Ditambahkan ke portal",
      value: formatDate(dataset.metadata_created),
    },
    {
      label: "Terakhir diperbarui",
      value: formatDate(dataset.metadata_modified),
    },
    { label: "Lisensi", value: dataset.license_title || dataset.license_id },
    { label: "Periode data", value: referencePeriod },
    { label: "Frekuensi data", value: periodicity },
    { label: "Jadwal pemutakhiran", value: updateFrequency },
    {
      label: "Tanggal rilis",
      value: publicationDate ? formatDate(publicationDate) : null,
    },
    { label: "Versi rilis", value: releaseVersion },
    { label: "Kode dataset", value: dataset.name },
    {
      label: "Status publikasi",
      value:
        dataset.state === "active" ? "Dipublikasikan" : "Belum dipublikasikan",
    },
  ];
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(datasetJsonLd) }}
      />
      <main className="page-container section-space public-interior-page">
        <Link
          href="/dataset"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-primary"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Kembali ke katalog
        </Link>
        <div className="max-w-4xl">
          {primaryGroup?.name ? (
            <Link
              href={`/dataset?kategori=${encodeURIComponent(primaryGroup.name)}`}
              className="inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
            >
              <Badge
                variant="primary"
                className="transition-colors hover:bg-blue-100"
              >
                {ckanPackageCategory(dataset)}
              </Badge>
            </Link>
          ) : (
            <Badge variant="primary">{ckanPackageCategory(dataset)}</Badge>
          )}
          <h1 className="dataset-detail-title mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
            {dataset.title || dataset.name}
          </h1>
          <p className="dataset-detail-description mt-3 text-base leading-7 text-muted">
            {dataset.notes || "Deskripsi dataset belum tersedia."}
          </p>
          <p className="mt-3 text-sm text-muted">
            Ditambahkan ke portal {formatDate(dataset.metadata_created)} ·
            Diperbarui {formatDate(dataset.metadata_modified)}
          </p>
          <section
            className="mt-6 grid max-w-4xl gap-3 sm:grid-cols-3"
            aria-label="Ringkasan dataset"
          >
            <div className="rounded-xl border border-line bg-white/80 p-3.5">
              <p className="text-xs text-muted">Berkas publik</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {publicResources.length.toLocaleString("id-ID")}
              </p>
            </div>
            <div className="rounded-xl border border-line bg-white/80 p-3.5">
              <p className="text-xs text-muted">Kata kunci</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {tags.length.toLocaleString("id-ID")}
              </p>
            </div>
            <div className="rounded-xl border border-line bg-white/80 p-3.5">
              <p className="text-xs text-muted">Periode data</p>
              <p className="mt-1 break-words text-sm font-semibold">
                {referencePeriod || "Belum dicantumkan"}
              </p>
            </div>
          </section>
        </div>
        <div className="mt-10 grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-8">
            <div className="surface-panel p-5 sm:p-7">
              <h2 className="text-xl font-semibold">Rincian dataset</h2>
              <dl className="mt-5 grid gap-5 sm:grid-cols-2">
                {metadata.map((item) => (
                  <div key={item.label} className="border-b pb-4">
                    <dt className="text-sm text-muted">{item.label}</dt>
                    <dd className="mt-1.5 break-words text-sm font-medium leading-6">
                      {item.value || "Belum dicantumkan"}
                    </dd>
                  </div>
                ))}
              </dl>
              {methodology ? (
                <div className="mt-6">
                  <h3 className="font-semibold">Metodologi</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted">
                    {methodology}
                  </p>
                </div>
              ) : null}
              {periodStart || periodEnd || revisionNote ? (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {periodStart || periodEnd ? (
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="flex items-center gap-2 text-sm font-semibold">
                        <CalendarRange size={16} aria-hidden="true" /> Cakupan
                        periode data
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        {periodStart || "Awal tidak dicantumkan"} —{" "}
                        {periodEnd || "Akhir tidak dicantumkan"}
                      </p>
                    </div>
                  ) : null}
                  {revisionNote ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 sm:col-span-2">
                      <p className="flex items-center gap-2 text-sm font-semibold text-amber-950">
                        <FileClock size={16} aria-hidden="true" /> Catatan
                        perubahan
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-amber-950">
                        {revisionNote}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {tags.length ? (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold">Kata kunci</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tags.map((keyword) => (
                      <Link
                        key={keyword}
                        href={`/dataset?q=${encodeURIComponent(keyword)}`}
                        aria-label={`Cari dataset dengan kata kunci ${keyword}`}
                        className="inline-flex max-w-full items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-primary/30 hover:bg-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                      >
                        <span className="break-words">{keyword}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            {isGeospatialDataset(dataset) ? (
              <section
                className="surface-panel p-5 sm:p-6"
                aria-labelledby="geospatial-viewer-title"
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                    <MapPinned size={21} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2
                      id="geospatial-viewer-title"
                      className="text-lg font-semibold"
                    >
                      Jelajahi melalui Peta Interaktif{" "}
                      {siteConfig.regionShortName}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      {getGeoPortalUrl()
                        ? `Untuk melihat lokasi dan peta tematik, buka GeoPortal ${siteConfig.regionShortName}. Informasi dan berkas dataset tetap tersedia pada halaman ini.`
                        : "Peta interaktif untuk dataset ini belum tersedia. Anda tetap dapat membaca informasi dan mengunduh berkas melalui halaman ini."}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {getGeoPortalUrl() ? (
                        <a
                          href={getGeoPortalUrl()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-10 items-center gap-2 rounded-control bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
                        >
                          <MapPinned size={16} aria-hidden="true" />
                          Buka peta interaktif
                          <ExternalLink size={14} aria-hidden="true" />
                        </a>
                      ) : null}
                      <a
                        href={`${apiOrigin}/api/3/action/package_show?id=${encodeURIComponent(dataset.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-10 items-center gap-2 rounded-control border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
                      >
                        <Code2 size={16} aria-hidden="true" />
                        Lihat informasi lengkap (JSON)
                      </a>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-muted">
                      Peta interaktif menampilkan konteks lokasi dari data yang
                      dipublikasikan. Untuk mengutip atau mengolah data, gunakan
                      informasi dan berkas sumber yang tersedia pada halaman
                      ini.
                    </p>
                  </div>
                </div>
              </section>
            ) : null}
            <div>
              <h2 className="text-xl font-semibold">Berkas unduhan</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Daftar ini memuat berkas dan layanan data yang telah dibuka
                untuk umum.
              </p>
              <div className="mt-4 space-y-3">
                {publicResources.length ? (
                  publicResources.map((resource) => (
                    <div
                      key={resource.id}
                      className="surface-panel flex items-center gap-4 p-4"
                    >
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                        {isGeoJSONResource(resource) ||
                        isGeospatialServiceResource(resource) ? (
                          <MapPinned size={20} aria-hidden="true" />
                        ) : (
                          <FileSpreadsheet size={20} aria-hidden="true" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {ckanResourceName(resource)}
                        </p>
                        <p className="mt-1 text-xs uppercase text-muted">
                          {String(
                            ckanResourceFormat(resource) ||
                              resource.mimetype ||
                              "berkas",
                          ).toUpperCase()}{" "}
                          · {formatBytes(resource.size)}
                          {ckanResourceExtra(resource, "portal_resource_period")
                            ? ` · Periode ${ckanResourceExtra(resource, "portal_resource_period")}`
                            : ""}
                          {ckanResourceExtra(
                            resource,
                            "portal_resource_version",
                          )
                            ? ` · Versi ${ckanResourceExtra(resource, "portal_resource_version")}`
                            : ""}
                        </p>
                      </div>
                      <a
                        href={publicResourceUrl(resource.url) || "#"}
                        target={
                          isGeospatialServiceResource(resource)
                            ? "_blank"
                            : undefined
                        }
                        rel={
                          isGeospatialServiceResource(resource)
                            ? "noopener noreferrer"
                            : undefined
                        }
                        className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-control border bg-white px-3 text-sm font-semibold text-ink transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
                      >
                        {isGeospatialServiceResource(resource) ? (
                          <ExternalLink size={15} aria-hidden="true" />
                        ) : (
                          <Download size={15} aria-hidden="true" />
                        )}
                        {isGeospatialServiceResource(resource)
                          ? "Buka layanan"
                          : "Unduh"}
                      </a>
                    </div>
                  ))
                ) : (
                  <div className="surface-panel p-5 text-sm text-muted">
                    Belum ada berkas publik pada dataset ini.
                  </div>
                )}
              </div>
              {resources
                .filter(
                  (resource) => resource.id && isTabularResource(resource),
                )
                .map((resource) => (
                  <DatasetResourcePreview
                    key={resource.id}
                    datasetName={dataset.name}
                    resource={resource}
                    datastoreActive={resource.datastore_active === true}
                  />
                ))}
              {resources
                .filter(
                  (resource) =>
                    isGeoJSONResource(resource) &&
                    publicResourceUrl(resource.url),
                )
                .map((resource) => (
                  <GeoJSONResourcePreview
                    key={`geojson-${resource.id}`}
                    resource={resource}
                    url={publicResourceUrl(resource.url)}
                  />
                ))}
              {resources
                .filter(
                  (resource) =>
                    ckanResourceFormat(resource) === "pdf" &&
                    publicResourceUrl(resource.url),
                )
                .slice(0, 1)
                .map((resource) => (
                  <PdfResourcePreview
                    key={`pdf-${resource.id}`}
                    url={publicResourceUrl(resource.url)}
                    title="Pratinjau PDF"
                    fileName={ckanResourceName(resource)}
                    size={resource.size}
                    className="mt-6"
                    heightClassName="h-[70vh] min-h-[420px]"
                  />
                ))}
              {resources.some(
                (resource) =>
                  ["png", "jpg", "jpeg", "webp", "gif", "avif"].includes(
                    ckanResourceFormat(resource),
                  ) && publicResourceUrl(resource.url),
              ) ? (
                <section className="mt-6 rounded-2xl border border-line bg-white p-4 sm:p-5">
                  <h3 className="font-semibold">Pratinjau gambar</h3>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {resources
                      .filter(
                        (resource) =>
                          [
                            "png",
                            "jpg",
                            "jpeg",
                            "webp",
                            "gif",
                            "avif",
                          ].includes(ckanResourceFormat(resource)) &&
                          publicResourceUrl(resource.url),
                      )
                      .slice(0, 4)
                      .map((resource) => (
                        <figure
                          key={resource.id}
                          className="overflow-hidden rounded-xl bg-slate-50"
                        >
                          <ImageLightbox
                            src={publicResourceUrl(resource.url)}
                            alt={
                              resource.description ||
                              resource.name ||
                              dataset.title
                            }
                            caption={ckanResourceName(resource)}
                            group={`dataset-${dataset.name}`}
                            className="bg-slate-50"
                          >
                            <Image
                              src={publicResourceUrl(resource.url)}
                              alt={
                                resource.description ||
                                resource.name ||
                                dataset.title
                              }
                              width={1600}
                              height={1200}
                              unoptimized
                              className="h-auto max-h-[500px] w-full object-contain"
                            />
                          </ImageLightbox>
                          <figcaption className="p-3 text-sm text-muted">
                            {ckanResourceName(resource)}
                          </figcaption>
                        </figure>
                      ))}
                  </div>
                </section>
              ) : null}
            </div>
            <DatasetApiAccess
              datasetName={dataset.name}
              resources={publicResources.map((resource) => ({
                id: resource.id,
                name: ckanResourceName(resource),
                format: ckanResourceFormat(resource),
                mimetype: resource.mimetype,
                datastore_active: resource.datastore_active === true,
              }))}
            />
            <section
              className="overflow-hidden rounded-2xl border border-line bg-white"
              aria-labelledby="dataset-activity-heading"
            >
              <div className="border-b border-line p-5">
                <div className="flex items-center gap-2">
                  <Activity
                    size={18}
                    className="text-primary"
                    aria-hidden="true"
                  />
                  <h2
                    id="dataset-activity-heading"
                    className="text-lg font-semibold"
                  >
                    Riwayat pembaruan
                  </h2>
                </div>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Riwayat ini merangkum perubahan informasi dataset. Riwayat ini
                  tidak memuat seluruh versi berkas yang pernah diterbitkan.
                </p>
              </div>
              {activities.length ? (
                <ol className="divide-y divide-line px-5">
                  {activities.map((activity, index) => {
                    const rawType = String(
                      activity.activity_type || activity.activity || "updated",
                    ).toLowerCase();
                    const label = /new|create/.test(rawType)
                      ? "Dataset diterbitkan"
                      : /delete|remove/.test(rawType)
                        ? "Dataset dihapus"
                        : /change|update|edit/.test(rawType)
                          ? "Informasi dataset diperbarui"
                          : rawType.replaceAll("_", " ");
                    // Public history should not expose CKAN login names or internal user IDs.
                    const who = "Pengelola data";
                    const when =
                      activity.timestamp ||
                      activity.created_at ||
                      activity.time;
                    return (
                      <li
                        key={activity.id || `${rawType}-${when || index}`}
                        className="flex gap-3 py-4 first:pt-5 last:pb-5"
                      >
                        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-primary">
                          <Clock3 size={16} aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{label}</p>
                          <p className="mt-1 text-xs text-muted">
                            {who}
                            {when ? ` · ${formatDate(when)}` : ""}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="p-5 text-sm leading-6 text-muted">
                  Riwayat pembaruan belum tersedia untuk dataset ini.
                </p>
              )}
            </section>
          </section>
          <aside className="h-fit rounded-card border bg-white p-5 lg:sticky lg:top-24">
            <h2 className="font-semibold">Menggunakan data ini</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Saat menggunakan data ini, cantumkan judul dataset, perangkat
              daerah penerbit, periode data, sumber, dan tanggal akses.
            </p>
            {sourceUrl ? (
              <a
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary underline underline-offset-4"
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Lihat sumber data <ExternalLink size={14} />
              </a>
            ) : null}
            <p className="mt-5 border-t pt-4 text-xs leading-5 text-muted">
              Periksa definisi, sumber, lisensi, dan cakupan data sebelum
              membandingkan dataset lintas periode.
            </p>
          </aside>
        </div>
      </main>
    </>
  );
}
