import { PageHeading } from "@/components/page-heading";
import { publicPageCopy } from "@/lib/public-copy";
import { Search } from "lucide-react";

function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`loading-skeleton ${className}`} />;
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
          <div>
            <p className="eyebrow">SUMBER DATA DAERAH</p>
            <h2>Temukan perangkat daerah</h2>
            <p>
              Telusuri instansi penerbit beserta dataset, indikator, infografik,
              dan publikasi yang tersedia dari masing-masing perangkat daerah.
            </p>
          </div>
          <div className="organization-directory-summary" aria-hidden="true">
            <div>
              <Skeleton className="h-6 w-10" />
              <Skeleton className="mt-1 h-3 w-20" />
            </div>
            <div>
              <Skeleton className="h-6 w-12" />
              <Skeleton className="mt-1 h-3 w-20" />
            </div>
          </div>
        </div>
        <div className="organization-directory-controls">
          <div className="min-w-0 flex-1">
            <p className="mb-2 text-sm font-semibold">Cari perangkat daerah</p>
            <div className="relative flex h-12 items-center rounded-xl border border-line bg-white pl-10 pr-3 text-sm text-muted">
              <Search
                size={18}
                aria-hidden="true"
                className="absolute left-3.5 text-muted"
              />
              Nama perangkat daerah atau kata kunci…
            </div>
          </div>
          <div className="organization-directory-sort">
            <p className="mb-2 text-sm font-semibold">Urutkan daftar</p>
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
        <div className="organization-directory-filters" aria-hidden="true">
          <Skeleton className="h-9 w-14 rounded-full" />
          <Skeleton className="h-9 w-36 rounded-full" />
          <Skeleton className="h-9 w-36 rounded-full" />
        </div>
        <div className="organization-directory-resultbar">
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-3 w-36" />
        </div>
      </section>
      <div
        className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        aria-hidden="true"
      >
        {Array.from({ length: 3 }, (_, index) => (
          <article
            key={index}
            className="flex min-h-[13rem] flex-col rounded-2xl border border-line bg-white p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="size-11 rounded-xl" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="mt-4 h-5 w-4/5" />
            <Skeleton className="mt-2 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-5/6" />
            <div className="mt-auto flex justify-between gap-3 border-t border-line pt-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          </article>
        ))}
      </div>
      <p className="sr-only" role="status">
        Memuat perangkat daerah.
      </p>
    </main>
  );
}
