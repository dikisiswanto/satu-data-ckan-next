"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Globe2, LoaderCircle, MapPinned } from "lucide-react";
import {
  GEOJSON_PREVIEW_LIMITS,
  geometryToSvgLayers,
  normalizeGeoJson,
  projectCoordinate,
} from "@/lib/geo/geojson-preview";

const WIDTH = 800;
const HEIGHT = 420;

async function readBoundedBody(response, limit, signal) {
  const reader = response.body?.getReader?.();
  if (!reader) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > limit) {
      throw new Error("Berkas melebihi batas pratinjau 5 MiB. Unduh resource untuk mengolah data lengkap.");
    }
    return text;
  }
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      if (signal.aborted) throw new DOMException("Permintaan dibatalkan.", "AbortError");
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel("Batas pratinjau terlampaui.").catch(() => {});
        throw new Error("Berkas melebihi batas pratinjau 5 MiB. Unduh resource untuk mengolah data lengkap.");
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
  const [payload, setPayload] = useState(null);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!url) {
      setStatus("error");
      setMessage("URL resource publik tidak tersedia.");
      return undefined;
    }
    const controller = new AbortController();
    let cancelled = false;
    setStatus("loading");
    setPayload(null);
    setMessage("");
    const timeout = setTimeout(() => controller.abort(), 12_000);

    async function load() {
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          credentials: "omit",
          cache: "no-store",
          headers: { Accept: "application/geo+json, application/json;q=0.9" },
        });
        if (!response.ok) throw new Error(`Resource merespons HTTP ${response.status}.`);
        const contentLength = Number(response.headers.get("content-length") || 0);
        if (contentLength > GEOJSON_PREVIEW_LIMITS.maxBytes) {
          throw new Error("Berkas melebihi batas pratinjau 5 MB. Unduh resource untuk mengolah data lengkap.");
        }
        const text = await readBoundedBody(response, GEOJSON_PREVIEW_LIMITS.maxBytes, controller.signal);
        let parsed;
        try { parsed = JSON.parse(text); }
        catch { throw new Error("Resource tidak berisi JSON yang valid."); }
        const normalized = normalizeGeoJson(parsed);
        if (!cancelled) {
          setPayload(normalized);
          setStatus("ready");
        }
      } catch (error) {
        if (!cancelled) {
          setStatus("error");
          setMessage(error?.name === "AbortError" ? "Permintaan pratinjau melewati batas waktu." : error?.message || "Resource tidak dapat dipratinjau.");
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
  }, [url, resource?.id]);

  const layers = useMemo(() => {
    if (!payload) return null;
    const project = (coordinate) => projectCoordinate(coordinate, payload.bounds, WIDTH, HEIGHT, 32);
    const result = { points: [], lines: [], polygons: [] };
    for (const feature of payload.features) geometryToSvgLayers(feature.geometry, project, result);
    return result;
  }, [payload]);

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-white" aria-labelledby={`geojson-heading-${resource?.id || "resource"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-4 sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary"><MapPinned size={19} aria-hidden="true" /></span>
          <div className="min-w-0">
            <h3 id={`geojson-heading-${resource?.id || "resource"}`} className="font-semibold">Pratinjau geospasial</h3>
            <p className="mt-1 break-words text-sm text-muted">{resource?.name || resource?.description || "Resource GeoJSON CKAN"}</p>
          </div>
        </div>
        {payload ? <div className="flex flex-wrap gap-2 text-xs text-muted"><span className="rounded-full bg-slate-100 px-2.5 py-1">{payload.featureCount.toLocaleString("id-ID")} fitur</span><span className="rounded-full bg-slate-100 px-2.5 py-1">{payload.coordinateCount.toLocaleString("id-ID")} koordinat</span></div> : null}
      </div>
      {status === "loading" ? (
        <div className="flex min-h-56 items-center justify-center gap-3 p-8 text-sm text-muted" role="status"><LoaderCircle size={18} className="animate-spin" aria-hidden="true" />Memuat geometri dari resource CKAN…</div>
      ) : status === "error" ? (
        <div className="flex items-start gap-3 p-5 text-sm leading-6 text-muted" role="status"><AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" /><div><p className="font-medium text-ink">Pratinjau peta belum tersedia</p><p className="mt-1">{message}</p><p className="mt-1">Resource tetap bisa diunduh melalui daftar berkas dataset.</p></div></div>
      ) : (
        <>
          <div className="bg-slate-50 p-2 sm:p-4">
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`Peta pratinjau ${payload.geometryTypes.join(", ")}`} className="h-auto max-h-[520px] w-full rounded-xl bg-white">
              <defs><pattern id={`geo-grid-${resource?.id || "resource"}`} width="80" height="60" patternUnits="userSpaceOnUse"><path d="M 80 0 L 0 0 0 60" fill="none" stroke="#e8edf2" strokeWidth="1" /></pattern></defs>
              <rect width={WIDTH} height={HEIGHT} fill={`url(#geo-grid-${resource?.id || "resource"})`} />
              {layers.polygons.map((path, index) => <path key={`polygon-${index}`} d={path} fill="#c7e7df" fillOpacity="0.76" fillRule="evenodd" stroke="#267565" strokeWidth="1.4" strokeLinejoin="round" />)}
              {layers.lines.map((path, index) => <path key={`line-${index}`} d={path} fill="none" stroke="#177d73" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />)}
              {layers.points.map((point, index) => <g key={`point-${index}`}><circle cx={point.x} cy={point.y} r="5" fill="#c44737" stroke="white" strokeWidth="2" /><circle cx={point.x} cy={point.y} r="9" fill="none" stroke="#c44737" strokeOpacity="0.28" /></g>)}
            </svg>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3 text-xs text-muted sm:px-5">
            <span className="inline-flex items-center gap-1.5"><Globe2 size={14} aria-hidden="true" />WGS84 / longitude-latitude</span>
            <span>Rentang: {payload.bounds.minLon.toFixed(4)}, {payload.bounds.minLat.toFixed(4)} — {payload.bounds.maxLon.toFixed(4)}, {payload.bounds.maxLat.toFixed(4)}</span>
          </div>
          {payload.truncated ? <p className="px-4 pb-4 text-xs leading-5 text-muted sm:px-5">Peta menampilkan {payload.renderedFeatureCount.toLocaleString("id-ID")} fitur pertama untuk menjaga kinerja. Unduh resource untuk memperoleh seluruh data.</p> : null}
          {payload.ignoredFeatureCount > 0 ? <p className="px-4 pb-4 text-xs leading-5 text-muted sm:px-5">{payload.ignoredFeatureCount.toLocaleString("id-ID")} fitur tidak dipratinjau karena geometri tidak valid atau tidak memiliki geometri yang didukung.</p> : null}
        </>
      )}
    </section>
  );
}
