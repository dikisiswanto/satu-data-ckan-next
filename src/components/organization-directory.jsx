"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  Building2,
  Check,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { getPublicOrganizationImageUrl } from "@/lib/ckan/public-media-url";
import { scrollToPublicList } from "@/lib/public-scroll";
import {
  filterAndSortPublicOrganizations,
  organizationDatasetCount,
  summarizePublicOrganizations,
} from "@/lib/public-organizations";

function formatCount(value) {
  return new Intl.NumberFormat("id-ID").format(Number(value) || 0);
}

const PAGE_SIZE = 12;

function OrganizationMark({ organization }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = getPublicOrganizationImageUrl(organization);
  return (
    <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-[#d7e7f2] bg-[#edf5fb] text-[#245e83]">
      {imageUrl && !failed ? (
        <Image
          src={imageUrl}
          alt={`Logo ${organization.title || organization.name || "perangkat daerah"}`}
          width={44}
          height={44}
          unoptimized
          className="size-full object-contain p-1"
          onError={() => setFailed(true)}
        />
      ) : (
        <Building2 size={21} aria-hidden="true" />
      )}
    </span>
  );
}

export function OrganizationDirectory({ organizations = [] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("name");
  const [datasetState, setDatasetState] = useState("all");
  const [page, setPage] = useState(1);
  const organizationListRef = useRef(null);

  const summary = useMemo(
    () => summarizePublicOrganizations(organizations),
    [organizations],
  );
  const filteredOrganizations = useMemo(
    () =>
      filterAndSortPublicOrganizations(organizations, {
        query,
        sort,
        datasetState,
      }),
    [organizations, query, sort, datasetState],
  );
  const pageCount = Math.max(
    1,
    Math.ceil(filteredOrganizations.length / PAGE_SIZE),
  );
  const currentPage = Math.min(page, pageCount);
  const paginatedOrganizations = filteredOrganizations.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const firstVisible = filteredOrganizations.length
    ? (currentPage - 1) * PAGE_SIZE + 1
    : 0;
  const lastVisible = Math.min(
    currentPage * PAGE_SIZE,
    filteredOrganizations.length,
  );
  const hasActiveFilter = Boolean(query.trim()) || datasetState !== "all";

  const resetFilters = () => {
    setQuery("");
    setDatasetState("all");
    setSort("name");
    setPage(1);
  };

  const changePage = (nextPage) => {
    setPage(nextPage);
    window.requestAnimationFrame(() =>
      scrollToPublicList(organizationListRef.current),
    );
  };

  return (
    <div className="organization-directory space-y-5">
      <section
        className="organization-directory-toolbar"
        aria-label="Pencarian perangkat daerah"
      >
        <div className="organization-directory-intro">
          <div className="min-w-0">
            <p className="eyebrow">SUMBER DATA DAERAH</p>
            <h2>Temukan perangkat daerah</h2>
            <p>
              Kenali instansi penerbit data dan telusuri dataset publik yang
              mereka sediakan.
            </p>
          </div>
          <div
            className="organization-directory-summary"
            aria-label={`${formatCount(summary.organizations)} perangkat daerah dan ${formatCount(summary.datasets)} dataset`}
          >
            <div>
              <strong>{formatCount(summary.organizations)}</strong>
              <span>Perangkat daerah</span>
            </div>
            <div>
              <strong>{formatCount(summary.datasets)}</strong>
              <span>Dataset publik</span>
            </div>
          </div>
        </div>

        <div className="organization-directory-controls">
          <div className="organization-directory-search min-w-0 flex-1">
            <label
              htmlFor="organization-search"
              className="mb-2 block text-sm font-semibold text-ink"
            >
              Cari perangkat daerah
            </label>
            <div className="relative">
              <Search
                size={18}
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
              />
              <Input
                id="organization-search"
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Contoh: Dinas Kesehatan, Bappeda, pendidikan…"
                className="h-12 pl-10 pr-11"
                autoComplete="off"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setPage(1);
                  }}
                  aria-label="Hapus pencarian perangkat daerah"
                  className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition hover:bg-canvas hover:text-ink"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              ) : null}
            </div>
            <p className="mt-1.5 text-xs text-muted">
              Pencarian mencocokkan nama, kode, maupun deskripsi perangkat
              daerah.
            </p>
          </div>
          <div className="organization-directory-sort">
            <label
              htmlFor="organization-sort"
              className="mb-2 block text-sm font-semibold text-ink"
            >
              Urutkan daftar
            </label>
            <div className="relative">
              <SlidersHorizontal
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <select
                id="organization-sort"
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value);
                  setPage(1);
                }}
                className="h-12 w-full appearance-none rounded-xl border border-line bg-white pl-9 pr-8 text-sm font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <option value="name">Nama A–Z</option>
                <option value="datasets-desc">Dataset terbanyak</option>
                <option value="datasets-asc">Dataset paling sedikit</option>
              </select>
            </div>
          </div>
        </div>

        <div
          className="organization-directory-filters"
          role="group"
          aria-label="Filter penerbit dataset"
        >
          <span className="organization-directory-filter-label">Tampilkan</span>
          <button
            type="button"
            onClick={() => {
              setDatasetState("all");
              setPage(1);
            }}
            aria-pressed={datasetState === "all"}
            className="organization-directory-filter"
          >
            {datasetState === "all" ? (
              <Check size={14} aria-hidden="true" />
            ) : null}
            Semua <span>{formatCount(summary.organizations)}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setDatasetState("with-data");
              setPage(1);
            }}
            aria-pressed={datasetState === "with-data"}
            className="organization-directory-filter"
          >
            {datasetState === "with-data" ? (
              <Check size={14} aria-hidden="true" />
            ) : null}
            Memiliki dataset <span>{formatCount(summary.withDatasets)}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setDatasetState("without-data");
              setPage(1);
            }}
            aria-pressed={datasetState === "without-data"}
            className="organization-directory-filter"
          >
            {datasetState === "without-data" ? (
              <Check size={14} aria-hidden="true" />
            ) : null}
            Belum menerbitkan{" "}
            <span>{formatCount(summary.withoutDatasets)}</span>
          </button>
        </div>

        <div className="organization-directory-resultbar" aria-live="polite">
          <p>
            {hasActiveFilter ? (
              <>
                Ditemukan{" "}
                <strong>{formatCount(filteredOrganizations.length)}</strong>{" "}
                perangkat daerah
              </>
            ) : (
              <>
                Menampilkan{" "}
                <strong>{formatCount(filteredOrganizations.length)}</strong>{" "}
                perangkat daerah
              </>
            )}
          </p>
          {hasActiveFilter ? (
            <button
              type="button"
              onClick={resetFilters}
              className="font-semibold text-primary hover:underline"
            >
              Hapus semua filter
            </button>
          ) : (
            <span>Jumlah dataset mengikuti data publik di CKAN.</span>
          )}
        </div>
      </section>

      {filteredOrganizations.length ? (
        <>
          <div
            ref={organizationListRef}
            id="organization-list"
            className="organization-directory-grid grid scroll-mt-24 gap-4 sm:grid-cols-2 xl:grid-cols-3"
            aria-label="Daftar perangkat daerah"
          >
            {paginatedOrganizations.map((organization) => {
              const title = organization.title || organization.name;
              const datasetCount = organizationDatasetCount(organization);
              return (
                <article
                  data-public-list-item="true"
                  key={organization.id || organization.name}
                  className="organization-directory-card group flex min-w-0 flex-col rounded-2xl border border-line bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#b9cfdd] hover:shadow-[0_12px_28px_rgb(23_55_78_/_0.08)] motion-reduce:transform-none motion-reduce:transition-none"
                >
                  <div className="organization-directory-card-top flex items-center justify-between gap-3">
                    <OrganizationMark organization={organization} />
                    <span
                      className={`organization-directory-count inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ${datasetCount ? "has-datasets" : "no-datasets"}`}
                    >
                      {formatCount(datasetCount)} dataset
                    </span>
                  </div>
                  <h3 className="mt-4 break-words text-base font-semibold leading-6 text-ink">
                    <Link
                      href={`/organisasi/${organization.name}`}
                      className="decoration-primary/40 underline-offset-4 hover:text-primary hover:underline focus-visible:underline"
                    >
                      {title}
                    </Link>
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">
                    {organization.description ||
                      (datasetCount
                        ? "Lihat dataset publik yang diterbitkan perangkat daerah ini."
                        : "Profil perangkat daerah tersedia; dataset publik belum diterbitkan.")}
                  </p>
                  <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-4">
                    <span
                      className="min-w-0 truncate text-xs text-muted"
                      title={organization.name}
                    >
                      Kode: {organization.name}
                    </span>
                    <Link
                      href={`/organisasi/${organization.name}`}
                      aria-label={`Lihat dataset dari ${title}`}
                      className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary transition group-hover:gap-2"
                    >
                      Lihat data <ArrowUpRight size={16} aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>

          <nav
            aria-label="Paginasi perangkat daerah"
            className="organization-directory-pagination flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4"
          >
            <p className="text-sm text-muted">
              Menampilkan {formatCount(firstVisible)}–{formatCount(lastVisible)}{" "}
              dari {formatCount(filteredOrganizations.length)} perangkat daerah
            </p>
            {pageCount > 1 ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => changePage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="min-h-10 rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Sebelumnya
                </button>
                <span className="px-2 text-sm tabular-nums text-muted">
                  {formatCount(currentPage)} / {formatCount(pageCount)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    changePage(Math.min(pageCount, currentPage + 1))
                  }
                  disabled={currentPage === pageCount}
                  className="min-h-10 rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Berikutnya
                </button>
              </div>
            ) : null}
          </nav>
        </>
      ) : (
        <div className="surface-panel min-w-0 rounded-2xl px-5 py-10 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-xl bg-slate-100 text-muted">
            <Building2 size={22} aria-hidden="true" />
          </span>
          <h2 className="mt-3 font-semibold text-ink">
            Perangkat daerah tidak ditemukan
          </h2>
          <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-muted">
            Coba kata kunci lain atau ubah filter penerbit dataset.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
          >
            Tampilkan semua perangkat daerah
          </button>
        </div>
      )}
    </div>
  );
}
