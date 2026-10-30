import Link from "next/link";
import { ArrowLeft } from "lucide-react";

function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`loading-skeleton ${className}`} />;
}

function SummarySkeleton() {
  const items = [
    ["Satuan", "w-24"],
    ["Periode data", "w-36"],
    ["Frekuensi pembaruan", "w-32"],
    ["Cakupan", "w-28"],
  ];

  return (
    <section
      className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      aria-hidden="true"
    >
      {items.map(([label, width]) => (
        <div
          key={label}
          className="indicator-metadata-card rounded-xl border border-line bg-white p-4"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {label}
          </p>
          <div className="indicator-metadata-value mt-2 space-y-2">
            <Skeleton className={`h-4 ${width} max-w-full`} />
            <Skeleton className="h-4 w-3/4 max-w-full" />
          </div>
        </div>
      ))}
    </section>
  );
}

function ChartSkeleton() {
  return (
    <section
      className="rounded-2xl border border-line bg-white p-4 sm:p-6"
      aria-hidden="true"
    >
      <div className="flex min-h-[4.5rem] flex-wrap items-start justify-between gap-3">
        <div>
          <Skeleton className="h-6 w-48 max-w-full" />
          <Skeleton className="mt-1 h-5 w-44 max-w-full" />
          <Skeleton className="mt-1 h-5 w-32 max-w-full" />
        </div>
        <div className="min-w-20 space-y-2 text-right">
          <Skeleton className="ml-auto h-7 w-20" />
          <Skeleton className="ml-auto h-4 w-24" />
        </div>
      </div>
      <div className="mt-5 overflow-x-auto">
        <div className="public-indicator-chart-frame relative flex min-w-[520px] flex-col justify-between rounded-lg bg-surface-secondary p-3 sm:p-5">
          <Skeleton className="h-px w-full" />
          <Skeleton className="h-px w-full" />
          <Skeleton className="h-px w-full" />
          <Skeleton className="h-px w-full" />
          <Skeleton className="h-px w-full" />
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted">
        Sumber: data indikator pada portal. Grafik hanya menampilkan nilai yang
        telah tersedia untuk umum.
      </p>
    </section>
  );
}

function TableSkeleton() {
  return (
    <section
      className="overflow-hidden rounded-2xl border border-line bg-white"
      aria-hidden="true"
    >
      <div className="border-b border-line p-5">
        <h2 className="text-lg font-semibold">Riwayat nilai indikator</h2>
        <p className="public-indicator-table-summary mt-1 text-sm text-muted">
          Tabel menampilkan hingga 100 baris data terbaru.
        </p>
      </div>
      <div className="public-indicator-table-frame overflow-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted">
            <tr>
              {["Periode", "Wilayah", "Nilai", "Satuan"].map((label) => (
                <th key={label} className="p-3">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }, (_, row) => (
              <tr key={row} className="border-t border-line">
                {Array.from({ length: 4 }, (_, column) => (
                  <td
                    key={column}
                    className={`p-3 ${column === 2 ? "text-right" : ""}`}
                  >
                    <Skeleton
                      className={
                        column === 2 ? "ml-auto h-4 w-3/4" : "h-4 w-full"
                      }
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AsideSkeleton() {
  return (
    <aside className="space-y-4" aria-hidden="true">
      <section className="public-indicator-meta-panel rounded-2xl border border-line bg-white p-5">
        <h2 className="text-base font-semibold">Metodologi dan sumber</h2>
        <div className="mt-4 space-y-5">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-full" />
              {index === 0 ? <Skeleton className="h-5 w-4/5" /> : null}
            </div>
          ))}
        </div>
        <Skeleton className="mt-6 h-10 w-full rounded-lg" />
        <Skeleton className="mt-3 h-10 w-full rounded-lg" />
      </section>
      <div className="public-indicator-note-panel rounded-xl border border-blue-100 bg-blue-50 p-4">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-4/5" />
      </div>
    </aside>
  );
}

export default function PublicIndicatorDetailLoading() {
  return (
    <main
      className="page-container section-space public-interior-page"
      aria-busy="true"
    >
      <Link
        href="/statistik"
        className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-primary"
        tabIndex={-1}
      >
        <ArrowLeft size={16} aria-hidden="true" /> Kembali ke statistik
      </Link>

      <header
        className="public-page-heading public-dynamic-heading mb-9 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between"
        aria-hidden="true"
      >
        <div className="max-w-3xl space-y-3">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="public-heading-title-reserved h-10 w-4/5 max-w-3xl sm:h-12" />
          <Skeleton className="public-heading-description-reserved h-4 w-full max-w-2xl" />
        </div>
      </header>

      <SummarySkeleton />

      <div className="mt-7 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <ChartSkeleton />
          <TableSkeleton />
        </div>
        <AsideSkeleton />
      </div>
      <p className="sr-only" role="status">
        Memuat detail indikator statistik.
      </p>
    </main>
  );
}
