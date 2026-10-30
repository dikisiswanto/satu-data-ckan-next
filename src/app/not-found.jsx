import Link from "next/link";

export const metadata = {
  title: "Halaman tidak ditemukan",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main
      className="page-container flex min-h-[70vh] flex-col items-start justify-center py-16"
      aria-labelledby="not-found-title"
    >
      <p className="eyebrow">404 · Halaman tidak ditemukan</p>
      <h1
        id="not-found-title"
        className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl"
      >
        Halaman yang Anda cari tidak tersedia.
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-7 text-muted">
        Tautan mungkin salah atau sudah berubah. Dataset yang belum
        dipublikasikan memang tidak muncul di katalog publik.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-4 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
          href="/dataset"
        >
          Jelajahi katalog dataset
        </Link>
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-control border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
          href="/"
        >
          Kembali ke beranda
        </Link>
      </div>
    </main>
  );
}
