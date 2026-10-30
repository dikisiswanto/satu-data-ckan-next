import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeading } from "@/components/page-heading";

function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`loading-skeleton ${className}`} />;
}

export default function InfographicDetailLoading() {
  return (
    <main
      className="page-container section-space public-interior-page"
      aria-busy="true"
    >
      <Link
        href="/infografik"
        tabIndex={-1}
        className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-muted"
      >
        <ArrowLeft size={16} aria-hidden="true" /> Kembali ke infografik
      </Link>
      <PageHeading
        className="public-dynamic-heading"
        reserveTitle
        reserveDescription
        eyebrow="Infografik"
        title="Memuat infografik"
        description="Menyiapkan informasi dan gambar infografik."
      />
      <div className="mt-7 grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section
          className="public-infographic-gallery space-y-5"
          aria-hidden="true"
        >
          <figure className="rounded-2xl border border-line bg-white p-3 sm:p-5">
            <Skeleton className="aspect-[4/3] w-full rounded-xl" />
            <Skeleton className="mt-3 h-4 w-2/3" />
          </figure>
        </section>
        <aside
          className="rounded-2xl border border-line bg-white p-5"
          aria-hidden="true"
        >
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index}>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-4 w-4/5" />
            </div>
          ))}
          <h3 className="mt-6 border-t border-line pt-5 text-sm font-semibold">
            Berkas dan unduhan
          </h3>
          <div className="public-infographic-download-list mt-3 grid gap-2">
            {Array.from({ length: 2 }, (_, index) => (
              <div
                key={index}
                className="flex min-h-11 items-center gap-3 rounded-lg border border-line p-3"
              >
                <Skeleton className="size-9 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="mt-1 h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
          <Skeleton className="mt-5 h-10 w-full rounded-control" />
        </aside>
      </div>
      <p className="sr-only" role="status">
        Memuat detail infografik.
      </p>
    </main>
  );
}
