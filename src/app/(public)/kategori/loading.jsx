export default function CategoriesLoading() {
  return (
    <main
      className="page-container section-space public-interior-page"
      aria-busy="true"
      aria-label="Memuat kategori data"
    >
      <div className="mb-7 max-w-3xl space-y-3">
        <div className="loading-skeleton h-3 w-36" />
        <div className="loading-skeleton h-10 w-64" />
        <div className="loading-skeleton h-5 w-full max-w-2xl" />
      </div>
      <div className="mb-6 grid gap-3 rounded-2xl border border-line bg-white p-4 sm:grid-cols-[minmax(0,1fr)_13rem_auto]">
        <div className="loading-skeleton h-12 rounded-xl" />
        <div className="loading-skeleton h-12 rounded-xl" />
        <div className="loading-skeleton h-12 rounded-xl" />
      </div>
      <div
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        aria-hidden="true"
      >
        {Array.from({ length: 9 }, (_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 rounded-xl border border-line bg-white p-4"
          >
            <span className="loading-skeleton size-11 shrink-0 rounded-xl" />
            <span className="min-w-0 flex-1 space-y-2">
              <span className="loading-skeleton block h-4 w-4/5" />
              <span className="loading-skeleton block h-3 w-2/5" />
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
