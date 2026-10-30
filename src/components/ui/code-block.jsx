"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/** Accessible code sample with a copy action, built from Tailwind utilities. */
export function CodeBlock({ children, className }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const source =
    typeof children === "string" ? children : String(children ?? "");

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(source);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopied(false);
      setCopyError(true);
    }
  }

  return (
    <div
      className={cn(
        "group relative min-w-0 overflow-hidden rounded-xl border border-slate-800/10 bg-slate-950 text-slate-100 shadow-sm",
        className,
      )}
    >
      <button
        type="button"
        onClick={copyCode}
        className="absolute right-2 top-2 z-10 inline-flex min-h-8 items-center gap-1.5 rounded-md border border-white/15 bg-slate-800/95 px-2.5 text-xs font-medium text-slate-100 transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        aria-label={
          copied
            ? "Kode berhasil disalin"
            : copyError
              ? "Gagal menyalin kode"
              : "Salin contoh kode"
        }
      >
        {copied ? (
          <Check size={13} aria-hidden="true" />
        ) : (
          <Copy size={13} aria-hidden="true" />
        )}
        {copied ? "Tersalin" : copyError ? "Gagal" : "Salin"}
      </button>
      <pre className="max-w-full overflow-x-auto p-4 pr-24 text-xs leading-6 sm:text-sm">
        <code>{source}</code>
      </pre>
      <span className="sr-only" role="status" aria-live="polite">
        {copied
          ? "Kode disalin ke clipboard."
          : copyError
            ? "Tidak dapat menyalin otomatis. Pilih teks kode untuk menyalinnya secara manual."
            : ""}
      </span>
    </div>
  );
}
