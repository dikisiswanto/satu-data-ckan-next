"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { publicQueryKeys } from "@/lib/api/query-keys";
import { getRetryAfterMs } from "@/lib/api/client-response";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LoaderCircle,
  Table2,
} from "lucide-react";
import { scrollToPublicList } from "@/lib/public-scroll";

const PAGE_SIZE = 25;
const MAX_DATASTORE_OFFSET = 100_000;
const MAX_CHART_POINTS = 50;
const PERIOD_FIELD =
  /(^|_)(period|periode|date|tanggal|year|tahun|month|bulan|quarter|triwulan|semester)(_|$)/i;
const REGION_FIELD =
  /(^|_)(region|wilayah|kecamatan|desa|kelurahan|category|kategori|label|name|nama)(_|$)/i;

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  const number = Number(value);
  if (String(value).trim() !== "" && Number.isFinite(number)) {
    return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 4 }).format(
      number,
    );
  }
  return String(value);
}

function isNumericValue(value) {
  return (
    value !== null &&
    value !== undefined &&
    String(value).trim() !== "" &&
    Number.isFinite(Number(value))
  );
}

function buildChartData(rows, columns, metricName, labelName) {
  const metric = columns.find((column) => column.name === metricName);
  if (!metric) return null;
  const sampledRows = rows.slice(0, MAX_CHART_POINTS);
  const data = sampledRows
    .map((row, index) => ({
      label:
        row?.[labelName] === null ||
        row?.[labelName] === undefined ||
        row?.[labelName] === ""
          ? String(index + 1)
          : String(row[labelName]),
      value: isNumericValue(row?.[metric.name])
        ? Number(row[metric.name])
        : null,
    }))
    .filter((item) => item.value !== null);
  if (!data.length) return null;
  const min = Math.min(0, ...data.map((item) => item.value));
  const max = Math.max(0, ...data.map((item) => item.value));
  const span = max - min || 1;
  const width = 900;
  const height = 330;
  const left = 64;
  const right = 22;
  const top = 24;
  const bottom = 60;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const x = (index) =>
    data.length === 1
      ? left + plotWidth / 2
      : left + index * (plotWidth / (data.length - 1));
  const y = (value) => top + ((max - value) / span) * plotHeight;
  const line = data
    .map(
      (item, index) =>
        `${index === 0 ? "M" : "L"}${x(index).toFixed(2)},${y(item.value).toFixed(2)}`,
    )
    .join(" ");
  return {
    data,
    min,
    max,
    width,
    height,
    left,
    right,
    top,
    bottom,
    plotWidth,
    plotHeight,
    x,
    y,
    line,
  };
}

