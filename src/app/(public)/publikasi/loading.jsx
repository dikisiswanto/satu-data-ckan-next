import { PageHeading } from "@/components/page-heading";
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
      <div
        className="mb-6 flex items-center justify-between gap-3"
        aria-hidden="true"
      >
        <Skeleton className="h-4 w-44 max-w-full" />
        <Skeleton className="h-9 w-36 max-w-full rounded-control" />
      </div>
      <div
        className="public-loading-grid-lg grid gap-4 lg:grid-cols-2"
        aria-hidden="true"
      >
        {Array.from({ length: 2 }, (_, index) => (
          <article
            key={index}
            className="flex min-w-0 gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6"
          >
            <Skeleton className="size-12 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-3 w-40 max-w-full" />
              <Skeleton className="mt-4 h-5 w-4/5" />
              <Skeleton className="mt-3 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-5/6" />
              <Skeleton className="mt-5 h-3 w-3/4" />
            </div>
          </article>
        ))}
      </div>
      <p className="sr-only" role="status">
        Memuat katalog publikasi dan laporan.
      </p>
    </main>
  );
}
