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
import { getPaginationItems } from "@/lib/pagination";
import {
  filterAndSortPublicOrganizations,
  organizationContentCount,
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
  const [contentState, setContentState] = useState("all");
  const [contentType, setContentType] = useState("all");
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
        contentState,
        contentType,
      }),
    [organizations, query, sort, contentState, contentType],
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
  const hasActiveFilter =
    Boolean(query.trim()) || contentState !== "all" || contentType !== "all";
  const paginationItems = getPaginationItems(currentPage, pageCount);

  const resetFilters = () => {
    setQuery("");
    setContentState("all");
    setContentType("all");
    setSort("name");
    setPage(1);
  };

  const changePage = (nextPage) => {
    setPage(nextPage);
    window.requestAnimationFrame(() => {
      const list = organizationListRef.current;
      scrollToPublicList(list);
      list?.focus({ preventScroll: true });
    });
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
              Kenali perangkat daerah serta seluruh dataset, indikator,
              infografik, dan publikasi yang diterbitkan untuk umum.
            </p>
          </div>
          <div
            className="organization-directory-summary"
            aria-label={`Ringkasan ${formatCount(summary.organizations)} perangkat daerah; dataset umum ${summary.datasets === null ? "tidak tersedia" : formatCount(summary.datasets)}, indikator ${summary.indicators === null ? "tidak tersedia" : formatCount(summary.indicators)}, infografik ${summary.infographics === null ? "tidak tersedia" : formatCount(summary.infographics)}, publikasi ${summary.publications === null ? "tidak tersedia" : formatCount(summary.publications)}`}
          >
            <div>
              <strong>{formatCount(summary.organizations)}</strong>
              <span>Perangkat daerah</span>
            </div>
            <div>
              <strong>
                {summary.datasets === null
                  ? "—"
                  : formatCount(summary.datasets)}
              </strong>
              <span>Dataset umum</span>
            </div>
            <div>
              <strong>
                {summary.indicators === null
                  ? "—"
                  : formatCount(summary.indicators)}
              </strong>
              <span>Indikator</span>
            </div>
            <div>
              <strong>
                {summary.infographics === null
                  ? "—"
                  : formatCount(summary.infographics)}
              </strong>
              <span>Infografik</span>
            </div>
            <div>
              <strong>
                {summary.publications === null
                  ? "—"
                  : formatCount(summary.publications)}
              </strong>
              <span>Publikasi</span>
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
                <option
                  value="content-desc"
                  disabled={summary.totalPublicItems === null}
                >
                  Konten terbanyak
                </option>
                <option
                  value="datasets-desc"
                  disabled={summary.datasets === null}
                >
                  Dataset umum terbanyak
                </option>
                <option
                  value="indicators-desc"
                  disabled={summary.indicators === null}
                >
                  Indikator terbanyak
                </option>
                <option
                  value="infographics-desc"
                  disabled={summary.infographics === null}
                >
                  Infografik terbanyak
                </option>
                <option
                  value="publications-desc"
                  disabled={summary.publications === null}
                >
                  Publikasi terbanyak
                </option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div
            className="organization-directory-filters"
            role="group"
            aria-label="Filter perangkat daerah berdasarkan penerbitan"
          >
            <span className="organization-directory-filter-label">
              Status penerbit
            </span>
            <button
              type="button"
              onClick={() => {
                setContentState("all");
                setPage(1);
              }}
              aria-pressed={contentState === "all"}
              className="organization-directory-filter"
            >
              {contentState === "all" ? (
                <Check size={14} aria-hidden="true" />
              ) : null}{" "}
              Semua <span>{formatCount(summary.organizations)}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setContentState("with-content");
                setPage(1);
              }}
              disabled={!summary.countsAvailable}
              aria-pressed={contentState === "with-content"}
              className="organization-directory-filter"
            >
              {contentState === "with-content" ? (
                <Check size={14} aria-hidden="true" />
              ) : null}{" "}
              Memiliki terbitan{" "}
              <span>
                {summary.withContent === null
                  ? "—"
                  : formatCount(summary.withContent)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setContentState("without-content");
                setPage(1);
              }}
              disabled={!summary.countsAvailable}
              aria-pressed={contentState === "without-content"}
              className="organization-directory-filter"
            >
              {contentState === "without-content" ? (
                <Check size={14} aria-hidden="true" />
              ) : null}{" "}
              Belum menerbitkan{" "}
              <span>
                {summary.withoutContent === null
                  ? "—"
                  : formatCount(summary.withoutContent)}
              </span>
            </button>
          </div>
          <div className="min-w-0">
            <label
              htmlFor="organization-content-type"
              className="mb-2 block text-xs font-semibold text-muted"
            >
              Jenis katalog
            </label>
            <select
              id="organization-content-type"
              value={contentType}
              onChange={(event) => {
                setContentType(event.target.value);
                setPage(1);
              }}
              className="h-10 w-full rounded-xl border border-line bg-white px-3 text-sm font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <option value="all">Semua jenis terbitan</option>
              <option value="datasets" disabled={summary.datasets === null}>
                Dataset umum
              </option>
              <option value="indicators" disabled={summary.indicators === null}>
                Indikator
              </option>
              <option
                value="infographics"
                disabled={summary.infographics === null}
              >
                Infografik
              </option>
              <option
                value="publications"
                disabled={summary.publications === null}
              >
                Publikasi
              </option>
            </select>
          </div>
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
            <span>
              Setiap angka kategori berasal dari katalog publik masing-masing;
              tanda — berarti hitungan kategori belum tersedia.
            </span>
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
            tabIndex={-1}
          >
            {paginatedOrganizations.map((organization) => {
              const title = organization.title || organization.name;
              const contentCounts = [
                { key: "datasets", label: "Dataset", href: "/dataset" },
                { key: "indicators", label: "Indikator", href: "/statistik" },
                {
                  key: "infographics",
                  label: "Infografik",
                  href: "/infografik",
                },
                { key: "publications", label: "Publikasi", href: "/publikasi" },
              ].map((item) => ({
                ...item,
                count: organizationContentCount(organization, item.key),
              }));
              return (
                <article
                  data-public-list-item="true"
                  key={organization.id || organization.name}
                  className="organization-directory-card group flex min-w-0 flex-col rounded-2xl border border-line bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#b9cfdd] hover:shadow-[0_12px_28px_rgb(23_55_78_/_0.08)] motion-reduce:transform-none motion-reduce:transition-none"
                >
                  <div className="organization-directory-card-top flex items-center justify-between gap-3">
                    <OrganizationMark organization={organization} />
                    <span className="text-[11px] font-medium text-muted">
                      Ringkasan terbitan publik
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
                      "Telusuri daftar dataset, indikator, infografik, dan publikasi yang diterbitkan perangkat daerah ini."}
                  </p>
                  <div
                    className="organization-directory-card-metrics mt-4 grid grid-cols-2 gap-2"
                    aria-label={`Jumlah terbitan publik ${title}`}
                  >
                    {contentCounts.map((item) => (
                      <Link
                        key={item.key}
                        href={`${item.href}?organisasi=${encodeURIComponent(organization.name)}`}
                        className="organization-directory-metric"
                        aria-label={`${item.count === null ? "Jumlah belum tersedia" : formatCount(item.count)} ${item.label} dari ${title}`}
                      >
                        <strong>
                          {item.count === null ? "—" : formatCount(item.count)}
                        </strong>
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                  <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-4">
                    <span
                      className="min-w-0 truncate text-xs text-muted"
                      title={organization.name}
                    >
                      Kode: {organization.name}
                    </span>
                    <Link
                      href={`/organisasi/${organization.name}`}
                      aria-label={`Lihat seluruh katalog terbitan dari ${title}`}
                      className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary transition group-hover:gap-2"
                    >
                      Lihat katalog{" "}
                      <ArrowUpRight size={16} aria-hidden="true" />
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
            <p className="text-sm text-muted" role="status" aria-live="polite">
              Menampilkan {formatCount(firstVisible)}–{formatCount(lastVisible)}{" "}
              dari {formatCount(filteredOrganizations.length)} perangkat daerah
            </p>
            {pageCount > 1 ? (
              <ol
                className="flex flex-wrap items-center justify-center gap-1.5"
                aria-label="Pilih halaman perangkat daerah"
              >
                <li>
                  <button
                    type="button"
                    onClick={() => changePage(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label="Halaman sebelumnya"
                    className="min-h-10 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Sebelumnya
                  </button>
                </li>
                {paginationItems.map((item) => (
                  <li key={String(item)}>
                    {typeof item === "number" ? (
                      <button
                        type="button"
                        onClick={() => changePage(item)}
                        aria-current={item === currentPage ? "page" : undefined}
                        aria-label={
                          item === currentPage
                            ? `Halaman ${item}, halaman aktif`
                            : `Buka halaman ${item}`
                        }
                        className={`inline-flex size-10 items-center justify-center rounded-lg border text-sm font-semibold tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${item === currentPage ? "border-primary bg-primary text-white shadow-sm" : "border-line bg-white text-ink hover:bg-canvas"}`}
                      >
                        {formatCount(item)}
                      </button>
                    ) : (
                      <span
                        aria-hidden="true"
                        className="inline-flex size-10 items-center justify-center text-sm text-muted"
                      >
                        …
                      </span>
                    )}
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    onClick={() => changePage(currentPage + 1)}
                    disabled={currentPage === pageCount}
                    aria-label="Halaman berikutnya"
                    className="min-h-10 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Berikutnya
                  </button>
                </li>
              </ol>
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
            Coba kata kunci lain atau ubah jenis katalog dan status penerbit.
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
