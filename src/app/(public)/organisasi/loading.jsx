import { PageHeading } from "@/components/page-heading";
import { publicPageCopy } from "@/lib/public-copy";
import { Search, SlidersHorizontal } from "lucide-react";

function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`loading-skeleton ${className}`} />;
}

function OrganizationCardSkeleton() {
  return (
    <article
      className="organization-directory-card flex min-w-0 flex-col rounded-2xl border border-line bg-white p-5"
      aria-hidden="true"
    >
      <div className="organization-directory-card-top flex items-center justify-between gap-3">
        <Skeleton className="size-11 rounded-xl" />
        <Skeleton className="h-3 w-32 max-w-[55%]" />
      </div>
      <Skeleton className="mt-4 h-5 w-4/5" />
      <Skeleton className="mt-2 h-4 w-full" />
      <Skeleton className="mt-1 h-4 w-5/6" />
      <div className="organization-directory-card-metrics mt-4 grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="organization-directory-metric">
            <Skeleton className="h-5 w-8" />
            <Skeleton className="mt-1 h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-4">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-4 w-24" />
      </div>
    </article>
  );
}

export default function OrganizationDirectoryLoading() {
  return (
    <main
      className="page-container section-space public-interior-page organization-directory-page"
      aria-busy="true"
    >
      <PageHeading {...publicPageCopy.organisasi} className="mb-6 sm:mb-6" />
      <section
        className="organization-directory-toolbar"
        aria-label="Memuat daftar perangkat daerah"
      >
        <div className="organization-directory-intro">
          <div className="min-w-0">
            <p className="eyebrow">SUMBER DATA DAERAH</p>
            <h2>Temukan perangkat daerah</h2>
            <p>
              Kenali perangkat daerah serta seluruh dataset, indikator,
              infografik, dan publikasi yang diterbitkan untuk umum.
            </p>
          </div>
          <div className="organization-directory-summary" aria-hidden="true">
            {[
              ["w-10", "w-24"],
              ["w-12", "w-20"],
              ["w-10", "w-20"],
              ["w-10", "w-20"],
              ["w-10", "w-20"],
            ].map(([numberWidth, labelWidth], index) => (
              <div key={index}>
                <Skeleton className={`h-6 ${numberWidth}`} />
                <Skeleton className={`mt-1 h-3 ${labelWidth}`} />
              </div>
            ))}
          </div>
        </div>

        <div className="organization-directory-controls">
          <div className="organization-directory-search min-w-0 flex-1">
            <p className="mb-2 text-sm font-semibold">Cari perangkat daerah</p>
            <div className="relative">
              <Search
                size={18}
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
              />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
            <Skeleton className="mt-1.5 h-3 w-64 max-w-full" />
          </div>
          <div className="organization-directory-sort">
            <p className="mb-2 text-sm font-semibold">Urutkan daftar</p>
            <div className="relative">
              <SlidersHorizontal
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div
            className="organization-directory-filters"
            role="group"
            aria-label="Filter perangkat daerah berdasarkan penerbitan"
            aria-hidden="true"
          >
            <Skeleton className="h-3 w-24" />
            <div className="mt-2 flex flex-wrap gap-2">
              <Skeleton className="h-9 w-20 rounded-full" />
              <Skeleton className="h-9 w-36 rounded-full" />
              <Skeleton className="h-9 w-36 rounded-full" />
            </div>
          </div>
          <div className="min-w-0">
            <Skeleton className="mb-2 h-3 w-24" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>
        <div className="organization-directory-resultbar" aria-hidden="true">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-72 max-w-full" />
        </div>
      </section>

      <div
        className="organization-directory-grid mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        aria-hidden="true"
      >
        {Array.from({ length: 3 }, (_, index) => (
          <OrganizationCardSkeleton key={index} />
        ))}
      </div>
      <div
        className="organization-directory-pagination mt-5 flex items-center justify-between gap-3 border-t border-line pt-4"
        aria-hidden="true"
      >
        <Skeleton className="h-4 w-52 max-w-full" />
        <div className="flex gap-1.5">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>
      </div>
      <p className="sr-only" role="status">
        Memuat perangkat daerah.
      </p>
    </main>
  );
}
