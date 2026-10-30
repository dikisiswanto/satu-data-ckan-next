import { siteConfig } from "@/lib/site-config";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`loading-skeleton ${className}`} />;
}

function SummarySkeleton() {
  return (
    <section
      className="surface-panel grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4"
      aria-hidden="true"
    >
      <div className="min-w-0 sm:min-h-[92px]">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Nilai terakhir di ringkasan
        </p>
        <Skeleton className="mt-1 h-6 w-28 max-w-full" />
        <p className="mt-1 flex items-center gap-1 text-xs text-muted">
          Periode: <Skeleton className="inline-block h-3 w-24 align-middle" />
        </p>
      </div>
      <div className="min-w-0 sm:min-h-[92px]">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Organisasi produsen
        </p>
        <Skeleton className="mt-1 h-5 w-4/5 max-w-full" />
      </div>
      <div className="min-w-0 sm:min-h-[92px]">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Jumlah observasi aktif
        </p>
        <Skeleton className="mt-2 h-6 w-20 max-w-full" />
        <p className="mt-1 text-xs text-muted">
          Maksimal 500 observasi terbaru ditampilkan pada halaman ini.
        </p>
      </div>
      <div className="min-w-0 sm:min-h-[92px]">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Sumber
        </p>
        <Skeleton className="mt-1 h-4 w-3/4 max-w-full" />
        <p className="mt-1 text-xs text-muted">
          Tautan sumber, jika tersedia, tercantum pada masing-masing observasi.
        </p>
      </div>
    </section>
  );
}

export default function PublicIndicatorDetailLoading() {
  return (
    <main
      className="page-container section-space public-interior-page space-y-6"
      aria-busy="true"
    >
      <Link
        href="/statistik"
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
        tabIndex={-1}
      >
        <ArrowLeft size={16} aria-hidden="true" /> Kembali ke statistik
      </Link>

      <header className="public-page-heading mb-9 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl min-w-0 flex-1 space-y-3" aria-hidden="true">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-10 w-4/5 max-w-3xl sm:h-12" />
          <Skeleton className="h-4 w-full max-w-2xl" />
          <Skeleton className="h-4 w-5/6 max-w-xl" />
        </div>
        <span
          className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-control border border-line px-3 py-2 text-sm font-semibold text-muted"
          aria-hidden="true"
        >
          API observasi <span className="text-xs">↗</span>
        </span>
      </header>

      <SummarySkeleton />

      <section className="min-w-0 space-y-4" aria-hidden="true">
        <div>
          <h2 id="series-filter-title" className="text-base font-semibold">
            Pilih seri data
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Jika indikator memiliki beberapa wilayah atau dimensi, pilih satu
            seri yang sebanding sebelum grafik tren ditampilkan.
          </p>
        </div>
        <div className="surface-panel grid min-w-0 gap-3 overflow-visible p-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-end">
          <div className="min-w-0">
            <label className="mb-1.5 block text-sm font-medium">Wilayah</label>
            <Skeleton className="h-11 w-full rounded-control" />
          </div>
          <div className="min-w-0">
            <label className="mb-1.5 block text-sm font-medium">Dimensi</label>
            <Skeleton className="h-11 w-full rounded-control" />
          </div>
          <div className="inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-control bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
            Terapkan filter
          </div>
        </div>

        <section className="surface-panel p-4 sm:p-6">
          <h2 className="text-base font-semibold">Tren nilai terpublikasi</h2>
          <p className="mt-1 text-sm text-muted">
            Nilai dalam satuan yang tercatat pada observasi. Grafik hanya
            ditampilkan untuk satu seri yang dapat dibandingkan.
          </p>
          <div className="mt-5 aspect-[800/270] w-full rounded-lg bg-[#f5f7f8] p-3 sm:p-5">
            <div className="flex h-full flex-col justify-between">
              <Skeleton className="h-px w-full" />
              <Skeleton className="h-px w-full" />
              <Skeleton className="h-px w-full" />
              <Skeleton className="h-px w-full" />
              <Skeleton className="h-px w-full" />
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-muted">
            Sumber data grafik, jika tersedia: observasi yang telah diterbitkan
            pada {siteConfig.name}. Nilai draf dan revisi lama
            tidak ditampilkan.
          </p>
        </section>

        <section className="surface-panel overflow-hidden">
          <div className="border-b border-line p-4">
            <h2 id="observations-table-title" className="font-semibold">
              Tabel observasi
            </h2>
            <p className="mt-1 text-sm text-muted">
              Hanya revisi yang saat ini diterbitkan. Sampai 500 baris terbaru
              tersedia untuk diperiksa.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table
              className="w-full min-w-[760px] text-left text-sm"
              aria-hidden="true"
            >
              <thead className="bg-surface-secondary text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="p-3">Periode</th>
                  <th className="p-3">Wilayah</th>
                  <th className="p-3">Dimensi</th>
                  <th className="p-3 text-right">Nilai</th>
                  <th className="p-3">Sumber</th>
                  <th className="p-3">Revisi</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }, (_, row) => (
                  <tr key={row} className="border-t border-line">
                    {Array.from({ length: 6 }, (_, column) => (
                      <td
                        key={column}
                        className={`p-3 ${column === 3 ? "text-right" : ""}`}
                      >
                        <Skeleton
                          className={
                            column === 3 ? "ml-auto h-4 w-3/4" : "h-4 w-full"
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
      </section>

      <p className="text-xs leading-5 text-muted">
        {
          "Data yang tampil mengikuti status publikasi dan kebijakan akses sumber. Riwayat draf atau revisi yang tidak lagi aktif tidak diekspos melalui halaman ini."
        }
      </p>
      <p className="sr-only" role="status">
        Memuat detail indikator statistik.
      </p>
    </main>
  );
}
