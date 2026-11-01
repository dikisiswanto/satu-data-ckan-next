import { ArrowUpRight, FileText } from "lucide-react";
import { formatBytes } from "@/lib/utils";

export function PdfResourcePreview({
  url,
  title = "Pratinjau PDF",
  fileName = "Dokumen PDF",
  size,
  className = "",
  heightClassName = "h-[68vh] min-h-[420px]",
}) {
  if (!url) return null;

  return (
    <section
      className={`overflow-hidden rounded-2xl border border-line bg-white ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-primary">
            <FileText size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="font-semibold text-ink">{title}</h2>
            <p className="mt-1 truncate text-sm text-muted">{fileName}</p>
            {size ? (
              <p className="mt-0.5 text-xs text-muted">{formatBytes(size)}</p>
            ) : null}
          </div>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          Buka PDF <ArrowUpRight size={15} aria-hidden="true" />
        </a>
      </div>
      <iframe
        title={`${title}: ${fileName}`}
        src={url}
        className={`${heightClassName} w-full bg-slate-50`}
        loading="lazy"
      />
      <p className="border-t border-line px-4 py-2.5 text-xs leading-5 text-muted">
        Jika pratinjau tidak didukung oleh browser atau perangkat, gunakan
        tombol Buka PDF untuk melihat dokumen di tab baru.
      </p>
    </section>
  );
}
