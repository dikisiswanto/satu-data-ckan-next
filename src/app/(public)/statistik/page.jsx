import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { ArrowUpRight, ChartNoAxesColumn, Database } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { PublicPagination } from "@/components/public-pagination";
import { normalizePageNumber } from "@/lib/pagination";
import { PublicNote } from "@/components/public-note";
import { CatalogSearchForm } from "@/components/catalog-search-form";
import { publicPageCopy } from "@/lib/public-copy";
import { GeoPortalStatisticsPromo } from "@/components/geoportal-statistics-promo";
import { getPublishedIndicatorsResult } from "@/lib/data/public";
import {
  getCanonicalMetadata,
  getSocialMetadata,
  siteConfig,
} from "@/lib/site-config";

export async function generateMetadata({ searchParams }) {
  const params = await searchParams;
  const hasOrganizationFilter =
    typeof params?.organisasi === "string" &&
    params.organisasi.trim().length > 0;
  const hasSearchFilter =
    typeof params?.q === "string" && params.q.trim().length > 0;
  const hasSortFilter =
    typeof params?.sort === "string" && params.sort !== "terbaru";
  const pageNumber = Number(params?.halaman || 1);
  const isPaginated = Number.isSafeInteger(pageNumber) && pageNumber > 1;
  const description = `Jelajahi indikator dan data makro ${siteConfig.regionName} dengan definisi, satuan, periode, serta sumber yang dapat ditelusuri.`;
  return {
    title: "Statistik dan Indikator",
    description,
    ...getCanonicalMetadata("/statistik"),
    ...getSocialMetadata({
      path: "/statistik",
      title: `Statistik dan Indikator | ${siteConfig.shortName}`,
      description: `Indikator pembangunan ${siteConfig.regionName} beserta nilai, periode, dan sumber datanya.`,
    }),
    ...(hasOrganizationFilter || hasSearchFilter || hasSortFilter || isPaginated
      ? {
          robots: {
            index: false,
            follow: true,
            googleBot: { index: false, follow: true },
          },
        }
      : {}),
  };
}

const PAGE_SIZE = 12;
function formatValue(value) {
  if (value === null || value === undefined || value === "")
    return "Belum tersedia";
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? new Intl.NumberFormat("id-ID", { maximumFractionDigits: 4 }).format(
        numeric,
      )
    : String(value);
}

