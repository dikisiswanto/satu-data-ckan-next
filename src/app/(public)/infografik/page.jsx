import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { ArrowUpRight, Images } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { PublicPagination } from "@/components/public-pagination";
import { normalizePageNumber } from "@/lib/pagination";
import { PublicNote } from "@/components/public-note";
import { CatalogSearchForm } from "@/components/catalog-search-form";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { publicPageCopy } from "@/lib/public-copy";
import { getPublishedInfographicsResult } from "@/lib/data/public-infographics";
import {
  getCanonicalMetadata,
  getSocialMetadata,
  siteConfig,
} from "@/lib/site-config";
import { safeHttpUrl } from "@/lib/utils";

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
  const description = `Infografik resmi dan visualisasi data ${siteConfig.regionName}.`;
  return {
    title: "Infografik",
    description,
    ...getCanonicalMetadata("/infografik"),
    ...getSocialMetadata({
      path: "/infografik",
      title: `Infografik | ${siteConfig.shortName}`,
      description: `Lihat infografik dan ringkasan data resmi ${siteConfig.regionName}.`,
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

export default async function InfografikPage({ searchParams }) {
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
  const result = await getPublishedInfographicsResult({
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
    return suffix ? `/infografik?${suffix}` : "/infografik";
  };
  const totalPages = Math.max(1, Number(result.meta?.last_page || 1));
  if (!result.unavailable && page > totalPages) redirect(pageHref(totalPages));

  return (
    <main className="page-container section-space public-interior-page">
      <PageHeading {...publicPageCopy.infografik} />
      <CatalogSearchForm
        action="/infografik"
        query={query}
        sort={sort}
        organizationId={organizationId}
        label="Cari infografik"
        placeholder="Cari judul, kategori, periode, deskripsi, atau OPD penerbit…"
      />
      {organizationId ? (
        <p className="mb-4 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-muted">
          Menampilkan infografik yang diterbitkan oleh perangkat daerah{" "}
          <strong className="text-ink">{organizationId}</strong>.{" "}
          <Link
            href="/infografik"
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
            : `${Number(result.meta?.total || 0).toLocaleString("id-ID")} infografik tersedia.`}
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
          id="infographic-list"
          tabIndex={-1}
          aria-label="Daftar infografik"
          className="grid scroll-mt-24 gap-5 sm:grid-cols-2 xl:grid-cols-3"
        >
          {items.map((item) => {
            const imageUrl = safeHttpUrl(item.cover?.url);
            return (
              <article
                data-public-list-item="true"
                key={item.name}
                className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {imageUrl ? (
                  <ImageLightbox
                    src={imageUrl}
                    alt={item.title}
                    caption={item.category || item.period || "Infografik"}
                    group={`infographic-list-${item.name}`}
                    className="aspect-[4/3] bg-slate-50"
                  >
                    <div className="relative h-full w-full">
                      <Image
                        src={imageUrl}
                        alt={item.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        unoptimized
                        className="object-contain"
                      />
                    </div>
                  </ImageLightbox>
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-slate-50 text-muted">
                    <div className="flex flex-col items-center gap-3 p-8 text-center">
                      <Images size={38} aria-hidden="true" />
                      <span className="text-sm">
                        Pratinjau visual belum tersedia
                      </span>
                    </div>
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wide text-muted">
                    <span>{item.category}</span>
                    {item.period ? <span>{item.period}</span> : null}
                  </div>
                  <h2 className="mt-3 break-words text-lg font-semibold leading-6 text-ink">
                    <Link
                      href={`/infografik/${encodeURIComponent(item.name)}`}
                      className="rounded-sm hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      {item.title}
                    </Link>
                  </h2>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">
                    {item.notes || "Deskripsi infografik belum tersedia."}
                  </p>
                  <Link
                    href={`/infografik/${encodeURIComponent(item.name)}`}
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"
                  >
                    Buka infografik{" "}
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <section
          className="public-empty-panel"
          role={result.unavailable ? "alert" : "status"}
        >
          <span className="public-empty-icon">
            <Images size={23} aria-hidden="true" />
          </span>
          <p className="eyebrow mt-5">
            {result.unavailable ? "Informasi sementara" : "Belum tersedia"}
          </p>
          <h2 className="mt-2 text-xl font-semibold">
            {result.unavailable
              ? "Infografik belum dapat ditampilkan"
              : query
                ? "Tidak ada infografik yang cocok"
                : "Belum ada infografik yang tersedia"}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            {result.unavailable
              ? "Silakan coba kembali beberapa saat lagi."
              : query
                ? `Tidak ditemukan infografik dengan kata kunci “${query}”. Coba istilah lain atau hapus pencarian.`
                : "Infografik akan ditampilkan setelah diterbitkan untuk umum oleh perangkat daerah. Dataset yang menjadi sumbernya dapat ditelusuri melalui katalog data."}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
            <Link href="/dataset" className="public-empty-action">
              Jelajahi katalog dataset{" "}
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </section>
      )}

      <PublicPagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={result.meta?.total}
        pageSize={18}
        itemLabel="infografik"
        ariaLabel="Navigasi halaman Infografik"
        hrefForPage={pageHref}
      />
      <PublicNote>
        Infografik dan berkas unduhan hanya menampilkan materi yang telah
        dipublikasikan untuk umum oleh perangkat daerah.
      </PublicNote>
    </main>
  );
}
