"use client";

import Link from "next/link";
import { useEffect, useTransition } from "react";
import { AlertTriangle, RotateCw, Search } from "lucide-react";
import { PendingActionButton } from "@/components/ui/pending-action-button";

export default function PublicError({ error, reset }) {
  const [retryPending, startRetry] = useTransition();
  useEffect(() => {
    console.error("public_route_error", { digest: error?.digest || "unknown" });
  }, [error]);

  return (
    <main
      id="konten-utama"
      tabIndex={-1}
      className="page-container flex min-h-[65vh] flex-col items-start justify-center py-16"
      aria-labelledby="public-error-title"
    >
      <span
        className="flex size-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-800"
        aria-hidden="true"
      >
        <AlertTriangle size={22} />
      </span>
      <p className="eyebrow mt-5">Layanan data sementara terganggu</p>
      <h1
        id="public-error-title"
        className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl"
      >
        Halaman belum dapat ditampilkan
      </h1>
      <p role="alert" className="mt-3 max-w-2xl text-sm leading-6 text-muted">
        Permintaan belum berhasil diselesaikan. Ini tidak berarti dataset telah
        dihapus atau tidak tersedia. Coba kembali, atau lanjutkan ke katalog
        untuk mencari data lain.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <PendingActionButton
          onClick={() => startRetry(() => reset())}
          pending={retryPending}
          pendingText="Mencoba lagi…"
          className="inline-flex min-h-11 items-center gap-2 rounded-control bg-primary px-4 py-3 text-sm font-semibold text-white"
        >
          <RotateCw size={16} aria-hidden="true" /> Coba lagi
        </PendingActionButton>
        <Link
          href="/dataset"
          className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
        >
          <Search size={16} aria-hidden="true" /> Buka katalog dataset
        </Link>
      </div>
    </main>
  );
}
