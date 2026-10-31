"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Globe2, LoaderCircle, MapPinned } from "lucide-react";
import {
  GEOJSON_PREVIEW_LIMITS,
  createGeoMapLayout,
  geometryToSvgLayers,
  normalizeGeoJson,
  projectGeoCoordinate,
} from "@/lib/geo/geojson-preview";

const WIDTH = 800;
const HEIGHT = 420;

async function readBoundedBody(response, limit, signal) {
  const reader = response.body?.getReader?.();
  if (!reader) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > limit) {
      throw new Error(
        "Ukuran berkas melebihi batas pratinjau 20 MB. Unduh berkas untuk mengolah seluruh data.",
      );
    }
    return text;
  }
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      if (signal.aborted)
        throw new DOMException("Permintaan dibatalkan.", "AbortError");
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel("Batas pratinjau terlampaui.").catch(() => {});
        throw new Error(
          "Ukuran berkas melebihi batas pratinjau 20 MB. Unduh berkas untuk mengolah seluruh data.",
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock?.();
  }
  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(combined);
}

export function GeoJSONResourcePreview({ resource, url }) {
  const [previewState, setPreviewState] = useState(null);
  // Keep the current URL's loading/error state derivable during render. This
  // avoids effect-driven synchronous setState calls and stale payload flashes
  // when a resource URL changes.
  const currentPreview = previewState?.url === url ? previewState : null;
  const payload = currentPreview?.payload || null;
  const status = !url ? "error" : currentPreview?.status || "loading";
  const message = !url
    ? "Tautan berkas publik tidak tersedia."
    : currentPreview?.message || "";

  useEffect(() => {
    if (!url) return undefined;
    const controller = new AbortController();
    let cancelled = false;
    const timeout = setTimeout(() => controller.abort(), 30_000);

    async function load() {
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          credentials: "same-origin",
          cache: "no-store",
          headers: { Accept: "application/geo+json, application/json;q=0.9" },
        });
        if (!response.ok)
          throw new Error("Berkas peta tidak dapat diakses saat ini.");
        const contentLength = Number(
          response.headers.get("content-length") || 0,
        );
        if (contentLength > GEOJSON_PREVIEW_LIMITS.maxBytes) {
          throw new Error(
            "Ukuran berkas melebihi batas pratinjau 20 MB. Unduh berkas untuk mengolah seluruh data.",
          );
        }
        const text = await readBoundedBody(
          response,
          GEOJSON_PREVIEW_LIMITS.maxBytes,
          controller.signal,
        );
        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch {
          throw new Error(
            "Format berkas tidak dikenali atau isi berkas tidak dapat dibaca.",
          );
        }
        const normalized = normalizeGeoJson(parsed);
        if (!cancelled) {
          setPreviewState({
            url,
            payload: normalized,
            status: "ready",
            message: "",
          });
        }
      } catch (error) {
        if (!cancelled) {
          setPreviewState({
            url,
            payload: null,
            status: "error",
            message:
              error?.name === "AbortError"
                ? "Pratinjau membutuhkan waktu terlalu lama. Coba lagi atau unduh berkasnya."
                : error?.message || "Berkas tidak dapat ditampilkan.",
          });
        }
      } finally {
        clearTimeout(timeout);
      }
    }
    load();
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [url]);

  const mapLayout = useMemo(
    () =>
      payload
        ? createGeoMapLayout(payload.bounds, WIDTH, HEIGHT, 32, {
            tileUrlTemplate:
              process.env.NEXT_PUBLIC_MAP_TILE_URL ||
              "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            maxTiles: 48,
          })
        : null,
    [payload],
  );

  const layers = useMemo(() => {
    if (!payload || !mapLayout) return null;
    const project = (coordinate) => projectGeoCoordinate(coordinate, mapLayout);
    const result = { points: [], lines: [], polygons: [] };
    for (const feature of payload.features)
      geometryToSvgLayers(feature.geometry, project, result);
    return result;
  }, [payload, mapLayout]);

  // Keep tile failures scoped to the URL that produced them. This makes the
  // visible count reset automatically when the resource changes, without a
  // synchronous state update inside an effect or late events leaking across URLs.
  const [tileFailureState, setTileFailureState] = useState({
    url: null,
    count: 0,
  });
  const failedTileCount =
    tileFailureState.url === url ? tileFailureState.count : 0;
  const recordTileFailure = () => {
    setTileFailureState((current) => ({
      url,
      count: current.url === url ? current.count + 1 : 1,
    }));
  };

  return (
    <section
      className="mt-6 overflow-hidden rounded-2xl border border-line bg-white"
      aria-labelledby={`geojson-heading-${resource?.id || "resource"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-4 sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
            <MapPinned size={19} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3
              id={`geojson-heading-${resource?.id || "resource"}`}
              className="font-semibold"
            >
              Pratinjau peta
            </h3>
            <p className="mt-1 break-words text-sm text-muted">
              {resource?.name || resource?.description || "Data peta GeoJSON"}
            </p>
          </div>
        </div>
        {payload ? (
          <div className="flex flex-wrap gap-2 text-xs text-muted">
            <span className="rounded-full bg-slate-100 px-2.5 py-1">
              {payload.featureCount.toLocaleString("id-ID")} objek peta
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1">
              {payload.coordinateCount.toLocaleString("id-ID")} koordinat
            </span>
          </div>
        ) : null}
      </div>
      {status === "loading" ? (
        <div
          className="flex min-h-56 items-center justify-center gap-3 p-8 text-sm text-muted"
          role="status"
        >
          <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
          Memuat data peta…
        </div>
      ) : status === "error" ? (
        <div
          className="flex items-start gap-3 p-5 text-sm leading-6 text-muted"
          role="status"
        >
          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0 text-amber-600"
            aria-hidden="true"
          />
          <div>
            <p className="font-medium text-ink">
              Pratinjau peta belum tersedia
            </p>
            <p className="mt-1">{message}</p>
            <p className="mt-1">
              Berkas tetap dapat diunduh melalui daftar berkas dataset.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-slate-50 p-2 sm:p-4">
            <svg
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              role="img"
              aria-label={`Peta pratinjau ${payload.geometryTypes.join(", ")}`}
              className="h-auto max-h-[520px] w-full rounded-xl bg-[#e8edf0]"
            >
              <rect width={WIDTH} height={HEIGHT} fill="#e8edf0" />
              {mapLayout.tiles.map((tile) => (
                <image
                  key={tile.key}
                  href={tile.url}
                  x={tile.x}
                  y={tile.y}
                  width={tile.width}
                  height={tile.height}
                  preserveAspectRatio="none"
                  onError={recordTileFailure}
                />
              ))}
              {layers.polygons.map((path, index) => (
                <path
                  key={`polygon-${index}`}
                  d={path}
                  fill="#2f927e"
                  fillOpacity="0.28"
                  fillRule="evenodd"
                  stroke="#176b5c"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              ))}
              {layers.lines.map((path, index) => (
                <path
                  key={`line-${index}`}
                  d={path}
                  fill="none"
                  stroke="#126f63"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              {layers.points.map((point, index) => (
                <g key={`point-${index}`}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="5.5"
                    fill="#c44737"
                    stroke="white"
                    strokeWidth="2"
                  />
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="10"
                    fill="none"
                    stroke="#c44737"
                    strokeOpacity="0.32"
                  />
                </g>
              ))}
            </svg>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3 text-xs text-muted sm:px-5">
            <span className="inline-flex flex-wrap items-center gap-1.5">
              <Globe2 size={14} aria-hidden="true" />
              WGS 84 · peta dasar{" "}
              <a
                className="font-medium text-primary underline-offset-2 hover:underline"
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noopener noreferrer"
              >
                © OpenStreetMap
              </a>
              {failedTileCount > 0 ? (
                <span className="text-amber-700">
                  · {failedTileCount} ubin peta gagal dimuat
                </span>
              ) : null}
            </span>
            <span>
              Rentang: {payload.bounds.minLon.toFixed(4)},{" "}
              {payload.bounds.minLat.toFixed(4)} —{" "}
              {payload.bounds.maxLon.toFixed(4)},{" "}
              {payload.bounds.maxLat.toFixed(4)}
            </span>
          </div>
          {payload.truncated ? (
            <p className="px-4 pb-4 text-xs leading-5 text-muted sm:px-5">
              Peta menampilkan{" "}
              {payload.renderedFeatureCount.toLocaleString("id-ID")} objek
              pertama agar tetap ringan. Unduh berkas untuk memperoleh seluruh
              data.
            </p>
          ) : null}
          {payload.ignoredFeatureCount > 0 ? (
            <p className="px-4 pb-4 text-xs leading-5 text-muted sm:px-5">
              {payload.ignoredFeatureCount.toLocaleString("id-ID")} objek peta
              tidak ditampilkan karena bentuk geografinya tidak valid atau belum
              didukung.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
