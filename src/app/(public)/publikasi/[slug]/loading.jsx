import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeading } from "@/components/page-heading";

function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`loading-skeleton ${className}`} />;
}

export default function PublicationDetailLoading() {
  return (
    <main className="page-container section-space public-interior-page space-y-6" aria-busy="true">
      <Link href="/publikasi" tabIndex={-1} className="inline-flex items-center gap-2 text-sm font-semibold text-muted">
        <ArrowLeft size={16} aria-hidden="true" /> Kembali ke publikasi
      </Link>
      <PageHeading eyebrow="Publikasi resmi" title="Memuat publikasi" description="Mengambil metadata, informasi rilis, dan resource dokumen." />
      <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-5" aria-hidden="true">
          <div className="overflow-hidden rounded-2xl border border-line bg-white">
            <div className="border-b border-line p-4"><Skeleton className="h-5 w-48" /><Skeleton className="mt-2 h-3 w-64 max-w-full" /></div>
            <Skeleton className="h-[min(68vh,36rem)] min-h-[320px] w-full rounded-none" />
          </div>
          <Skeleton className="h-48 w-full rounded-2xl" />
        </section>
        <aside className="space-y-4 rounded-2xl border border-line bg-white p-5" aria-hidden="true">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 6 }, (_, index) => <div key={index}><Skeleton className="h-3 w-28" /><Skeleton className="mt-2 h-4 w-4/5" /></div>)}
          <Skeleton className="h-10 w-full rounded-control" />
        </aside>
      </div>
      <p className="sr-only" role="status">Memuat detail publikasi.</p>
    </main>
  );
}
