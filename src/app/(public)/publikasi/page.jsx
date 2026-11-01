import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  FileText,
  LibraryBig,
} from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { PublicPagination } from "@/components/public-pagination";
import { normalizePageNumber } from "@/lib/pagination";
import { PublicNote } from "@/components/public-note";
import { CatalogSearchForm } from "@/components/catalog-search-form";
import { publicPageCopy } from "@/lib/public-copy";
import { getPublishedPublicationsResult } from "@/lib/data/public-publications";
import {
  getCanonicalMetadata,
  getSocialMetadata,
  siteConfig,
} from "@/lib/site-config";
import { formatDate } from "@/lib/utils";

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
  const description = `Temukan publikasi statistik, laporan, dan dokumen resmi ${siteConfig.regionName}.`;
  return {
    title: "Publikasi dan laporan",
    description,
    ...getCanonicalMetadata("/publikasi"),
    ...getSocialMetadata({
      path: "/publikasi",
      title: `Publikasi dan laporan | ${siteConfig.shortName}`,
      description: `Publikasi dan laporan resmi ${siteConfig.regionName}.`,
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

export default async function PublicationsPage({ searchParams }) {
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
  const result = await getPublishedPublicationsResult({
    limit: 18,
    page,
    organizationId,
    query,
    sort,
  });
  if (result.unavailable) await connection();
  const items = result.data || [];
  const pageHref = (number) => {
    const search = new URLSearchParams();
    if (organizationId) search.set("organisasi", organizationId);
    if (query) search.set("q", query);
    if (sort !== "terbaru") search.set("sort", sort);
    if (number > 1) search.set("halaman", String(number));
    const suffix = search.toString();
    return suffix ? `/publikasi?${suffix}` : "/publikasi";
  };
  const totalPages = Math.max(1, Number(result.meta?.last_page || 1));
  if (!result.unavailable && page > totalPages) redirect(pageHref(totalPages));

  return (
    <main className="page-container section-space public-interior-page">
      <PageHeading {...publicPageCopy.publikasi} />
      <CatalogSearchForm
        action="/publikasi"
        query={query}
        sort={sort}
        organizationId={organizationId}
        label="Cari publikasi"
        placeholder="Cari judul, kategori, periode, deskripsi, atau OPD penerbit…"
      />
      {organizationId ? (
        <p className="mb-4 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-muted">
          Menampilkan publikasi yang diterbitkan oleh perangkat daerah{" "}
          <strong className="text-ink">{organizationId}</strong>.{" "}
          <Link
            href="/publikasi"
            className="font-semibold text-primary underline underline-offset-4"
          >
            Hapus filter
          </Link>
        </p>
      ) : null}
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
        <div
          id="publication-list"
          tabIndex={-1}
          aria-label="Daftar publikasi"
          className="grid scroll-mt-24 gap-4 lg:grid-cols-2"
        >
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
              : query
                ? "Tidak ada publikasi yang cocok"
                : "Belum ada publikasi yang diterbitkan"}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            {result.unavailable
              ? "Daftar publikasi belum dapat ditampilkan. Silakan coba kembali beberapa saat lagi."
              : query
                ? `Tidak ditemukan publikasi dengan kata kunci “${query}”. Coba istilah lain atau hapus pencarian.`
                : "Publikasi akan ditampilkan setelah dokumen resmi diterbitkan dan dibuka untuk umum oleh perangkat daerah."}
          </p>
          <Link href="/dataset" className="public-empty-action mt-5">
            Telusuri katalog data <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </section>
      )}
      <PublicPagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={result.meta?.total}
        pageSize={18}
        itemLabel="publikasi"
        ariaLabel="Navigasi halaman publikasi"
        hrefForPage={pageHref}
      />
      <PublicNote>
        Publikasi yang ditampilkan merupakan dokumen yang telah diterbitkan dan
        dibuka untuk umum. Ketersediaan pratinjau bergantung pada format berkas
        dan dukungan browser.
      </PublicNote>
    </main>
  );
}
