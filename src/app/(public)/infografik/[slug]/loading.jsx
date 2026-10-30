import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeading } from "@/components/page-heading";

function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`loading-skeleton ${className}`} />;
}

export default function InfographicDetailLoading() {
  return (
    <main className="page-container section-space public-interior-page space-y-6" aria-busy="true">
      <Link href="/infografik" tabIndex={-1} className="inline-flex items-center gap-2 text-sm font-semibold text-muted">
        <ArrowLeft size={16} aria-hidden="true" /> Kembali ke infografik
      </Link>
      <PageHeading eyebrow="Infografik" title="Memuat infografik" description="Mengambil metadata dan resource publik dari katalog." />
      <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-5" aria-hidden="true">
          <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </section>
        <aside className="space-y-4 rounded-2xl border border-line bg-white p-5" aria-hidden="true">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 4 }, (_, index) => <div key={index}><Skeleton className="h-3 w-24" /><Skeleton className="mt-2 h-4 w-4/5" /></div>)}
          <Skeleton className="h-10 w-full rounded-control" />
        </aside>
      </div>
      <p className="sr-only" role="status">Memuat detail infografik.</p>
    </main>
  );
}
