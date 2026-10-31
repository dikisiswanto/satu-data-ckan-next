"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Minus, Plus, RotateCcw, X, ZoomIn } from "lucide-react";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;

function clampZoom(value) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value) || MIN_ZOOM));
}

/**
 * Accessible image preview trigger with a viewport-sized lightbox.
 * Pass the same public image URL used by the thumbnail and render the thumbnail
 * as children so Next Image can keep its normal responsive layout.
 */
export function ImageLightbox({
  src,
  alt = "Pratinjau gambar",
  children,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      } else if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        setZoom((current) => clampZoom(current + ZOOM_STEP));
      } else if (event.key === "-") {
        event.preventDefault();
        setZoom((current) => clampZoom(current - ZOOM_STEP));
      } else if (event.key === "0") {
        setZoom(MIN_ZOOM);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [open]);

  const changeZoom = (amount) =>
    setZoom((current) => clampZoom(current + amount));
  const close = () => {
    setOpen(false);
    setZoom(MIN_ZOOM);
  };

  const dialog =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[200] flex flex-col bg-slate-950/95 text-white backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label={`Pratinjau gambar: ${alt}`}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) close();
            }}
          >
            <header className="relative z-10 flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-white/15 bg-slate-950/80 px-4 py-3 sm:px-6">
              <p
                className="min-w-0 flex-1 truncate text-sm font-medium text-white/90"
                title={alt}
              >
                {alt}
              </p>
              <div
                className="flex shrink-0 items-center gap-1.5"
                aria-label="Kontrol pembesaran gambar"
              >
                <button
                  type="button"
                  onClick={() => changeZoom(-ZOOM_STEP)}
                  disabled={zoom <= MIN_ZOOM}
                  className="grid size-10 place-items-center rounded-lg text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Perkecil gambar"
                  title="Perkecil (-)"
                >
                  <Minus size={19} aria-hidden="true" />
                </button>
                <span
                  className="min-w-14 text-center text-xs font-semibold tabular-nums"
                  aria-live="polite"
                >
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => changeZoom(ZOOM_STEP)}
                  disabled={zoom >= MAX_ZOOM}
                  className="grid size-10 place-items-center rounded-lg text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Perbesar gambar"
                  title="Perbesar (+)"
                >
                  <Plus size={19} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(MIN_ZOOM)}
                  disabled={zoom === MIN_ZOOM}
                  className="ml-1 grid size-10 place-items-center rounded-lg text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Atur ulang ukuran gambar"
                  title="Ukuran awal (0)"
                >
                  <RotateCcw size={17} aria-hidden="true" />
                </button>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={close}
                  className="ml-1 grid size-10 place-items-center rounded-lg bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  aria-label="Tutup pratinjau gambar"
                  title="Tutup (Esc)"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>
            </header>

            <main
              className="min-h-0 flex-1 overflow-auto overscroll-contain p-4 sm:p-8"
              onWheel={(event) => {
                if (!event.ctrlKey) return;
                event.preventDefault();
                changeZoom(event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
              }}
            >
              <div
                className="relative mx-auto flex min-h-[55vh] w-full shrink-0 items-center justify-center"
                style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}
              >
                <Image
                  src={src}
                  alt={alt}
                  fill
                  unoptimized
                  priority
                  sizes="100vw"
                  className="object-contain"
                />
              </div>
            </main>
            <footer className="shrink-0 border-t border-white/15 bg-slate-950/80 px-4 py-2.5 text-center text-[11px] text-white/65 sm:text-xs">
              Gunakan tombol +/− atau roda mouse dengan Ctrl untuk memperbesar ·
              Tekan Esc untuk menutup
            </footer>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        type="button"
        data-image-lightbox-trigger="true"
        className={`group relative block w-full cursor-zoom-in overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 ${className}`}
        onClick={() => {
          setZoom(MIN_ZOOM);
          setOpen(true);
        }}
        aria-label={`Perbesar gambar: ${alt}`}
        aria-haspopup="dialog"
      >
        {children || (
          <Image
            src={src}
            alt={alt}
            fill
            unoptimized
            sizes="100vw"
            className="object-contain"
          />
        )}
        <span
          className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-950/75 px-2.5 py-1.5 text-[11px] font-semibold text-white opacity-90 shadow-sm transition group-hover:bg-slate-950"
          aria-hidden="true"
        >
          <ZoomIn size={14} /> Perbesar
        </span>
      </button>
      {dialog}
    </>
  );
}
