import { Search, SlidersHorizontal } from "lucide-react";

const SORT_OPTIONS = [
  { value: "terbaru", label: "Terbaru diperbarui" },
  { value: "judul", label: "Judul A–Z" },
  { value: "relevansi", label: "Paling relevan" },
];

/** Server-rendered GET search controls shared by thematic public catalogues. */
export function CatalogSearchForm({
  action,
  query = "",
  sort = "terbaru",
  organizationId = null,
  placeholder = "Cari judul, deskripsi, kategori, atau penerbit…",
  label = "Cari katalog",
}) {
  return (
    <form
      action={action}
      method="get"
      role="search"
      aria-label={label}
      className="mb-6 grid gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_13rem_auto] sm:items-end sm:p-5"
    >
      {organizationId ? (
        <input type="hidden" name="organisasi" value={organizationId} />
      ) : null}
      <div className="min-w-0">
        <label
          htmlFor={`${action.replaceAll("/", "-")}-search`}
          className="mb-2 block text-sm font-semibold text-ink"
        >
          {label}
        </label>
        <div className="relative">
          <Search
            size={18}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            id={`${action.replaceAll("/", "-")}-search`}
            type="search"
            name="q"
            defaultValue={query}
            maxLength={100}
            placeholder={placeholder}
            autoComplete="off"
            className="h-12 w-full rounded-xl border border-line bg-white pl-10 pr-3 text-sm text-ink shadow-sm outline-none transition placeholder:text-muted/80 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-focus"
          />
        </div>
      </div>
      <div>
        <label
          htmlFor={`${action.replaceAll("/", "-")}-sort`}
          className="mb-2 block text-sm font-semibold text-ink"
        >
          Urutkan
        </label>
        <div className="relative">
          <SlidersHorizontal
            size={15}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <select
            id={`${action.replaceAll("/", "-")}-sort`}
            name="sort"
            defaultValue={sort}
            className="h-12 w-full appearance-none rounded-xl border border-line bg-white pl-9 pr-3 text-sm text-ink shadow-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-focus"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button
        type="submit"
        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
      >
        <Search size={16} aria-hidden="true" /> Cari
      </button>
    </form>
  );
}
