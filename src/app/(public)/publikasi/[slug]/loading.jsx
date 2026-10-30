import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeading } from "@/components/page-heading";

function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`loading-skeleton ${className}`} />;
}

export default function PublicationDetailLoading() {
  return (
    <main
      className="page-container section-space public-interior-page"
      aria-busy="true"
    >
      <Link
        href="/publikasi"
        tabIndex={-1}
        className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-muted"
      >
        <ArrowLeft size={16} aria-hidden="true" /> Kembali ke publikasi
      </Link>
      <PageHeading
        className="public-dynamic-heading"
        reserveTitle
        reserveDescription
        eyebrow="Publikasi resmi"
        title="Memuat publikasi"
        description="Menyiapkan informasi publikasi dan berkas dokumen."
      />
      <div className="mt-7 grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-5" aria-hidden="true">
          <div className="overflow-hidden rounded-2xl border border-line bg-white">
            <div className="border-b border-line p-4">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="mt-2 h-3 w-64 max-w-full" />
            </div>
            <Skeleton className="publication-preview-frame h-[68vh] min-h-[460px] w-full rounded-none" />
          </div>
          <section
            className="public-publication-resource-panel rounded-2xl border border-line bg-white p-5 sm:p-6"
            aria-hidden="true"
          >
            <Skeleton className="h-6 w-44" />
            <div className="public-publication-resource-list mt-4 divide-y divide-line">
              {Array.from({ length: 2 }, (_, index) => (
                <div
                  key={index}
                  className="flex min-h-16 items-center gap-3 py-4"
                >
                  <Skeleton className="size-10 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="mt-2 h-3 w-2/3" />
                    <Skeleton className="mt-2 h-3 w-full" />
                  </div>
                  <Skeleton className="h-9 w-20 shrink-0 rounded-lg" />
                </div>
              ))}
            </div>
          </section>
        </section>
        <aside className="space-y-4" aria-hidden="true">
          <section className="public-publication-meta-panel rounded-2xl border border-line bg-white p-5">
            <Skeleton className="h-5 w-40" />
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="mt-4">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="mt-2 h-4 w-4/5" />
              </div>
            ))}
          </section>
          <Skeleton className="h-11 w-full rounded-xl" />
        </aside>
      </div>
      <p className="sr-only" role="status">
        Memuat detail publikasi.
      </p>
    </main>
  );
}
