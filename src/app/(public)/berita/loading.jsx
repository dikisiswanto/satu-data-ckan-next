import { PageHeading } from "@/components/page-heading";
import { publicPageCopy } from "@/lib/public-copy";

function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`loading-skeleton ${className}`} />;
}

export default function BeritaLoading() {
  return (
    <main
      className="page-container section-space public-interior-page"
      aria-busy="true"
    >
      <PageHeading {...publicPageCopy.berita} />
      <section
        className="public-news-featured-slot mt-8 grid overflow-hidden rounded-3xl border border-line bg-white shadow-sm lg:grid-cols-[1.1fr_0.9fr]"
        aria-hidden="true"
      >
        <div className="flex flex-col justify-center p-6 sm:p-9">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-4 h-8 w-4/5 max-w-xl" />
          <Skeleton className="mt-2 h-8 w-3/5 max-w-lg" />
          <Skeleton className="mt-5 h-4 w-full max-w-xl" />
          <Skeleton className="mt-2 h-4 w-11/12 max-w-xl" />
          <Skeleton className="mt-2 h-4 w-5/6 max-w-lg" />
          <Skeleton className="mt-2 h-4 w-3/4 max-w-lg" />
          <Skeleton className="mt-6 h-11 w-36 rounded-xl" />
        </div>
        <Skeleton className="public-news-feature-media min-h-56 w-full rounded-none" />
      </section>
      <section className="public-news-list-slot mt-10" aria-hidden="true">
        <div className="mb-5">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-2 h-6 w-44" />
        </div>
        <div className="public-loading-grid-md grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <article
              key={index}
              className="cms-directory-card overflow-hidden rounded-2xl border border-line bg-white shadow-sm"
              aria-hidden="true"
            >
              <Skeleton className="aspect-[16/9] w-full rounded-none" />
              <div className="p-5">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="mt-3 h-5 w-4/5" />
                <Skeleton className="mt-2 h-5 w-3/5" />
                <Skeleton className="mt-2 h-3 w-full" />
                <Skeleton className="mt-2 h-3 w-11/12" />
                <Skeleton className="mt-2 h-3 w-5/6" />
                <Skeleton className="mt-4 h-4 w-32" />
              </div>
            </article>
          ))}
        </div>
      </section>
      <p className="sr-only" role="status">
        Memuat berita dan artikel.
      </p>
    </main>
  );
}
