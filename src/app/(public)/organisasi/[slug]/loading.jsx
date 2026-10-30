import Link from "next/link";
import { ArrowLeft } from "lucide-react";

function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`loading-skeleton ${className}`} />;
}

export default function OrganizationDetailLoading() {
  return (
    <main
      className="public-interior-page organization-detail-page"
      aria-busy="true"
    >
      <div className="organization-detail-band">
        <div className="page-container py-6 sm:py-8">
          <Link
            href="/organisasi"
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"
          >
            <ArrowLeft size={16} aria-hidden="true" /> Daftar perangkat daerah
          </Link>
          <header className="public-page-heading mb-4 flex flex-col gap-4">
            <p className="eyebrow">Profil pengampu data</p>
            <Skeleton className="h-10 w-4/5 max-w-3xl sm:h-12" />
            <Skeleton className="h-4 w-full max-w-2xl" />
            <Skeleton className="h-4 w-5/6 max-w-xl" />
          </header>
          <div className="organization-detail-meta">
            <span>
              Kode organisasi:{" "}
              <Skeleton className="inline-block h-4 w-24 align-middle" />
            </span>
            <span>
              <Skeleton className="inline-block h-4 w-10 align-middle" />{" "}
              dataset publik
            </span>
          </div>
        </div>
      </div>
      <section className="page-container section-space organization-datasets-section">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="eyebrow">DATA YANG DITERBITKAN</p>
            <h2 className="mt-3 flex flex-wrap items-center gap-2 text-2xl font-semibold">
              Dataset dari{" "}
              <Skeleton className="inline-block h-7 w-56 max-w-full" />
            </h2>
            <p className="mt-3 flex flex-wrap items-center gap-1 text-sm text-muted">
              Menampilkan{" "}
              <Skeleton className="inline-block h-4 w-7 align-middle" /> dataset
              terbaru dari{" "}
              <Skeleton className="inline-block h-4 w-7 align-middle" /> dataset
              publik.
            </p>
          </div>
          <Skeleton className="h-10 w-40 rounded-lg" />
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <article
              key={index}
              className="home-dataset-card home-dataset-card-skeleton"
              aria-hidden="true"
            >
              <div className="home-dataset-art">
                <Skeleton className="home-dataset-art-skeleton" />
              </div>
              <div className="home-dataset-body">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-5 w-4/5" />
                <Skeleton className="mt-3 h-3 w-full" />
                <Skeleton className="mt-2 h-3 w-5/6" />
              </div>
            </article>
          ))}
        </div>
      </section>
      <p className="sr-only" role="status">
        Memuat profil perangkat daerah.
      </p>
    </main>
  );
}
