"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ArrowUpRight, Building2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { scrollToPublicList } from "@/lib/public-scroll";

function formatCount(value) {
  return new Intl.NumberFormat("id-ID").format(value ?? 0);
}

const PAGE_SIZE = 12;

export function OrganizationDirectory({ organizations }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const organizationListRef = useRef(null);
  const changePage = (nextPage) => {
    setPage(nextPage);
    window.requestAnimationFrame(() =>
      scrollToPublicList(organizationListRef.current),
    );
  };
  const filteredOrganizations = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");
    if (!normalizedQuery) return organizations;
    return organizations.filter((organization) =>
      [organization.title, organization.name, organization.description]
        .filter(Boolean)
        .some((value) =>
          value.toLocaleLowerCase("id-ID").includes(normalizedQuery),
        ),
    );
  }, [organizations, query]);
  const pageCount = Math.max(
    1,
    Math.ceil(filteredOrganizations.length / PAGE_SIZE),
  );
  const currentPage = Math.min(page, pageCount);
  const paginatedOrganizations = useMemo(
    () =>
      filteredOrganizations.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
      ),
    [filteredOrganizations, currentPage],
  );

  return (
    <div className="space-y-5">
      <div className="max-w-[44rem] rounded-lg border border-[#d4dfe5] bg-white p-4">
        <label
          htmlFor="organization-search"
          className="mb-2 block text-sm font-semibold"
        >
          Cari perangkat daerah
        </label>
        <div className="relative">
          <Search
            size={18}
            aria-hidden="true"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <Input
            id="organization-search"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Cari nama perangkat daerah…"
            className="h-11 pl-10 pr-11"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Hapus pencarian perangkat daerah"
              className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded border border-line text-muted hover:bg-canvas"
            >
              <X size={15} aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-muted" aria-live="polite">
          Menampilkan {formatCount(filteredOrganizations.length)} dari{" "}
          {formatCount(organizations.length)} perangkat daerah.
        </p>
      </div>

      {filteredOrganizations.length ? (
        <>
          <div
            ref={organizationListRef}
            id="organization-list"
            className="grid scroll-mt-24 gap-3 md:grid-cols-2 xl:grid-cols-3"
          >
            {paginatedOrganizations.map((organization) => (
              <article
                key={organization.id}
                className="flex min-h-[180px] min-w-0 max-w-full flex-col rounded-lg border border-[#d6e0e5] bg-white p-4 border-t-[3px] border-t-[#a9c7e9] shadow-[0_1px_2px_rgb(24_58_68_/_0.02)] transition-[border-color,box-shadow] duration-[160ms] ease-out hover:border-r-[#b5cccf] hover:border-b-[#b5cccf] hover:border-l-[#b5cccf] hover:shadow-[0_4px_14px_rgb(25_55_72_/_0.06)] max-[359px]:p-3.5"
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-[0.4rem] border border-[#d3e2f0] bg-[#eaf2ff] text-[#1d5fa7]">
                    <Building2 size={19} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold leading-5 text-ink">
                      <Link
                        href={`/organisasi/${organization.name}`}
                        className="hover:text-primary focus-visible:underline"
                      >
                        {organization.title || organization.name}
                      </Link>
                    </h2>
                    <p className="mt-1 text-xs text-muted">
                      Kode: {organization.name}
                    </p>
                  </div>
                </div>
                {organization.description ? (
                  <p className="mt-3 line-clamp-2 text-sm leading-5 text-muted">
                    {organization.description}
                  </p>
                ) : null}
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4 max-[639px]:items-start max-[639px]:gap-2">
                  <span className="min-w-0 break-words text-xs text-[#647985]">
                    <strong className="text-sm tabular-nums text-[#214b62]">
                      {formatCount(organization.package_count)}
                    </strong>{" "}
                    dataset publik
                  </span>
                  <Link
                    href={`/organisasi/${organization.name}`}
                    aria-label={`Lihat dataset ${organization.title || organization.name}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80 focus-visible:underline"
                  >
                    Lihat data <ArrowUpRight size={15} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
          {pageCount > 1 ? (
            <nav
              aria-label="Paginasi perangkat daerah"
              className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4"
            >
              <p className="text-sm text-muted">
                Halaman {formatCount(currentPage)} dari {formatCount(pageCount)}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => changePage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink transition hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Sebelumnya
                </button>
                <button
                  type="button"
                  onClick={() =>
                    changePage(Math.min(pageCount, currentPage + 1))
                  }
                  disabled={currentPage === pageCount}
                  className="rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink transition hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Berikutnya
                </button>
              </div>
            </nav>
          ) : null}
        </>
      ) : (
        <div className="surface-panel min-w-0 px-5 py-8 text-center">
          <h2 className="font-semibold">
            {query
              ? "Perangkat daerah tidak ditemukan"
              : "Belum ada perangkat daerah yang tersedia"}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {query
              ? "Coba kata kunci lain atau hapus pencarian."
              : "Informasi perangkat daerah akan ditampilkan setelah tersedia."}
          </p>
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="mt-3 text-sm font-semibold text-primary underline underline-offset-4"
            >
              Hapus pencarian
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
