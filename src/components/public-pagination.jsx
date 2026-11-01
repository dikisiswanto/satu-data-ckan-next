import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getPaginationItems } from "@/lib/pagination";

const numberFormat = new Intl.NumberFormat("id-ID");

export function PublicPagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 24,
  itemLabel = "data",
  ariaLabel = "Navigasi halaman",
  hrefForPage,
  className = "",
}) {
  const total = Math.max(1, Math.trunc(Number(totalPages) || 1));
  const current = Math.min(
    total,
    Math.max(1, Math.trunc(Number(currentPage) || 1)),
  );
  const count = Math.max(0, Math.trunc(Number(totalItems) || 0));
  const size = Math.max(1, Math.trunc(Number(pageSize) || 1));

  if (total <= 1 || typeof hrefForPage !== "function") return null;

  const firstItem = count ? (current - 1) * size + 1 : 0;
  const lastItem = Math.min(current * size, count);
  const pages = getPaginationItems(current, total);
  const linkClass =
    "inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2";
  const inactiveClass =
    "border-line bg-white text-ink hover:border-primary/40 hover:bg-accent";
  const activeClass = "border-primary bg-primary text-white shadow-sm";
  const disabledClass =
    "inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-medium text-muted/70";

  return (
    <div
      className={`public-pagination mt-8 border-t border-line pt-5 ${className}`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p
          className="text-xs leading-5 text-muted sm:text-sm"
          aria-live="polite"
        >
          Menampilkan {numberFormat.format(firstItem)}–
          {numberFormat.format(lastItem)} dari {numberFormat.format(count)}{" "}
          {itemLabel}
        </p>
        <p className="text-xs font-medium tabular-nums text-muted">
          Halaman {numberFormat.format(current)} dari{" "}
          {numberFormat.format(total)}
        </p>
      </div>
      <nav aria-label={ariaLabel}>
        <ul className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-end">
          <li>
            {current > 1 ? (
              <Link
                href={hrefForPage(current - 1)}
                rel="prev"
                scroll={false}
                className={`${linkClass} ${inactiveClass} gap-1.5 px-3`}
                aria-label="Buka halaman sebelumnya"
              >
                <ChevronLeft size={16} aria-hidden="true" />
                <span className="hidden sm:inline">Sebelumnya</span>
              </Link>
            ) : (
              <span className={disabledClass} aria-disabled="true">
                <ChevronLeft size={16} aria-hidden="true" />
                <span className="hidden sm:inline">Sebelumnya</span>
              </span>
            )}
          </li>
          {pages.map((page) => (
            <li key={String(page)}>
              {typeof page === "number" ? (
                <Link
                  href={hrefForPage(page)}
                  scroll={false}
                  aria-current={page === current ? "page" : undefined}
                  aria-label={
                    page === current
                      ? `Halaman ${page}, halaman aktif`
                      : `Buka halaman ${page}`
                  }
                  className={`${linkClass} ${page === current ? activeClass : inactiveClass}`}
                >
                  {numberFormat.format(page)}
                </Link>
              ) : (
                <span
                  key={page}
                  className="inline-flex min-h-10 min-w-7 items-center justify-center text-sm text-muted"
                  aria-label="Halaman dilewati"
                  aria-hidden="true"
                >
                  …
                </span>
              )}
            </li>
          ))}
          <li>
            {current < total ? (
              <Link
                href={hrefForPage(current + 1)}
                rel="next"
                scroll={false}
                className={`${linkClass} ${inactiveClass} gap-1.5 px-3`}
                aria-label="Buka halaman berikutnya"
              >
                <span className="hidden sm:inline">Berikutnya</span>
                <ChevronRight size={16} aria-hidden="true" />
              </Link>
            ) : (
              <span className={disabledClass} aria-disabled="true">
                <span className="hidden sm:inline">Berikutnya</span>
                <ChevronRight size={16} aria-hidden="true" />
              </span>
            )}
          </li>
        </ul>
      </nav>
    </div>
  );
}
