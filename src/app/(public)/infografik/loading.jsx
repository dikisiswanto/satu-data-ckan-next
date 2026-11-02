import { PageHeading } from "@/components/page-heading";
import { CatalogSearchFormSkeleton } from "@/components/catalog-search-form-skeleton";
import { publicPageCopy } from "@/lib/public-copy";

function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`loading-skeleton ${className}`} />;
}

export default function InfographicCatalogLoading() {
  return (
    <main
      className="page-container section-space public-interior-page"
      aria-busy="true"
    >
      <PageHeading {...publicPageCopy.infografik} />
      <CatalogSearchFormSkeleton labelWidth="w-32" />
      <div
        className="mb-6 flex flex-wrap items-center justify-between gap-3"
        aria-hidden="true"
      >
        <Skeleton className="h-4 w-44 max-w-full" />
        <Skeleton className="h-4 w-40 max-w-full" />
      </div>
      <div
        className="public-loading-grid-sm grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
        aria-hidden="true"
      >
        {Array.from({ length: 3 }, (_, index) => (
          <article
            key={index}
            className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm"
          >
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="p-5">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="mt-3 h-5 w-4/5" />
              <Skeleton className="mt-2 h-5 w-3/5" />
              <Skeleton className="mt-2 h-4 w-full" />
              <Skeleton className="mt-1 h-4 w-5/6" />
              <Skeleton className="mt-4 h-4 w-28" />
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
        Memuat katalog infografik.
      </p>
    </main>
  );
}
