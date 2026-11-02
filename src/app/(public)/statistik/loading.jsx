import { PageHeading } from "@/components/page-heading";
import { publicPageCopy } from "@/lib/public-copy";
import { GeoPortalStatisticsPromo } from "@/components/geoportal-statistics-promo";
import { CatalogSearchFormSkeleton } from "@/components/catalog-search-form-skeleton";

function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`loading-skeleton ${className}`} />;
}

export default function PublicStatisticsLoading() {
  return (
    <main
      className="page-container section-space public-interior-page public-statistics-page"
      aria-busy="true"
    >
      <PageHeading {...publicPageCopy.statistik} />
      <CatalogSearchFormSkeleton labelWidth="w-28" />
      <GeoPortalStatisticsPromo />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="h-5 w-60 max-w-full" aria-hidden="true">
          <Skeleton className="h-4 w-full" />
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-2 text-xs font-medium text-muted">
          Data terpublikasi
        </span>
      </div>
      <div className="public-loading-grid-md grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <article key={index} className="statistics-card" aria-hidden="true">
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="size-9 rounded-lg" />
            </div>
            <Skeleton className="mt-4 h-6 w-4/5" />
            <Skeleton className="mt-2 h-6 w-3/5" />
            <Skeleton className="mt-2 h-4 w-full" />
            <Skeleton className="mt-1 h-4 w-5/6" />
            <div className="statistics-card-value mt-5" aria-hidden="true">
              <Skeleton className="h-9 w-2/3" />
              <Skeleton className="mt-1 h-3 w-1/3" />
            </div>
            <div className="statistics-card-meta mt-4" aria-hidden="true">
              <div>
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-2 h-4 w-20" />
              </div>
              <div>
                <Skeleton className="h-3 w-16" />
                <Skeleton className="mt-2 h-4 w-24" />
              </div>
            </div>
            <Skeleton className="mt-4 h-4 w-36" />
          </article>
        ))}
      </div>
      <p className="sr-only" role="status">
        Memuat indikator statistik.
      </p>
    </main>
  );
}
