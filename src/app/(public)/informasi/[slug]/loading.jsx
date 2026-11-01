import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeading } from "@/components/page-heading";

function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`loading-skeleton ${className}`} />;
}

export default function InformasiDetailLoading() {
  return (
    <main
      className="page-container section-space public-interior-page"
      aria-busy="true"
    >
      <Link
        href="/informasi"
        tabIndex={-1}
        className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-muted"
      >
        <ArrowLeft size={16} aria-hidden="true" /> Kembali ke pusat informasi
      </Link>
      <PageHeading
        className="public-dynamic-heading"
        reserveTitle
        reserveDescription
        eyebrow="Informasi"
        title="Memuat informasi"
        description="Menyiapkan informasi halaman."
      />
      <p className="public-publish-date mt-3 inline-flex min-h-5 items-center gap-2 text-xs text-muted">
        <Skeleton className="h-3 w-40" />
      </p>
      <article
        className="cms-document mt-8 rounded-2xl border border-line bg-white p-5 sm:p-8 lg:p-10"
        aria-hidden="true"
      >
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="mt-5 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-11/12" />
        <Skeleton className="mt-2 h-4 w-5/6" />
        <Skeleton className="mt-8 h-5 w-2/3" />
        <Skeleton className="mt-4 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-4/5" />
      </article>
      <p className="sr-only" role="status">
        Memuat informasi.
      </p>
    </main>
  );
}
