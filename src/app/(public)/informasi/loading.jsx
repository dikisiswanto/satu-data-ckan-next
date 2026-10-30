import { PageHeading } from "@/components/page-heading";
import { publicPageCopy } from "@/lib/public-copy";

function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`loading-skeleton ${className}`} />;
}

function CardSkeleton({ withImage = false }) {
  return (
    <article
      className="cms-directory-card overflow-hidden rounded-2xl border border-line bg-white"
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
        <Skeleton className="mt-2 h-4 w-5/6" />
        <Skeleton className="mt-4 h-4 w-32" />
      </div>
    </article>
  );
}

export default function InformasiLoading() {
  return (
    <main
      className="page-container section-space public-interior-page informasi-directory-page"
      aria-busy="true"
    >
      <PageHeading
        {...publicPageCopy.informasi}
        compact
        className="mb-4 sm:mb-5"
      />
      <nav
        className="cms-directory-nav mt-2 flex flex-wrap gap-2 sm:mt-3"
        aria-hidden="true"
      >
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-10 w-24 rounded-full" />
        ))}
      </nav>
      <section className="cms-directory-section mt-6" aria-hidden="true">
        <div className="mb-4 sm:mb-5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-2 h-6 w-40" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      </section>
      <section className="cms-directory-section mt-7" aria-hidden="true">
        <div className="mb-4 sm:mb-5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-2 h-6 w-56" />
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <CardSkeleton key={index} withImage />
          ))}
        </div>
      </section>
      <p className="sr-only" role="status">
        Memuat pusat informasi.
      </p>
    </main>
  );
}
