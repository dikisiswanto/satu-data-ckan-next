import Link from "next/link";
import { connection } from "next/server";
import { ArrowUpRight, ChartNoAxesColumn, Database, Info } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { publicPageCopy } from "@/lib/public-copy";
import { GeoPortalStatisticsPromo } from "@/components/geoportal-statistics-promo";
import { getPublishedIndicatorsResult } from "@/lib/data/public";
import {
  getCanonicalMetadata,
  getSocialMetadata,
  siteConfig,
} from "@/lib/site-config";

export const metadata = {
  title: "Statistik dan Indikator",
  description: `Jelajahi indikator dan data makro ${siteConfig.regionName} dengan definisi, satuan, periode, serta sumber yang dapat ditelusuri.`,
  ...getCanonicalMetadata("/statistik"),
  ...getSocialMetadata({
    path: "/statistik",
    title: `Statistik dan Indikator | ${siteConfig.shortName}`,
    description: `Indikator pembangunan ${siteConfig.regionName} beserta nilai, periode, dan sumber datanya.`,
  }),
};

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
  const requested =
    typeof params?.halaman === "string" ? Number(params.halaman) : 1;
  const page =
    Number.isSafeInteger(requested) && requested > 0
      ? Math.min(requested, 10000)
      : 1;
  const result = await getPublishedIndicatorsResult({ limit: PAGE_SIZE, page });
  if (result.unavailable) await connection();
  const indicators = result.data || [];
  const hasNextPage = page < Number(result.meta?.last_page || 1);
  const pageHref = (number) =>
    number > 1 ? `/statistik?halaman=${number}` : "/statistik";

  return (
    <main className="page-container section-space public-interior-page public-statistics-page">
      <PageHeading {...publicPageCopy.statistik} />
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
            className="grid scroll-mt-24 gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            {indicators.map((indicator, index) => (
              <article
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
                <h2 className="mt-4 text-lg font-semibold leading-6">
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
                  <strong>{formatValue(indicator.latest?.value)}</strong>
                  <span>{indicator.metadata.unit}</span>
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
          {(page > 1 || hasNextPage) && (
            <nav
              aria-label="Navigasi halaman indikator"
              className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5"
            >
              <p className="text-sm text-muted">
                Halaman {page} ·{" "}
                {Number(result.meta?.total || 0).toLocaleString("id-ID")}{" "}
                indikator
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    rel="prev"
                    href={pageHref(page - 1)}
                    scroll={false}
                    className="rounded-control border border-line bg-surface px-4 py-2.5 text-sm font-semibold hover:bg-accent"
                  >
                    Sebelumnya
                  </Link>
                )}
                {hasNextPage && (
                  <Link
                    rel="next"
                    href={pageHref(page + 1)}
                    scroll={false}
                    className="rounded-control bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
                  >
                    Berikutnya
                  </Link>
                )}
              </div>
            </nav>
          )}
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
              : "Belum ada indikator yang tersedia"}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            {result.unavailable
              ? "Data statistik belum dapat ditampilkan saat ini. Silakan coba kembali beberapa saat lagi."
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
          <p className="mt-5 flex items-start justify-center gap-2 text-xs leading-5 text-muted">
            <Info size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
            Nilai statistik hanya ditampilkan jika sumber datanya tersedia untuk
            publik.
          </p>
        </section>
      )}
    </main>
  );
}
