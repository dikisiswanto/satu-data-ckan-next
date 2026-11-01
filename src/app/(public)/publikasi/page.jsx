import Link from "next/link";
import { connection } from "next/server";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  FileText,
  LibraryBig,
} from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { publicPageCopy } from "@/lib/public-copy";
import { getPublishedPublicationsResult } from "@/lib/data/public-publications";
import {
  getCanonicalMetadata,
  getSocialMetadata,
  siteConfig,
} from "@/lib/site-config";
import { formatDate } from "@/lib/utils";

export const metadata = {
  title: "Publikasi dan laporan",
  description: `Temukan publikasi statistik, laporan, dan dokumen resmi ${siteConfig.regionName}.`,
  ...getCanonicalMetadata("/publikasi"),
  ...getSocialMetadata({
    path: "/publikasi",
    title: `Publikasi | ${siteConfig.shortName}`,
    description: `Publikasi dan laporan resmi ${siteConfig.regionName}.`,
  }),
};

export default async function PublicationsPage({ searchParams }) {
  await connection();
  const params = await searchParams;
  const requested =
    typeof params?.halaman === "string" ? Number(params.halaman) : 1;
  const page =
    Number.isSafeInteger(requested) && requested > 0
      ? Math.min(requested, 10000)
      : 1;
  const result = await getPublishedPublicationsResult({ limit: 18, page });
  if (result.unavailable) await connection();
  const items = result.data || [];

  return (
    <main className="page-container section-space public-interior-page">
      <PageHeading {...publicPageCopy.publikasi} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {result.unavailable
            ? null
            : `${Number(result.meta?.total || 0).toLocaleString("id-ID")} publikasi tersedia.`}
        </p>
        <Link
          href="/dataset"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline underline-offset-4"
        >
          Telusuri katalog data <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </div>
      {items.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <article
              data-public-list-item="true"
              key={item.name}
              className="group flex min-w-0 gap-4 rounded-2xl border border-line bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6"
            >
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-primary">
                <BookOpen size={23} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  <span>{item.category}</span>
                  {item.period ? (
                    <span className="rounded-full bg-slate-100 px-2 py-1 normal-case tracking-normal">
                      Periode {item.period}
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-3 break-words text-lg font-semibold leading-6 text-ink">
                  <Link
                    href={`/publikasi/${encodeURIComponent(item.name)}`}
                    className="hover:text-primary hover:underline"
                  >
                    {item.title}
                  </Link>
                </h2>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">
                  {item.notes || "Deskripsi publikasi belum tersedia."}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays size={14} aria-hidden="true" />
                    {item.publicationDate
                      ? formatDate(item.publicationDate)
                      : "Tanggal terbit belum dicantumkan"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <FileText size={14} aria-hidden="true" />
                    {item.resources.length} berkas
                  </span>
                  {item.version ? <span>Versi {item.version}</span> : null}
                </div>
                <Link
                  href={`/publikasi/${encodeURIComponent(item.name)}`}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"
                >
                  Lihat detail publikasi{" "}
                  <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section
          className="public-empty-panel"
          role={result.unavailable ? "alert" : "status"}
        >
          <span className="public-empty-icon">
            <LibraryBig size={24} aria-hidden="true" />
          </span>
          <p className="eyebrow mt-5">Dokumen resmi</p>
          <h2 className="mt-2 text-xl font-semibold">
            {result.unavailable
              ? "Publikasi belum dapat dimuat"
              : "Belum ada publikasi yang diterbitkan"}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            {result.unavailable
              ? "Daftar publikasi belum dapat ditampilkan. Silakan coba kembali beberapa saat lagi."
              : "Publikasi akan ditampilkan setelah dokumen resmi diterbitkan dan dibuka untuk umum oleh perangkat daerah."}
          </p>
          <Link href="/dataset" className="public-empty-action mt-5">
            Telusuri katalog data <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </section>
      )}
      {items.length &&
      (page > 1 || page < Number(result.meta?.last_page || 1)) ? (
        <nav
          aria-label="Navigasi halaman publikasi"
          className="mt-8 flex justify-between border-t border-line pt-5"
        >
          {page > 1 ? (
            <Link
              rel="prev"
              href={
                page === 2 ? "/publikasi" : `/publikasi?halaman=${page - 1}`
              }
              className="text-sm font-semibold text-primary underline underline-offset-4"
            >
              Sebelumnya
            </Link>
          ) : (
            <span />
          )}
          {page < Number(result.meta?.last_page || 1) ? (
            <Link
              rel="next"
              href={`/publikasi?halaman=${page + 1}`}
              className="text-sm font-semibold text-primary underline underline-offset-4"
            >
              Berikutnya
            </Link>
          ) : null}
        </nav>
      ) : null}
    </main>
  );
}
