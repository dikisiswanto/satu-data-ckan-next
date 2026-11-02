import { cookies } from "next/headers";
import { Filter, LayoutGrid, List as ListIcon, Search } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { publicPageCopy } from "@/lib/public-copy";
import { getDatasetViewPreference } from "@/lib/dataset-view-preference";

function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`loading-skeleton ${className}`} />;
}

function DatasetCardSkeleton() {
  return (
    <article
      className="flex h-full min-w-0 flex-col rounded-2xl border border-line bg-white p-5 shadow-[0_4px_20px_rgb(24_58_68_/_0.04)] sm:p-6"
      aria-hidden="true"
    >
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="size-4 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-6 w-4/5" />
      <Skeleton className="mt-2 h-6 w-3/5" />
      <div className="mt-2 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="mt-auto space-y-3 pt-6">
        <Skeleton className="h-3 w-2/3" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-20 rounded-md" />
          <Skeleton className="h-6 w-16 rounded-md" />
        </div>
        <Skeleton className="h-3 w-1/2 border-t border-line pt-3" />
      </div>
    </article>
  );
}

function DatasetListSkeleton() {
  return (
    <article
      className="flex min-w-0 flex-col gap-3 rounded-2xl border border-line bg-white px-4 py-4 shadow-[0_2px_10px_rgb(24_58_68_/_0.03)] sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-5"
      aria-hidden="true"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="mt-2 h-5 w-4/5" />
        <Skeleton className="mt-2 h-4 w-full" />
        <Skeleton className="mt-1 h-4 w-5/6" />
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 sm:max-w-[15rem] sm:flex-col sm:items-end sm:gap-2">
        <Skeleton className="h-3 w-36 max-w-full" />
        <Skeleton className="h-3 w-28" />
      </div>
    </article>
  );
}

export default async function DatasetCatalogLoading() {
  const cookieStore = await cookies();
  const view = getDatasetViewPreference(cookieStore);

  return (
    <main aria-busy="true" aria-label="Memuat hasil katalog dataset">
      <section className="relative z-10 [overflow:visible] border-b border-[#d9e1dc] bg-[linear-gradient(135deg,#eef3ee_0%,#edf4f6_60%,#f7f9fb_100%)]">
        <div className="page-container py-10 sm:py-14">
          <PageHeading {...publicPageCopy.dataset} />
          <div className="mt-8 rounded-2xl border border-[#d5e0e8] bg-white p-3 shadow-[0_8px_28px_rgb(20_55_60_/_0.07)] sm:p-4">
            <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
              <div className="min-w-0">
                <p className="mb-2 block text-sm font-semibold">Kata kunci</p>
                <div className="relative">
                  <Search
                    size={18}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                  />
                  <Skeleton className="h-12 w-full rounded-control" />
                </div>
                <Skeleton className="mt-2 h-3 w-11/12 max-w-2xl" />
              </div>
              <Skeleton className="h-12 w-full rounded-control sm:w-36" />
              <div className="flex h-12 w-full items-center justify-center gap-2 rounded-control border border-line bg-surface px-4 sm:w-28">
                <Filter size={16} aria-hidden="true" className="text-muted" />
                <span className="text-sm font-semibold text-muted">Filter</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="page-container pb-12 pt-8"
        aria-label="Hasil katalog sedang dimuat"
      >
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">Hasil penelusuran</p>
            <Skeleton className="mt-2 h-8 w-72 max-w-full" />
            <Skeleton className="mt-2 h-4 w-48 max-w-full" />
          </div>
          <nav
            className="inline-flex items-center rounded-xl border border-line bg-white p-1"
            aria-label="Memuat pilihan tampilan katalog"
            aria-hidden="true"
          >
            <span
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold ${view === "cards" ? "bg-primary text-white" : "text-muted"}`}
            >
              <LayoutGrid size={15} aria-hidden="true" /> Kartu
            </span>
            <span
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold ${view === "list" ? "bg-primary text-white" : "text-muted"}`}
            >
              <ListIcon size={15} aria-hidden="true" /> Daftar
            </span>
          </nav>
        </div>

        {view === "list" ? (
          <div className="public-loading-list grid gap-3" aria-hidden="true">
            {Array.from({ length: 4 }, (_, index) => (
              <DatasetListSkeleton key={index} />
            ))}
          </div>
        ) : (
          <div
            className="public-loading-grid-md grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            aria-hidden="true"
          >
            {Array.from({ length: 3 }, (_, index) => (
              <DatasetCardSkeleton key={index} />
            ))}
          </div>
        )}
        <p className="sr-only" role="status">
          Sedang memuat hasil dataset.
        </p>
      </section>
    </main>
  );
}
