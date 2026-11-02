import { Search, SlidersHorizontal } from "lucide-react";

function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`loading-skeleton ${className}`} />;
}

/** Geometry-aligned placeholder for the shared public catalogue search form. */
export function CatalogSearchFormSkeleton({ labelWidth = "w-32" } = {}) {
  return (
    <div
      className="mb-6 grid gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_13rem_auto] sm:items-end sm:p-5"
      aria-hidden="true"
    >
      <div className="min-w-0">
        <Skeleton className={`mb-2 h-4 ${labelWidth}`} />
        <div className="relative">
          <Search
            size={18}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
      <div>
        <Skeleton className="mb-2 h-4 w-16" />
        <div className="relative">
          <SlidersHorizontal
            size={15}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
      <Skeleton className="h-12 w-full rounded-xl sm:w-24" />
    </div>
  );
}
