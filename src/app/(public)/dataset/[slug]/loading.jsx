import Link from "next/link";
import { ArrowLeft } from "lucide-react";

function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`loading-skeleton ${className}`} />;
}

export default function DatasetDetailLoading() {
  return (
    <main
      className="page-container section-space public-interior-page"
      aria-busy="true"
    >
      <Link
        href="/dataset"
        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted"
      >
        <ArrowLeft size={16} aria-hidden="true" /> Kembali ke katalog
      </Link>
      <div className="max-w-4xl">
        <Skeleton className="h-6 w-28 rounded-full" />
        <Skeleton className="mt-5 h-10 w-4/5 max-w-3xl sm:h-12" />
        <Skeleton className="mt-5 h-4 w-full max-w-3xl" />
        <Skeleton className="mt-2 h-4 w-11/12 max-w-2xl" />
        <p className="mt-5 inline-flex flex-wrap items-center gap-1 text-sm text-muted">
          Dipublikasikan{" "}
          <Skeleton className="inline-block h-4 w-24 align-middle" />
          <span aria-hidden="true">·</span> Versi{" "}
          <Skeleton className="inline-block h-4 w-8 align-middle" />
        </p>
      </div>
      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-8">
          <div className="surface-panel p-5 sm:p-7">
            <h2 className="text-xl font-semibold">Informasi dataset</h2>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              {[
                "Organisasi pengampu",
                "Periode data",
                "Cakupan wilayah",
                "Frekuensi pembaruan",
                "Sumber data",
                "Lisensi",
                "Satuan",
                "Diperbarui",
              ].map((label) => (
                <div key={label} className="min-w-0 border-b pb-4">
                  <dt className="text-sm text-muted">{label}</dt>
                  <dd className="mt-1.5">
                    <Skeleton className="h-4 w-4/5 max-w-full" />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <section>
            <h2 className="text-xl font-semibold">Berkas unduhan</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Berkas hanya tersedia jika versi publik telah selesai diproses.
            </p>
            <div className="mt-4 space-y-3">
              {Array.from({ length: 2 }, (_, index) => (
                <div
                  key={index}
                  className="surface-panel flex items-center gap-4 p-4"
                  aria-hidden="true"
                >
                  <Skeleton className="size-11 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="mt-2 h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-9 w-20 shrink-0 rounded-control" />
                </div>
              ))}
            </div>
          </section>
        </section>
        <aside className="h-fit rounded-card border bg-white p-5">
          <h2 className="font-semibold">Menggunakan data ini</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Cantumkan judul dataset, organisasi pengampu, versi, dan tanggal
            akses saat mengutip data.
          </p>
          <p className="mt-5 border-t pt-4 text-xs leading-5 text-muted">
            Periksa kembali definisi indikator dan cakupan wilayah sebelum
            membandingkan data lintas periode.
          </p>
        </aside>
      </div>
      <p className="sr-only" role="status">
        Memuat detail dataset.
      </p>
    </main>
  );
}