export default async function StatistikPage({ searchParams }) {
  await connection();
  const params = await searchParams;
  const page = normalizePageNumber(params?.halaman, 1, 10000);
  const requestedOrganization =
    typeof params?.organisasi === "string"
      ? params.organisasi.slice(0, 100)
      : "";
  const organizationId = /^[a-z0-9][a-z0-9_-]*$/i.test(requestedOrganization)
    ? requestedOrganization
    : null;
  const query =
    typeof params?.q === "string" ? params.q.trim().slice(0, 100) : "";
  const requestedSort =
    typeof params?.sort === "string" ? params.sort : "terbaru";
  const sort = ["terbaru", "judul", "relevansi"].includes(requestedSort)
    ? requestedSort
    : "terbaru";
  const result = await getPublishedIndicatorsResult({
    limit: PAGE_SIZE,
    page,
    organizationId,
    query,
    sort,
    includeLatest: false,
  });
  if (result.unavailable) await connection();
  const indicators = result.data || [];
  const pageHref = (number) => {
    const search = new URLSearchParams();
    if (organizationId) search.set("organisasi", organizationId);
    if (query) search.set("q", query);
    if (sort !== "terbaru") search.set("sort", sort);
    if (number > 1) search.set("halaman", String(number));
    const suffix = search.toString();
    return suffix ? `/statistik?${suffix}` : "/statistik";
  };
  const totalPages = Math.max(1, Number(result.meta?.last_page || 1));
  if (!result.unavailable && page > totalPages) redirect(pageHref(totalPages));

  return (
    <main className="page-container section-space public-interior-page public-statistics-page">
      <PageHeading {...publicPageCopy.statistik} />
      <CatalogSearchForm
        action="/statistik"
        query={query}
        sort={sort}
        organizationId={organizationId}
        label="Cari indikator"
        placeholder="Cari nama indikator, definisi, satuan, sumber, atau OPD penerbit…"
      />
      {organizationId ? (
        <p className="mb-4 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-muted">
          Menampilkan indikator yang diterbitkan oleh perangkat daerah{" "}
          <strong className="text-ink">{organizationId}</strong>.{" "}
          <Link
            href="/statistik"
            className="font-semibold text-primary underline underline-offset-4"
          >
            Hapus filter
          </Link>
        </p>
      ) : null}
      <GeoPortalStatisticsPromo />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {result.unavailable
            ? null
            : `${Number(result.meta?.total || 0).toLocaleString("id-ID")} indikator tersedia.`}
        </p>
        <Link
          href="/api-data#indikator"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline underline-offset-4"
        >
          Panduan API untuk pengembang{" "}
          <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </div>

      {indicators.length ? (
        <>
          <div
            id="statistics-list"
            tabIndex={-1}
            aria-label="Daftar indikator statistik"
            className="grid scroll-mt-24 gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            {indicators.map((indicator, index) => (
              <article
                data-public-list-item="true"
                key={indicator.name}
                className={`statistics-card statistics-card-tone-${index % 4}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="statistics-card-source">
                    {indicator.organization?.title ||
                      indicator.organization?.name ||
                      "Perangkat daerah penerbit"}
                  </p>
                  <span className="statistics-card-icon">
                    <ChartNoAxesColumn size={18} aria-hidden="true" />
                  </span>
                </div>
                <h2 className="mt-4 break-words text-lg font-semibold leading-6">
                  <Link
                    href={`/statistik/${encodeURIComponent(indicator.name)}`}
                    className="rounded-sm hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    {indicator.title}
                  </Link>
                </h2>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">
                  {indicator.metadata.definition}
                </p>
                <div className="statistics-card-value">
                  <strong>
                    {indicator.latest
                      ? formatValue(indicator.latest.value)
                      : indicator.metadata.referencePeriod || "Data tersedia"}
                  </strong>
                  <span>
                    {indicator.latest
                      ? indicator.metadata.unit
                      : `Periode referensi · ${indicator.metadata.unit}`}
                  </span>
                </div>
                <dl className="statistics-card-meta">
                  <div>
                    <dt>Periode terbaru</dt>
                    <dd>
                      {indicator.latest?.period ||
                        indicator.metadata.referencePeriod ||
                        "Belum dicantumkan"}
                    </dd>
                  </div>
                  <div>
                    <dt>Sumber</dt>
                    <dd>
                      {indicator.metadata.source || "Sumber belum dicantumkan"}
                    </dd>
                  </div>
                </dl>
                <Link
                  href={`/statistik/${encodeURIComponent(indicator.name)}`}
                  className="mt-4 inline-flex min-h-9 items-center gap-2 text-sm font-semibold text-primary underline underline-offset-4"
                >
                  Lihat tren dan detail{" "}
                  <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
          <PublicPagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={result.meta?.total}
            pageSize={PAGE_SIZE}
            itemLabel="indikator"
            ariaLabel="Navigasi halaman indikator"
            hrefForPage={pageHref}
          />
        </>
      ) : (
        <section
          className="public-empty-panel"
          role={result.unavailable ? "alert" : "status"}
        >
          <span className="public-empty-icon">
            <Database size={23} aria-hidden="true" />
          </span>
          <p className="eyebrow mt-5">
            {result.unavailable ? "Informasi sementara" : "Belum ada indikator"}
          </p>
          <h2 className="mt-2 text-xl font-semibold">
            {result.unavailable
              ? "Indikator belum dapat dimuat"
              : query
                ? "Tidak ada indikator yang cocok"
                : "Belum ada indikator yang tersedia"}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            {result.unavailable
              ? "Data statistik belum dapat ditampilkan saat ini. Silakan coba kembali beberapa saat lagi."
              : query
                ? `Tidak ditemukan indikator dengan kata kunci “${query}”. Coba istilah lain atau hapus pencarian.`
                : "Indikator akan ditampilkan setelah dipublikasikan oleh perangkat daerah. Untuk melihat data yang sudah tersedia, silakan kunjungi katalog dataset."}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
            <Link href="/dataset" className="public-empty-action">
              Jelajahi katalog dataset{" "}
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
            <Link
              href="/api-data#indikator"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline underline-offset-4"
            >
              Dokumentasi API
            </Link>
          </div>
        </section>
      )}
      <PublicNote>
        Nilai indikator perlu dibaca bersama definisi, satuan, periode, dan
        sumbernya. Perbedaan periode atau metodologi dapat memengaruhi
        keterbandingan antarangka.
      </PublicNote>
    </main>
  );
}
