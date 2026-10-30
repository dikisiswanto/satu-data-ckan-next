import Link from "next/link";
import { connection } from "next/server";
import {
  ArrowUpRight,
  Check,
  Filter,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { DatasetCard } from "@/components/dataset-card";
import { PageHeading } from "@/components/page-heading";
import { publicPageCopy } from "@/lib/public-copy";
import {
  getPublishedDatasetFacetsResult,
  getPublishedDatasetsResult,
} from "@/lib/data/public";
import { Button } from "@/components/ui/button";
import { Input, fieldStyles } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  getCanonicalMetadata,
  getSocialMetadata,
  siteConfig,
} from "@/lib/site-config";

export const metadata = {
  title: "Katalog Dataset",
  description: `Temukan dataset ${siteConfig.regionName} berdasarkan judul, uraian, kata kunci, perangkat daerah, topik, tahun, dan format berkas.`,
  ...getCanonicalMetadata("/dataset"),
  ...getSocialMetadata({
    path: "/dataset",
    title: `Katalog Dataset | ${siteConfig.shortName}`,
    description: `Telusuri data resmi ${siteConfig.regionName} berdasarkan topik, perangkat daerah, tahun data, dan format berkas.`,
  }),
};

export default async function DatasetCatalogPage({ searchParams }) {
  const params = await searchParams;
  const query =
    typeof params?.q === "string" ? params.q.trim().slice(0, 100) : "";
  const requestedCategory =
    typeof params?.kategori === "string" ? params.kategori.slice(0, 100) : "";
  const category = /^[a-z0-9][a-z0-9_-]*$/i.test(requestedCategory)
    ? requestedCategory
    : "";
  const requestedOrganization =
    typeof params?.organisasi === "string"
      ? params.organisasi.slice(0, 36)
      : "";
  const organizationId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(
    requestedOrganization,
  )
    ? requestedOrganization
    : "";
  const requestedSort = typeof params?.urut === "string" ? params.urut : "";
  const sort = ["relevance", "updated", "title"].includes(requestedSort)
    ? requestedSort
    : query
      ? "relevance"
      : "updated";
  const requestedYear = typeof params?.tahun === "string" ? params.tahun : "";
  const parsedYear = /^\d{4}$/.test(requestedYear)
    ? Number(requestedYear)
    : null;
  const year =
    parsedYear !== null && parsedYear >= 1900 && parsedYear <= 2200
      ? parsedYear
      : null;
  const requestedFormat =
    typeof params?.format === "string" ? params.format : "";
  const format = ["csv", "xlsx", "pdf", "json", "geojson"].includes(
    requestedFormat,
  )
    ? requestedFormat
    : "";
  const requestedPage =
    typeof params?.halaman === "string" ? Number(params.halaman) : 1;
  const page =
    Number.isSafeInteger(requestedPage) &&
    requestedPage >= 1 &&
    requestedPage <= 4167
      ? requestedPage
      : 1;
  const pageSize = 24;
  const [facetsResult, datasetResult] = await Promise.all([
    getPublishedDatasetFacetsResult(),
    getPublishedDatasetsResult({
      query,
      category: category || null,
      organizationId: organizationId || null,
      sort,
      year,
      format,
      limit: pageSize,
      page,
    }),
  ]);
  // A rendered fallback is still a successful route render from Next's perspective.
  // Avoid storing transient catalog/facet failures in the route cache.
  if (facetsResult.unavailable || datasetResult.unavailable) await connection();
  const { categories, organizations, years } = facetsResult.data;
  const resultRows = datasetResult.data;
  const hasNextPage = datasetResult.meta?.last_page
    ? page < Number(datasetResult.meta.last_page)
    : resultRows.length === pageSize && page < 4167;
  const datasets = resultRows.slice(0, pageSize);
  const hasFilters = Boolean(
    query || category || organizationId || year || format,
  );
  const filterCount = [category, organizationId, year, format].filter(
    Boolean,
  ).length;
  const organizationLabel = organizations.find(
    (item) => item.id === organizationId,
  )?.name;
  const categoryLabel = categories.find((item) => item.id === category)?.name;
  const formatLabels = {
    csv: "CSV",
    xlsx: "Excel (XLSX)",
    json: "JSON",
    geojson: "GeoJSON",
    pdf: "PDF",
  };
  const activeFilters = [
    query ? { key: "q", label: `Kata kunci: ${query}` } : null,
    category
      ? { key: "kategori", label: `Topik: ${categoryLabel || category}` }
      : null,
    organizationId
      ? {
          key: "organisasi",
          label: `Perangkat daerah: ${organizationLabel || "Dipilih"}`,
        }
      : null,
    year ? { key: "tahun", label: `Tahun data: ${year}` } : null,
    format
      ? { key: "format", label: `Format: ${formatLabels[format] || format}` }
      : null,
  ].filter(Boolean);
  const hrefWithoutFilter = (removedKey) => {
    const search = new URLSearchParams();
    if (removedKey !== "q" && query) search.set("q", query);
    if (removedKey !== "kategori" && category) search.set("kategori", category);
    if (removedKey !== "organisasi" && organizationId)
      search.set("organisasi", organizationId);
    if (removedKey !== "urut" && sort) search.set("urut", sort);
    if (removedKey !== "tahun" && year) search.set("tahun", String(year));
    if (removedKey !== "format" && format) search.set("format", format);
    const suffix = search.toString();
    return suffix ? `/dataset?${suffix}` : "/dataset";
  };
  const pageHref = (pageNumber) => {
    const search = new URLSearchParams();
    if (query) search.set("q", query);
    if (category) search.set("kategori", category);
    if (organizationId) search.set("organisasi", organizationId);
    if (sort) search.set("urut", sort);
    if (year) search.set("tahun", String(year));
    if (format) search.set("format", format);
    if (pageNumber > 1) search.set("halaman", String(pageNumber));
    const suffix = search.toString();
    return suffix ? `/dataset?${suffix}` : "/dataset";
  };

  return (
    <main>
      <section className="relative z-10 [overflow:visible] border-b border-[#d9e1dc] bg-[linear-gradient(135deg,#eef3ee_0%,#edf4f6_60%,#f7f9fb_100%)] has-[details[open]]:z-40">
        <div className="page-container py-10 sm:py-14">
          <PageHeading {...publicPageCopy.dataset} />
          <form action="/dataset" method="get" role="search" className="mt-8">
            <div className="relative flex min-w-0 flex-col items-stretch gap-3 rounded-2xl border border-[#d5e0e8] bg-white p-3 shadow-[0_8px_28px_rgb(20_55_60_/_0.07)] sm:flex-row sm:items-end sm:p-4">
              <div className="min-w-0 flex-1">
                <label
                  htmlFor="catalog-q"
                  className="mb-2 block text-sm font-semibold"
                >
                  Kata kunci
                </label>
                <div className="relative">
                  <Search
                    aria-hidden="true"
                    size={18}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                  />
                  <Input
                    id="catalog-q"
                    name="q"
                    type="search"
                    defaultValue={query}
                    placeholder="Misalnya: puskesmas, anggaran, jalan, jumlah penduduk…"
                    className="h-12 pl-10"
                  />
                </div>
                <p className="mt-2 text-xs leading-5 text-muted">
                  Contoh: “sekolah atau puskesmas” atau “realisasi anggaran
                  kecamatan”. Pencarian mencakup judul, uraian, kata kunci,
                  perangkat daerah, topik, dan nama berkas.
                </p>
              </div>
              <Button
                type="submit"
                size="lg"
                className="min-h-12 w-full shrink-0 sm:mt-7 sm:w-auto sm:self-start"
              >
                <Search size={16} aria-hidden="true" /> Cari dataset
              </Button>
              <details className="relative z-10 w-full min-w-0 shrink-0 sm:mt-7 sm:w-auto sm:self-start open:z-[41]">
                <summary
                  aria-label="Buka filter katalog"
                  className="flex h-12 cursor-pointer list-none items-center justify-center gap-2 rounded-control border border-line bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus [&::-webkit-details-marker]:hidden [details[open]_&]:border-primary [details[open]_&]:bg-[#f0f7ff] [details[open]_&]:text-primary"
                >
                  <SlidersHorizontal
                    className="shrink-0 text-current"
                    size={16}
                    aria-hidden="true"
                  />
                  Filter
                  {filterCount ? (
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[0.7rem] font-bold leading-4 text-white">
                      {filterCount}
                    </span>
                  ) : null}
                </summary>
                <div className="absolute left-0 right-auto top-full z-[60] mt-2 max-h-[min(68dvh,34rem)] w-[calc(100vw-2rem)] min-w-0 max-w-[calc(100vw-2rem)] overflow-x-hidden overflow-y-auto overscroll-contain rounded-2xl border border-line bg-white p-3 shadow-[0_18px_60px_rgb(15_35_50_/_0.16)] sm:left-auto sm:right-0 sm:max-h-[min(70dvh,38rem)] sm:w-[min(34rem,calc(100vw-2rem))] sm:p-5">
                  <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
                    <div>
                      <h2 className="text-sm font-semibold text-ink">
                        Filter dataset
                      </h2>
                      <p className="mt-1 text-xs text-muted">
                        Pilihan filter mengikuti informasi yang tersedia. Tahun
                        data menunjukkan periode yang dicakup, bukan tanggal
                        dataset diterbitkan.
                      </p>
                    </div>
                    {hasFilters ? (
                      <Link
                        href="/dataset"
                        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                      >
                        Hapus filter
                      </Link>
                    ) : null}
                  </div>
                  <div className="grid gap-4 py-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="catalog-category"
                        className="mb-2 block text-sm font-semibold"
                      >
                        Topik
                      </label>
                      <select
                        id="catalog-category"
                        name="kategori"
                        defaultValue={category}
                        className={cn(fieldStyles, "h-11 py-0")}
                      >
                        <option value="">Semua topik</option>
                        {categories.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="catalog-organization"
                        className="mb-2 block text-sm font-semibold"
                      >
                        Perangkat daerah
                      </label>
                      <select
                        id="catalog-organization"
                        name="organisasi"
                        defaultValue={organizationId}
                        className={cn(fieldStyles, "h-11 py-0")}
                      >
                        <option value="">Semua perangkat daerah</option>
                        {organizations.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="catalog-year"
                        className="mb-2 block text-sm font-semibold"
                      >
                        Tahun data
                      </label>
                      <select
                        id="catalog-year"
                        name="tahun"
                        defaultValue={year || ""}
                        className={cn(fieldStyles, "h-11 py-0")}
                      >
                        <option value="">Semua tahun</option>
                        {years.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="catalog-format"
                        className="mb-2 block text-sm font-semibold"
                      >
                        Format berkas
                      </label>
                      <select
                        id="catalog-format"
                        name="format"
                        defaultValue={format}
                        className={cn(fieldStyles, "h-11 py-0")}
                      >
                        <option value="">Semua format</option>
                        <option value="csv">CSV</option>
                        <option value="xlsx">Excel (XLSX)</option>
                        <option value="json">JSON</option>
                        <option value="geojson">GeoJSON</option>
                        <option value="pdf">PDF</option>
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="catalog-sort"
                        className="mb-2 block text-sm font-semibold"
                      >
                        Urutkan
                      </label>
                      <select
                        id="catalog-sort"
                        name="urut"
                        defaultValue={sort}
                        className={cn(fieldStyles, "h-11 py-0")}
                      >
                        <option value="relevance">Paling relevan</option>
                        <option value="updated">Pembaruan terbaru</option>
                        <option value="title">Nama A–Z</option>
                      </select>
                    </div>
                  </div>
                  <input type="hidden" name="halaman" value="1" />
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                    <Button type="submit" size="md">
                      <Check size={15} aria-hidden="true" /> Terapkan filter
                    </Button>
                    <span className="text-xs text-muted">
                      {filterCount
                        ? `${filterCount} filter aktif`
                        : query
                          ? "Pencarian aktif"
                          : "Belum ada filter yang dipilih"}
                    </span>
                  </div>
                </div>
              </details>
            </div>
          </form>
        </div>
      </section>

      <section
        id="dataset-list"
        className="page-container section-space public-interior-page scroll-mt-24"
      >
        {facetsResult.unavailable ? (
          <p
            role="status"
            className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"
          >
            Sebagian pilihan filter belum dapat ditampilkan. Anda tetap dapat
            mencari berdasarkan kata kunci; coba muat ulang halaman untuk
            memperbarui filter.
          </p>
        ) : null}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Hasil penelusuran</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">
              {query ? `Hasil untuk “${query}”` : "Dataset yang tersedia"}
            </h2>
            <p className="mt-2 text-sm text-muted" aria-live="polite">
              {datasetResult.unavailable
                ? "Hasil pencarian belum dapat ditampilkan. Silakan coba kembali beberapa saat lagi."
                : `${Number(datasetResult.meta?.total ?? datasets.length).toLocaleString("id-ID")} hasil ditemukan · Menampilkan ${datasets.length} dataset pada halaman ${page}${hasFilters ? " sesuai filter" : ""}.`}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-2 text-xs font-medium text-muted">
            <Filter size={14} aria-hidden="true" />
            {filterCount && query
              ? `${filterCount} filter · pencarian aktif`
              : filterCount
                ? `${filterCount} filter aktif`
                : query
                  ? "Pencarian aktif"
                  : "Semua dataset publik"}
          </div>
        </div>
        {activeFilters.length ? (
          <div
            className="mb-6 flex flex-wrap items-center gap-2"
            aria-label="Filter dan pencarian aktif"
          >
            <span className="text-xs font-semibold text-muted">
              Filter dipilih:
            </span>
            {activeFilters.map((item) => (
              <span
                key={item.key}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#d2e2dd] bg-[#f0f7f3] py-1 pl-3 pr-1 text-xs font-medium text-[#285c54]"
              >
                {item.label}
                <Link
                  href={hrefWithoutFilter(item.key)}
                  aria-label={`Hapus ${item.label}`}
                  title={`Hapus ${item.label}`}
                  className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#285c54] transition-colors hover:bg-[#dcece5]"
                >
                  <X size={13} aria-hidden="true" />
                </Link>
              </span>
            ))}
            <Link
              href="/dataset"
              className="cursor-pointer px-2 py-1 text-xs font-semibold text-primary underline-offset-4 hover:underline"
            >
              Hapus semua
            </Link>
          </div>
        ) : null}
        {datasetResult.unavailable ? (
          <div className="public-empty-panel w-full p-8 sm:p-10" role="alert">
            <span className="public-empty-icon">
              <Search size={22} aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-lg font-semibold">
              Katalog data sementara tidak dapat ditampilkan
            </h2>
            <p className="mx-auto mt-2 w-full max-w-xl text-sm leading-6 text-[#526777]">
              Katalog data sedang mengalami kendala. Silakan coba kembali
              beberapa saat lagi. Hanya dataset yang telah dipublikasikan untuk
              umum yang ditampilkan.
            </p>
            <a href={pageHref(page)} className="public-empty-action">
              Coba lagi
            </a>
          </div>
        ) : datasets.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {datasets.map((dataset) => (
              <DatasetCard key={dataset.id} dataset={dataset} />
            ))}
          </div>
        ) : (
          <div className="public-empty-panel min-h-64 w-full max-w-none justify-center rounded-2xl border border-[#d7e2ea] bg-white p-8 text-center sm:p-12">
            <span className="public-empty-icon mx-auto">
              <Search size={22} aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-xl font-semibold tracking-tight text-[#17364f]">
              {page > 1
                ? "Tidak ada dataset pada halaman ini"
                : hasFilters
                  ? "Data yang sesuai belum ditemukan"
                  : "Belum ada dataset yang dipublikasikan"}
            </h2>
            <p className="mx-auto mt-2 w-full max-w-xl text-sm leading-6 text-[#526777]">
              {hasFilters
                ? "Coba gunakan kata kunci yang lebih singkat, periksa ejaan, atau ubah pilihan filter. Anda juga dapat menghapus semua filter untuk melihat seluruh katalog."
                : "Dataset akan tampil setelah informasinya diperiksa dan dipublikasikan oleh perangkat daerah."}
            </p>
            {hasFilters ? (
              <Button href="/dataset" variant="secondary" className="mt-5">
                Hapus semua filter
              </Button>
            ) : (
              <Link href="/organisasi" className="public-empty-action">
                Lihat daftar perangkat daerah{" "}
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            )}
          </div>
        )}
        {datasets.length || page > 1 ? (
          <nav
            aria-label="Navigasi halaman katalog"
            className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5"
          >
            <p className="text-sm text-muted">Halaman {page}</p>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link
                  href={pageHref(page - 1)}
                  scroll={false}
                  className="rounded-control border border-line bg-surface px-4 py-2.5 text-sm font-semibold hover:bg-accent"
                >
                  Sebelumnya
                </Link>
              ) : null}
              {hasNextPage ? (
                <Link
                  href={pageHref(page + 1)}
                  scroll={false}
                  className="rounded-control bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  Berikutnya
                </Link>
              ) : null}
            </div>
          </nav>
        ) : null}
        <p className="mt-8 text-xs leading-5 text-muted">
          Hanya dataset yang sudah dipublikasikan dan masih berlaku yang dapat
          ditemukan di katalog ini.
        </p>
      </section>
    </main>
  );
}
