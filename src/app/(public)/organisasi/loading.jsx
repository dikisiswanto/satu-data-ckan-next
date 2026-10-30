import { cn } from "@/lib/utils";
import { fieldStyles } from "@/components/ui/input";
import { siteConfig } from "@/lib/site-config";
import { PageHeading } from "@/components/page-heading";
import { Search } from "lucide-react";

function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`loading-skeleton ${className}`} />;
}

export default function OrganizationDirectoryLoading() {
  return (
    <main
      className="page-container section-space public-interior-page organization-directory-page"
      aria-busy="true"
    >
      <PageHeading
        className="mb-6 sm:mb-6"
        eyebrow="Pengampu data"
        title="Perangkat daerah"
        description={`Temukan perangkat daerah aktif yang mengampu data ${siteConfig.regionName}, termasuk organisasi yang sedang menyiapkan publikasi pertamanya.`}
      />
      <section
        className="organization-search-panel"
        aria-label="Memuat pencarian perangkat daerah"
      >
        <p className="mb-2 text-sm font-semibold">Cari perangkat daerah</p>
        <div className="relative">
          <Search
            size={18}
            aria-hidden="true"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <div
            className={cn(fieldStyles, "flex h-11 min-w-0 items-center pl-10 pr-3 text-sm text-muted")}
            aria-hidden="true"
          >
            Nama OPD, kode, atau keterangan…
          </div>
        </div>
        <p
          className="mt-2 flex flex-wrap items-center gap-1 text-xs text-muted"
          aria-hidden="true"
        >
          Menampilkan <Skeleton className="inline-block h-3 w-8 align-middle" />{" "}
          dari <Skeleton className="inline-block h-3 w-8 align-middle" />{" "}
          organisasi aktif.
        </p>
      </section>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 9 }, (_, index) => (
          <article key={index} className="flex min-h-[180px] min-w-0 max-w-full flex-col rounded-lg border-t-[3px] border-t-[#a9c7e9] border-r border-b border-l border-[#d6e0e5] bg-white p-4 shadow-[0_1px_2px_rgb(24_58_68_/_0.02)]" aria-hidden="true">
            <div className="flex items-start gap-3">
              <Skeleton className="size-10 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="mt-2 h-3 w-1/2" />
              </div>
            </div>
            <Skeleton className="mt-4 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-5/6" />
            <div className="mt-auto flex justify-between gap-3 pt-5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-16" />
            </div>
          </article>
        ))}
      </div>
      <p className="sr-only" role="status">
        Memuat perangkat daerah.
      </p>
    </main>
  );
}