function ResourceChart({ rows, columns, resourceId }) {
  const numericColumns = useMemo(
    () =>
      columns.filter((column) => {
        const samples = rows
          .slice(0, 30)
          .map((row) => row?.[column.name])
          .filter(
            (value) =>
              value !== null &&
              value !== undefined &&
              String(value).trim() !== "",
          );
        return (
          samples.length >= 2 &&
          samples.filter(isNumericValue).length / samples.length >= 0.8
        );
      }),
    [columns, rows],
  );
  const suggestedLabel =
    columns.find((column) => PERIOD_FIELD.test(column.name)) ||
    columns.find(
      (column) =>
        REGION_FIELD.test(column.name) &&
        !numericColumns.some((item) => item.name === column.name),
    ) ||
    columns.find(
      (column) => !numericColumns.some((item) => item.name === column.name),
    );
  const [metricName, setMetricName] = useState("");
  const [labelName, setLabelName] = useState(
    suggestedLabel?.name || columns[0]?.name || "",
  );
  const [chartType, setChartType] = useState("line");
  const metric =
    numericColumns.find((column) => column.name === metricName) ||
    numericColumns[0];
  const activeLabelName = columns.some((column) => column.name === labelName)
    ? labelName
    : suggestedLabel?.name || columns[0]?.name;
  const chart = useMemo(
    () => buildChartData(rows, columns, metric?.name, activeLabelName),
    [rows, columns, metric?.name, activeLabelName],
  );
  const clipId = `chart-clip-${String(resourceId).replace(/[^a-z0-9_-]/gi, "")}`;

  if (!numericColumns.length) {
    return (
      <p className="rounded-xl border border-dashed border-line bg-slate-50 p-5 text-sm leading-6 text-muted">
        Berkas ini belum memuat cukup data angka untuk ditampilkan sebagai
        grafik. Anda tetap dapat melihat tabel atau mengunduh berkas sumber.
      </p>
    );
  }
  if (!chart)
    return (
      <p className="rounded-xl border border-dashed border-line bg-slate-50 p-5 text-sm text-muted">
        Belum ada nilai angka yang dapat ditampilkan dalam grafik.
      </p>
    );

  const zeroY = chart.y(0);
  const barWidth = Math.min(
    28,
    Math.max(4, (chart.plotWidth / chart.data.length) * 0.62),
  );
  const barStep =
    chart.data.length === 1
      ? chart.plotWidth
      : chart.plotWidth / Math.max(1, chart.data.length - 1);
  const tickValues = Array.from(
    { length: 5 },
    (_value, index) => chart.max - ((chart.max - chart.min) * index) / 4,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="grid gap-1.5 text-xs font-semibold text-muted sm:min-w-52">
          Kolom nilai
          <select
            value={metric.name}
            onChange={(event) => setMetricName(event.target.value)}
            className="min-h-10 rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            {numericColumns.map((column) => (
              <option key={column.name} value={column.name}>
                {column.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-muted sm:min-w-52">
          Sumbu label
          <select
            value={activeLabelName}
            onChange={(event) => setLabelName(event.target.value)}
            className="min-h-10 rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            {columns.map((column) => (
              <option key={column.name} value={column.name}>
                {column.label}
              </option>
            ))}
          </select>
        </label>
        <div
          className="inline-flex self-start rounded-lg border border-line bg-slate-50 p-1 sm:self-end"
          role="group"
          aria-label="Jenis grafik"
        >
          <button
            type="button"
            aria-pressed={chartType === "line"}
            onClick={() => setChartType("line")}
            className={`rounded-md px-3 py-2 text-xs font-semibold ${chartType === "line" ? "bg-white text-primary shadow-sm" : "text-muted hover:text-ink"}`}
          >
            Garis
          </button>
          <button
            type="button"
            aria-pressed={chartType === "bar"}
            onClick={() => setChartType("bar")}
            className={`rounded-md px-3 py-2 text-xs font-semibold ${chartType === "bar" ? "bg-white text-primary shadow-sm" : "text-muted hover:text-ink"}`}
          >
            Batang
          </button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line bg-white p-2 sm:p-4">
        <svg
          viewBox={`0 0 ${chart.width} ${chart.height}`}
          role="img"
          aria-label={`Grafik ${metric.name} berdasarkan ${activeLabelName}`}
          className="block h-auto min-w-[560px] w-full text-primary"
        >
          <title>
            Grafik {metric.name} berdasarkan {activeLabelName}
          </title>
          <defs>
            <clipPath id={clipId}>
              <rect
                x={chart.left}
                y={chart.top}
                width={chart.plotWidth}
                height={chart.plotHeight}
              />
            </clipPath>
          </defs>
          {tickValues.map((value, index) => {
            const yy = chart.y(value);
            return (
              <g key={index}>
                <line
                  x1={chart.left}
                  y1={yy}
                  x2={chart.width - chart.right}
                  y2={yy}
                  stroke="currentColor"
                  strokeOpacity="0.12"
                  strokeDasharray="4 4"
                />
                <text
                  x={chart.left - 10}
                  y={yy + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="currentColor"
                  opacity="0.75"
                >
                  {new Intl.NumberFormat("id-ID", {
                    notation: "compact",
                    maximumFractionDigits: 1,
                  }).format(value)}
                </text>
              </g>
            );
          })}
          <line
            x1={chart.left}
            y1={chart.top + chart.plotHeight}
            x2={chart.width - chart.right}
            y2={chart.top + chart.plotHeight}
            stroke="currentColor"
            strokeOpacity="0.28"
          />
          <g clipPath={`url(#${clipId})`}>
            {chartType === "line" ? (
              <>
                <path
                  d={chart.line}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {chart.data.map((item, index) => (
                  <circle
                    key={`${item.label}-${index}`}
                    cx={chart.x(index)}
                    cy={chart.y(item.value)}
                    r="4"
                    fill="white"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <title>
                      {item.label}: {formatValue(item.value)}
                    </title>
                  </circle>
                ))}
              </>
            ) : (
              chart.data.map((item, index) => {
                const x =
                  chart.data.length === 1
                    ? chart.left + chart.plotWidth / 2 - barWidth / 2
                    : chart.left + index * barStep - barWidth / 2;
                const y = chart.y(item.value);
                return (
                  <rect
                    key={`${item.label}-${index}`}
                    x={x}
                    y={Math.min(y, zeroY)}
                    width={barWidth}
                    height={Math.max(1, Math.abs(zeroY - y))}
                    rx="3"
                    fill="currentColor"
                    fillOpacity="0.78"
                  >
                    <title>
                      {item.label}: {formatValue(item.value)}
                    </title>
                  </rect>
                );
              })
            )}
          </g>
          {chart.data.map((item, index) =>
            index === 0 ||
            index === chart.data.length - 1 ||
            index % Math.ceil(chart.data.length / 7) === 0 ? (
              <text
                key={`${item.label}-${index}`}
                x={chart.x(index)}
                y={chart.height - 28}
                textAnchor="middle"
                fontSize="11"
                fill="currentColor"
                opacity="0.8"
              >
                {item.label.length > 16
                  ? `${item.label.slice(0, 14)}…`
                  : item.label}
              </text>
            ) : null,
          )}
        </svg>
      </div>
      <p className="text-xs leading-5 text-muted">
        Grafik menggunakan hingga {Math.min(MAX_CHART_POINTS, rows.length)}{" "}
        baris data yang sedang ditampilkan. Buka tampilan tabel untuk melihat
        baris lainnya. Periksa periode, wilayah, satuan, dan metode perhitungan
        sebelum membandingkan angka.
      </p>
    </div>
  );
}

