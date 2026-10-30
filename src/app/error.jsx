"use client";
import Link from "next/link";
import { useEffect, useTransition } from "react";
import { RotateCw } from "lucide-react";
import { PendingActionButton } from "@/components/ui/pending-action-button";

export default function ErrorPage({ error, reset }) {
  const [retryPending, startRetry] = useTransition();
  useEffect(() => {
    console.error("app_render_error", error?.digest || "unknown");
  }, [error]);

  return (
    <main
      id="konten-utama"
      tabIndex={-1}
      className="page-container flex min-h-[70vh] flex-col items-start justify-center py-16"
      aria-labelledby="app-error-title"
    >
      <p className="eyebrow">Terjadi kendala</p>
      <h1
        id="app-error-title"
        className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl"
      >
        Halaman belum dapat ditampilkan.
      </h1>
      <p role="alert" className="mt-3 max-w-xl text-sm leading-7 text-muted">
        Data atau layanan yang diperlukan belum berhasil dimuat. Ini tidak
        berarti data telah terhapus. Periksa koneksi, lalu coba lagi. Jika
        masalah berlanjut, catat waktu kejadian dan halaman yang dibuka untuk
        disampaikan kepada pengelola portal.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <PendingActionButton
          pending={retryPending}
          pendingText="Memuat ulang…"
          onClick={() => startRetry(() => reset())}
          className="inline-flex min-h-11 items-center gap-2 rounded-control bg-primary px-4 py-3 text-sm font-semibold text-white"
        >
          <RotateCw size={16} aria-hidden="true" /> Coba lagi
        </PendingActionButton>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-control border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
        >
          Kembali ke beranda
        </Link>
      </div>
    </main>
  );
}
