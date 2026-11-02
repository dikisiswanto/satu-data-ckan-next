import { PageHeading } from "@/components/page-heading";
import { CatalogSearchFormSkeleton } from "@/components/catalog-search-form-skeleton";
import { publicPageCopy } from "@/lib/public-copy";

function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`loading-skeleton ${className}`} />;
}

export default function PublicationCatalogLoading() {
  return (
    <main
      className="page-container section-space public-interior-page"
      aria-busy="true"
    >
      <PageHeading {...publicPageCopy.publikasi} />
      <CatalogSearchFormSkeleton labelWidth="w-32" />
      <div
        className="mb-6 flex flex-wrap items-center justify-between gap-3"
        aria-hidden="true"
      >
        <Skeleton className="h-4 w-44 max-w-full" />
        <Skeleton className="h-4 w-40 max-w-full" />
      </div>
      <div
        className="public-loading-grid-lg grid gap-4 lg:grid-cols-2"
        aria-hidden="true"
      >
        {Array.from({ length: 2 }, (_, index) => (
          <article
            key={index}
            className="group flex min-w-0 gap-4 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6"
          >
            <Skeleton className="size-12 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="mt-3 h-5 w-4/5" />
              <Skeleton className="mt-2 h-5 w-3/5" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-5/6" />
              <div className="mt-4 flex flex-wrap gap-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="mt-4 h-4 w-36" />
            </div>
          </article>
        ))}
      </div>
      <div
        className="mt-7 flex items-center justify-between gap-3"
        aria-hidden="true"
      >
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>
      <p className="sr-only" role="status">
        Memuat katalog publikasi dan laporan.
      </p>
    </main>
  );
}
