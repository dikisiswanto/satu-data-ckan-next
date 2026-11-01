import { Info } from "lucide-react";

export function PublicNote({ children, className = "" }) {
  return (
    <aside
      className={`public-note mt-8 flex items-start gap-2.5 rounded-xl border border-line/80 bg-surface/70 px-3.5 py-3 text-xs leading-5 text-muted sm:px-4 ${className}`}
      aria-label="Catatan"
    >
      <Info
        size={15}
        className="mt-0.5 shrink-0 text-muted"
        aria-hidden="true"
      />
      <div className="min-w-0">{children}</div>
    </aside>
  );
}
