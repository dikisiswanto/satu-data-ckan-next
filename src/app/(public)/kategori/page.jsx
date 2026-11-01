import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { ArrowUpRight, FolderOpen, Search } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { PublicPagination } from "@/components/public-pagination";
import { PublicNote } from "@/components/public-note";
import { normalizePageNumber } from "@/lib/pagination";
import { getPublishedDatasetFacetsResult } from "@/lib/data/public";
import { normalizePublicCategoryFacets } from "@/lib/public-categories";
import {
  getCanonicalMetadata,
  getSocialMetadata,
  siteConfig,
} from "@/lib/site-config";

const PAGE_SIZE = 24;

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("id-ID")
    .trim();
}

function categoryHref(category) {
  return `/dataset?kategori=${encodeURIComponent(category.id)}`;
}

function buildPageHref({ query, sort, page }) {
  const search = new URLSearchParams();
  if (query) search.set("q", query);
  if (sort !== "jumlah") search.set("sort", sort);
  if (page > 1) search.set("halaman", String(page));
  const suffix = search.toString();
  return suffix ? `/kategori?${suffix}` : "/kategori";
}

export async function generateMetadata({ searchParams }) {
  const params = await searchParams;
  const hasQuery = typeof params?.q === "string" && params.q.trim().length > 0;
  const hasSort = typeof params?.sort === "string" && params.sort !== "jumlah";
  const page = Number(params?.halaman || 1);
  const hasPage = Number.isSafeInteger(page) && page > 1;
  const description = `Telusuri seluruh kategori dataset umum publik ${siteConfig.regionName} beserta jumlah dataset pada setiap kategori.`;
  return {
    title: "Kategori Data",
    description,
    ...getCanonicalMetadata("/kategori"),
    ...getSocialMetadata({
      path: "/kategori",
      title: `Kategori Data | ${siteConfig.shortName}`,
      description,
    }),
    ...(hasQuery || hasSort || hasPage
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

export default async function CategoriesPage({ searchParams }) {
  await connection();
  const params = await searchParams;
  const query =
    typeof params?.q === "string" ? params.q.trim().slice(0, 100) : "";
  const requestedSort =
    typeof params?.sort === "string" ? params.sort : "jumlah";
  const sort = ["jumlah", "nama", "nama-desc"].includes(requestedSort)
    ? requestedSort
    : "jumlah";
  const requestedPage = normalizePageNumber(params?.halaman, 1, 10000);
  const result = await getPublishedDatasetFacetsResult();

  const searchTokens = normalizeSearchText(query).split(/\s+/).filter(Boolean);
  const categories = normalizePublicCategoryFacets(
    result.data?.categories || [],
  )
    .filter((category) => {
      if (!searchTokens.length) return true;
      const haystack = normalizeSearchText(`${category.name} ${category.id}`);
      return searchTokens.every((token) => haystack.includes(token));
    })
    .sort((left, right) => {
      if (sort === "nama") return left.name.localeCompare(right.name, "id-ID");
      if (sort === "nama-desc")
        return right.name.localeCompare(left.name, "id-ID");
      return (
        right.count - left.count || left.name.localeCompare(right.name, "id-ID")
      );
    });

  const totalItems = categories.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  if (requestedPage !== page) {
    redirect(buildPageHref({ query, sort, page }));
  }
  const visibleCategories = categories.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );
  const pageHref = (number) => buildPageHref({ query, sort, page: number });

  return (
    <main className="page-container section-space public-interior-page">
      <PageHeading
        eyebrow="JELAJAHI KATALOG"
        title="Kategori Data"
        description={`Telusuri kelompok dataset umum yang diterbitkan perangkat daerah ${siteConfig.regionName}. Pilih kategori untuk melihat dataset di dalamnya.`}
        className="mb-6 sm:mb-7"
      />

      <form
        action="/kategori"
        method="get"
        role="search"
        aria-label="Cari kategori data"
        className="mb-6 grid gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_13rem_auto] sm:items-end sm:p-5"
      >
        <div className="min-w-0">
          <label
            htmlFor="category-search"
            className="mb-2 block text-sm font-semibold text-ink"
          >
            Cari kategori
          </label>
          <div className="relative">
            <Search
              size={18}
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              id="category-search"
              name="q"
              type="search"
              maxLength={100}
              defaultValue={query}
              placeholder="Masukkan nama kategori…"
              autoComplete="off"
              className="h-12 w-full rounded-xl border border-line bg-white pl-10 pr-3 text-sm text-ink shadow-sm outline-none transition placeholder:text-muted/80 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-focus"
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="category-sort"
            className="mb-2 block text-sm font-semibold text-ink"
          >
            Urutkan
          </label>
          <select
            id="category-sort"
            name="sort"
            defaultValue={sort}
            className="h-12 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink shadow-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-focus"
          >
            <option value="jumlah">Dataset terbanyak</option>
            <option value="nama">Nama A–Z</option>
            <option value="nama-desc">Nama Z–A</option>
          </select>
        </div>
        <button
          type="submit"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
        >
          <Search size={16} aria-hidden="true" /> Cari
        </button>
      </form>

      {result.unavailable ? (
        <section className="public-empty-panel p-6 sm:p-8" role="alert">
          <h2 className="font-semibold">Kategori belum dapat dimuat</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Katalog kategori sementara tidak dapat dihubungi. Coba muat ulang
            halaman beberapa saat lagi.
          </p>
          <Link
            href="/kategori"
            className="mt-4 inline-flex text-sm font-semibold text-primary underline underline-offset-4"
          >
            Coba lagi
          </Link>
        </section>
      ) : visibleCategories.length ? (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted" aria-live="polite">
              {query
                ? `Ditemukan ${new Intl.NumberFormat("id-ID").format(totalItems)} kategori`
                : `${new Intl.NumberFormat("id-ID").format(totalItems)} kategori dataset publik`}
            </p>
            <Link
              href="/dataset"
              className="text-sm font-semibold text-primary hover:underline"
            >
              Buka katalog dataset{" "}
              <ArrowUpRight size={15} className="inline" aria-hidden="true" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleCategories.map((category) => (
              <Link
                key={category.id}
                href={categoryHref(category)}
                data-public-list-item="true"
                className="group flex min-w-0 items-center gap-3 rounded-xl border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <span
                  className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface text-primary"
                  aria-hidden="true"
                >
                  <FolderOpen size={21} />
                </span>
                <span className="min-w-0 flex-1">
                  <strong
                    className="block truncate text-sm font-semibold text-ink group-hover:text-primary"
                    title={category.name}
                  >
                    {category.name}
                  </strong>
                  <span className="mt-1 block text-xs tabular-nums text-muted">
                    {new Intl.NumberFormat("id-ID").format(category.count)}{" "}
                    dataset umum
                  </span>
                </span>
                <ArrowUpRight
                  size={17}
                  className="shrink-0 text-muted transition group-hover:text-primary"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
          <PublicPagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={PAGE_SIZE}
            itemLabel="kategori"
            ariaLabel="Halaman kategori data"
            hrefForPage={pageHref}
          />
        </>
      ) : (
        <section className="public-empty-panel p-6 sm:p-8" role="status">
          <h2 className="font-semibold">Kategori tidak ditemukan</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            {query
              ? "Tidak ada kategori yang cocok dengan kata kunci tersebut."
              : "Belum ada kategori dengan dataset umum publik."}
          </p>
          {query ? (
            <Link
              href="/kategori"
              className="mt-4 inline-flex text-sm font-semibold text-primary underline underline-offset-4"
            >
              Hapus pencarian
            </Link>
          ) : null}
        </section>
      )}

      <PublicNote className="mt-8">
        Jumlah pada setiap kategori mengikuti dataset umum publik di CKAN.
        Konten indikator, infografik, dan publikasi ditampilkan pada katalog
        masing-masing.
      </PublicNote>
    </main>
  );
}
