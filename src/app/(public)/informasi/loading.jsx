import { PageHeading } from "@/components/page-heading";
import { publicPageCopy } from "@/lib/public-copy";

function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`loading-skeleton ${className}`} />;
}

function CardSkeleton({ withImage = false }) {
  return (
    <article
      className="cms-directory-card overflow-hidden rounded-2xl border border-line bg-white shadow-sm"
      aria-hidden="true"
    >
      {withImage ? (
        <Skeleton className="aspect-[16/9] w-full rounded-none" />
      ) : null}
      <div className="p-5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-3 w-24" />
          {withImage ? <Skeleton className="h-3 w-20" /> : null}
        </div>
        <Skeleton className="mt-3 h-5 w-4/5" />
        <Skeleton className="mt-2 h-5 w-3/5" />
        <Skeleton className="mt-2 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-11/12" />
        <Skeleton className="mt-2 h-4 w-5/6" />
        <Skeleton className="mt-4 h-4 w-32" />
      </div>
    </article>
  );
}

export default function InformasiLoading() {
  return (
    <main
      className="page-container section-space public-interior-page"
      aria-busy="true"
    >
      <PageHeading {...publicPageCopy.informasi} />
      <nav
        className="cms-directory-nav mt-7 flex flex-wrap gap-2"
        aria-hidden="true"
      >
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-10 w-24 rounded-full" />
        ))}
      </nav>
      <section className="cms-directory-section mt-9" aria-hidden="true">
        <div className="mb-5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-2 h-6 w-40" />
        </div>
        <div className="public-loading-grid-sm grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      </section>
      <section className="cms-directory-section mt-12" aria-hidden="true">
        <div className="mb-5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-2 h-6 w-56" />
        </div>
        <div className="public-loading-grid-md grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <CardSkeleton key={index} withImage />
          ))}
        </div>
      </section>
      <section className="cms-directory-section mt-12" aria-hidden="true">
        <div className="mb-5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-2 h-6 w-52" />
        </div>
        <div className="public-loading-grid-md grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <CardSkeleton key={index} withImage />
          ))}
        </div>
      </section>
      <section
        className="mt-12 flex min-h-28 items-start gap-3 rounded-2xl border border-line bg-slate-50 p-5 sm:p-7"
        aria-hidden="true"
      >
        <Skeleton className="size-11 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-5 w-44 max-w-full" />
          <Skeleton className="mt-2 h-3 w-full max-w-xl" />
          <Skeleton className="mt-3 h-4 w-32" />
        </div>
      </section>
      <p className="sr-only" role="status">
        Memuat pusat informasi.
      </p>
    </main>
  );
}
