import { Filter, Search } from "lucide-react";
import { PageHeading } from "@/components/page-heading";

function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`loading-skeleton ${className}`} />;
}

export default function DatasetCatalogLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Memuat hasil katalog dataset"
    >
      <section className="relative z-10 [overflow:visible] border-b border-[#d9e1dc] bg-[linear-gradient(135deg,#eef3ee_0%,#edf4f6_60%,#f7f9fb_100%)]">
        <div className="page-container py-10 sm:py-14">
          <PageHeading
            eyebrow="Jelajahi data publik"
            title="Katalog dataset"
            description="Jelajahi data berdasarkan maksud pencarian, topik terkait, metadata, kata kunci, sumber, dan perangkat daerah—bukan hanya kecocokan judul."
          />
          <div className="relative flex min-w-0 flex-col items-stretch gap-3 rounded-2xl border border-[#d5e0e8] bg-white p-3 shadow-[0_8px_28px_rgb(20_55_60_/_0.07)] sm:flex-row sm:items-end sm:p-4">
            <div className="min-w-0 flex-1">
              <p className="mb-2 block text-sm font-semibold">Kata kunci</p>
              <div className="relative">
                <Search
                  size={18}
                  aria-hidden="true"
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                />
                <Skeleton className="h-12 w-full rounded-control" />
              </div>
            </div>
            <div className="flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-control bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground sm:w-auto">
              <Search size={16} aria-hidden="true" /> Cari dataset
            </div>
            <div className="flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-control border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink sm:w-auto">
              <Filter size={16} aria-hidden="true" /> Filter
            </div>
          </div>
        </div>
      </section>
      <section
        className="page-container pb-12 pt-8"
        aria-label="Hasil katalog sedang dimuat"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Hasil penelusuran</p>
            <div className="mt-2" aria-hidden="true">
              <Skeleton className="h-8 w-72 max-w-full" />
            </div>
          </div>
          <Skeleton className="h-7 w-28 rounded-full" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="rounded-card border border-line bg-surface p-5 sm:p-6"
              aria-hidden="true"
            >
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="mt-5 h-6 w-4/5" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-11/12" />
              <Skeleton className="mt-2 h-4 w-2/3" />
              <div className="mt-8 border-t border-line pt-4">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="mt-3 h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
        <p className="sr-only" role="status">
          Sedang memuat hasil dataset.
        </p>
      </section>
    </main>
  );
}
