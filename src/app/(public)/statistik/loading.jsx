import { PageHeading } from "@/components/page-heading";
import { GeoPortalStatisticsPromo } from "@/components/geoportal-statistics-promo";

function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`loading-skeleton ${className}`} />;
}

export default function PublicStatisticsLoading() {
  return (
    <main
      className="page-container section-space public-interior-page public-statistics-page"
      aria-busy="true"
    >
      <PageHeading
        eyebrow="Data makro"
        title="Statistik dan indikator"
        description="Telusuri indikator yang telah diterbitkan, termasuk arti angka, satuan, periode, dan sumber datanya."
      />
      <GeoPortalStatisticsPromo />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="h-5 w-60 max-w-full" aria-hidden="true">
          <Skeleton className="h-4 w-full" />
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-2 text-xs font-medium text-muted">
          Data terpublikasi
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <article key={index} className="statistics-card" aria-hidden="true">
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="size-9 rounded-lg" />
            </div>
            <Skeleton className="mt-5 h-6 w-4/5" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-5/6" />
            <Skeleton className="mt-7 h-9 w-2/3" />
            <Skeleton className="mt-4 h-12 w-full" />
          </article>
        ))}
      </div>
      <p className="sr-only" role="status">
        Memuat indikator statistik.
      </p>
    </main>
  );
}