export function DatasetResourcePreview({
  datasetName,
  resource,
  datastoreActive = true,
}) {
  const [page, setPage] = useState(1);
  const [view, setView] = useState("table");
  const previewSectionRef = useRef(null);
  const endpoint = `/api/3/action/datastore_search?resource_id=${encodeURIComponent(resource.id)}`;
  const fallbackEndpoint = `/api/public/resource-preview?resource_id=${encodeURIComponent(resource.id)}&limit=${PAGE_SIZE}`;
  const offset = Math.min((page - 1) * PAGE_SIZE, MAX_DATASTORE_OFFSET);
  const requestUrl = `${endpoint}&limit=${PAGE_SIZE}&offset=${offset}`;
  const resourceFormat = [
    resource.format,
    resource.mimetype,
    resource.name,
    resource.url,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const supportsCsvFallback =
    /(?:^|[./;\s_-])(csv|tsv)(?:$|[;\s?#._-])/i.test(resourceFormat) ||
    /\.(csv|tsv)(?:[?#]|$)/i.test(resourceFormat);
  const resourceStatusQuery = useQuery({
    enabled: !datastoreActive,
    queryKey: publicQueryKeys.resourceStatus(resource.id),
    queryFn: async ({ signal }) => {
      const response = await fetch(
        `/api/3/action/resource_show?id=${encodeURIComponent(resource.id)}`,
        {
          cache: "no-store",
          signal,
          headers: { Accept: "application/json" },
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.success !== true || !payload?.result) {
        throw new Error(
          payload?.error?.message || `resource_status_http_${response.status}`,
        );
      }
      return payload.result;
    },
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => {
      if (
        query.state.status === "error" ||
        query.state.data?.datastore_active === true
      )
        return false;
      return query.state.dataUpdateCount < 7 ? 12_000 : false;
    },
  });
  const isDatastoreActive =
    datastoreActive || resourceStatusQuery.data?.datastore_active === true;
  const fallbackPreviewQuery = useQuery({
    enabled: !isDatastoreActive && supportsCsvFallback,
    queryKey: publicQueryKeys.resourceRows(
      datasetName,
      `${resource.id}:csv-fallback`,
      1,
      PAGE_SIZE,
    ),
    queryFn: async ({ signal }) => {
      const response = await fetch(fallbackEndpoint, {
        cache: "no-store",
        signal,
        headers: { Accept: "application/json" },
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.success !== true || !payload?.result) {
        const error = new Error(
          payload?.error?.message || `csv_preview_http_${response.status}`,
        );
        error.status = response.status;
        throw error;
      }
      return payload.result;
    },
    staleTime: 10_000,
    gcTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const previewQuery = useQuery({
    enabled: isDatastoreActive,
    queryKey: publicQueryKeys.resourceRows(
      datasetName,
      resource.id,
      page,
      PAGE_SIZE,
    ),
    queryFn: async ({ signal }) => {
      const response = await fetch(requestUrl, {
        cache: "no-store",
        signal,
        headers: { Accept: "application/json" },
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.success !== true || !payload?.result) {
        const error = new Error(
          payload?.error?.message || `preview_http_${response.status}`,
        );
        error.status = response.status;
        error.retryAfterMs = getRetryAfterMs(response);
        throw error;
      }
      return payload;
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if ([400, 401, 403, 404, 409, 422].includes(Number(error?.status || 0)))
        return false;
      return failureCount < 1;
    },
    retryDelay: (_failureCount, error) => error.retryAfterMs ?? 1_000,
  });
  const fallbackResult =
    fallbackPreviewQuery.data?.state === "ready"
      ? fallbackPreviewQuery.data
      : null;
  const isFallback = Boolean(fallbackResult && !isDatastoreActive);
  const result = isDatastoreActive
    ? previewQuery.data?.result || null
    : fallbackResult;
  const state = isDatastoreActive
    ? previewQuery.isPending
      ? "loading"
      : previewQuery.isError
        ? "error"
        : "ready"
    : isFallback
      ? "ready"
      : fallbackPreviewQuery.isPending
        ? "loading"
        : "not-indexed";
  const rows = Array.isArray(result?.records) ? result.records : [];
  const columns = (Array.isArray(result?.fields) ? result.fields : [])
    .filter((field) => field?.id && field.id !== "_id")
    .map((field) => ({
      name: field.id,
      label: field.info?.label || field.id,
      description: field.info?.notes || field.info?.description || "",
      type: field.type,
    }));
  const total = Number(result?.total || rows.length || 0);
  const totalPages = isFallback
    ? 1
    : Math.max(
        1,
        Math.min(
          Math.ceil(total / PAGE_SIZE),
          Math.floor(MAX_DATASTORE_OFFSET / PAGE_SIZE) + 1,
        ),
      );
  const visibleRows = rows;
  const changePage = (nextPage) => {
    setPage(nextPage);
    window.requestAnimationFrame(() =>
      scrollToPublicList(previewSectionRef.current),
    );
  };

  return (
    <section
      ref={previewSectionRef}
      className="mt-6 scroll-mt-24 overflow-hidden rounded-2xl border border-line bg-white shadow-sm"
      aria-labelledby={`preview-${resource.id}`}
      aria-busy={state === "loading"}
    >
      <div className="border-b border-line p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              Pratinjau isi berkas
            </p>
            <h3
              id={`preview-${resource.id}`}
              className="mt-1 text-base font-semibold"
            >
              {resource.name || resource.id}
            </h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
              {resource.description ||
                "Tabel mengikuti kolom dan urutan pada berkas sumber."}{" "}
              Data ditampilkan bertahap agar lebih mudah dibaca. Unduh berkas
              sumber untuk memperoleh seluruh data.
            </p>
          </div>
          <a
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary underline underline-offset-4"
            href={requestUrl}
            target="_blank"
            rel="noreferrer"
          >
            Lihat data dalam format JSON{" "}
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        </div>
        {isFallback ? (
          <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-900">
            Pratinjau sementara dibaca langsung dari berkas CSV/TSV (maksimal 1
            MB dan 25 baris awal). DataStore akan menyediakan pencarian dan
            pagination penuh setelah proses indeks selesai.
          </p>
        ) : null}
        <div
          className="mt-4 inline-flex rounded-lg border border-line bg-slate-50 p-1"
          role="group"
          aria-label="Pilihan tampilan data"
        >
          <button
            type="button"
            aria-pressed={view === "table"}
            onClick={() => setView("table")}
            className={`inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold ${view === "table" ? "bg-white text-primary shadow-sm" : "text-muted hover:text-ink"}`}
          >
            <Table2 size={15} aria-hidden="true" /> Tabel
          </button>
          <button
            type="button"
            aria-pressed={view === "chart"}
            onClick={() => setView("chart")}
            className={`inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold ${view === "chart" ? "bg-white text-primary shadow-sm" : "text-muted hover:text-ink"}`}
          >
            <BarChart3 size={15} aria-hidden="true" /> Grafik
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {state === "not-indexed" ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <p className="font-semibold">
              Pratinjau lengkap sedang menunggu DataStore.
            </p>
            <p className="mt-1">
              Berkas sumber tersedia untuk diunduh. Untuk format spreadsheet,
              pengelola perlu memastikan antrean XLoader dan indeks DataStore
              selesai diproses. Untuk CSV/TSV yang tidak dapat dibaca langsung,
              pratinjau akan tersedia setelah indeks siap.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="text-xs text-amber-800" role="status">
                {resourceStatusQuery.isFetching ||
                fallbackPreviewQuery.isFetching
                  ? "Memeriksa status…"
                  : resourceStatusQuery.dataUpdateCount > 6
                    ? "Belum terindeks. Pengelola perlu memeriksa antrean XLoader."
                    : "Pemeriksaan otomatis aktif."}
              </span>
              <button
                type="button"
                onClick={() => {
                  resourceStatusQuery.refetch();
                  fallbackPreviewQuery.refetch();
                }}
                className="font-semibold underline underline-offset-4"
              >
                Periksa lagi
              </button>
            </div>
          </div>
        ) : state === "loading" ? (
          <p
            className="flex items-center gap-2 py-4 text-sm text-muted"
            role="status"
          >
            <LoaderCircle
              size={16}
              className="animate-spin"
              aria-hidden="true"
            />{" "}
            Memuat pratinjau data…
          </p>
        ) : state === "error" ? (
          <div
            className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"
            role="alert"
          >
            DataStore belum menyediakan pratinjau untuk berkas ini. Pengelola
            perlu memeriksa status XLoader dan izin DataStore.{" "}
            <button
              type="button"
              className="ml-1 font-semibold underline underline-offset-4"
              onClick={() => previewQuery.refetch()}
            >
              Coba lagi
            </button>
          </div>
        ) : rows.length === 0 ? (
          <p className="py-4 text-sm text-muted">
            Belum ada baris yang dapat ditampilkan.
          </p>
        ) : view === "chart" ? (
          <ResourceChart
            rows={rows}
            columns={columns}
            resourceId={resource.id}
          />
        ) : (
          <>
            <p className="public-table-scroll-hint mb-2 text-xs text-muted sm:hidden">
              Geser tabel ke samping untuk melihat kolom lainnya.
            </p>
            <div
              className="public-table-scroll-region overflow-x-auto rounded-xl border border-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              role="region"
              aria-label={`Tabel pratinjau ${resource.name || resource.id}`}
              tabIndex={0}
            >
              <table className="w-full min-w-max border-collapse text-left text-sm">
                <caption className="sr-only">
                  Pratinjau {resource.name || resource.id}, halaman {page}
                </caption>
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th
                      scope="col"
                      className="whitespace-nowrap border-b px-3 py-3"
                    >
                      No.
                    </th>
                    {columns.map((column) => (
                      <th
                        key={column.name}
                        scope="col"
                        className="max-w-64 whitespace-nowrap border-b px-3 py-3"
                      >
                        <span title={column.description || column.name}>
                          {column.label}
                        </span>
                        <span className="ml-1 font-normal normal-case text-slate-400">
                          {column.type}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row, rowIndex) => {
                    const rowNumber = (page - 1) * PAGE_SIZE + rowIndex + 1;
                    return (
                      <tr
                        key={row._id ?? rowNumber}
                        className="even:bg-slate-50/60"
                      >
                        <td className="border-b px-3 py-2.5 tabular-nums text-muted">
                          {rowNumber}
                        </td>
                        {columns.map((column) => {
                          const raw = row?.[column.name];
                          const display =
                            raw === null || raw === undefined
                              ? "—"
                              : typeof raw === "object"
                                ? JSON.stringify(raw)
                                : String(raw);
                          return (
                            <td
                              key={column.name}
                              className="max-w-64 border-b px-3 py-2.5 align-top"
                            >
                              <span
                                className="line-clamp-2 break-words"
                                title={display}
                              >
                                {display}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
              <p className="text-muted" aria-live="polite" aria-atomic="true">
                {total === 0
                  ? "Belum ada baris"
                  : isFallback
                    ? `Menampilkan ${rows.length} baris awal dari berkas sumber`
                    : `Menampilkan ${offset + 1}–${offset + rows.length} dari ${total.toLocaleString("id-ID")} baris data`}
              </p>
              {!isFallback ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => changePage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-line bg-white px-3 font-medium disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft size={15} aria-hidden="true" /> Sebelumnya
                  </button>
                  <button
                    type="button"
                    onClick={() => changePage(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-line bg-white px-3 font-medium disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Berikutnya <ChevronRight size={15} aria-hidden="true" />
                  </button>
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
