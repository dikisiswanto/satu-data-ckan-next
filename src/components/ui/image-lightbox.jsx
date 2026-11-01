"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Minus,
  Plus,
  RotateCcw,
  X,
  ZoomIn,
} from "lucide-react";

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.5;
const WHEEL_ZOOM_FACTOR = 1.12;

function clampZoom(value) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value) || MIN_ZOOM));
}

function clampPan(value, zoom, imageElement, stageElement) {
  if (!imageElement || !stageElement || zoom <= MIN_ZOOM) {
    return { x: 0, y: 0 };
  }

  const maxX = Math.max(
    0,
    (imageElement.offsetWidth * zoom - stageElement.clientWidth) / 2,
  );
  const maxY = Math.max(
    0,
    (imageElement.offsetHeight * zoom - stageElement.clientHeight) / 2,
  );

  return {
    x: Math.min(maxX, Math.max(-maxX, value.x)),
    y: Math.min(maxY, Math.max(-maxY, value.y)),
  };
}

function pointerDistance(first, second) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function readGallery(group, trigger, fallback) {
  if (!group || typeof document === "undefined")
    return { items: [fallback], index: 0 };

  const elements = Array.from(
    document.querySelectorAll('[data-image-lightbox-trigger="true"]'),
  ).filter((element) => element.dataset.imageLightboxGroup === group);
  const candidates = elements
    .map((element) => ({
      src: element.dataset.imageLightboxSrc || "",
      alt: element.dataset.imageLightboxAlt || "Pratinjau gambar",
      caption: element.dataset.imageLightboxCaption || "",
    }))
    .filter((item) => item.src);

  if (!candidates.length) return { items: [fallback], index: 0 };

  const current = elements.indexOf(trigger);
  const index = Math.max(
    0,
    elements
      .slice(0, current)
      .filter((element) => element.dataset.imageLightboxSrc).length,
  );
  return { items: candidates, index: Math.min(index, candidates.length - 1) };
}

/**
 * Shared, accessible image viewer for public dataset, infographic and CMS media.
 * Gallery navigation is opt-in through the `group` prop.
 */
export function ImageLightbox({
  src,
  alt = "Pratinjau gambar",
  caption = "",
  group,
  children,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [gallery, setGallery] = useState([]);
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [imageStatus, setImageStatus] = useState("loading");
  const [imageSize, setImageSize] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const stageRef = useRef(null);
  const imageRef = useRef(null);
  const previousFocusRef = useRef(null);
  const pointerMapRef = useRef(new Map());
  const dragStartRef = useRef(null);
  const pinchStartRef = useRef(null);
  const suppressBackdropClickRef = useRef(false);
  const suppressClickTimerRef = useRef(null);
  const titleId = useId();
  const helpId = useId();

  const activeImage = gallery[index] || { src, alt, caption };
  const galleryLength = gallery.length;
  const thumbnailStart = Math.max(0, Math.min(index - 3, galleryLength - 7));
  const visibleThumbnails = gallery.slice(thumbnailStart, thumbnailStart + 7);

  // Keep keyboard handlers attached only while the dialog is open, without
  // reinstalling the focus/scroll lock effect for every zoom or gallery change.
  const zoomRef = useRef(zoom);
  const indexRef = useRef(index);
  const galleryRef = useRef(gallery);

  // Keep refs synchronized after React commits. Updating refs during render is
  // unsafe under concurrent rendering and is rejected by React's hooks lint.
  useLayoutEffect(() => {
    zoomRef.current = zoom;
    indexRef.current = index;
    galleryRef.current = gallery;
  }, [zoom, index, gallery]);

  function boundedPan(nextPan, nextZoom = zoom) {
    return clampPan(nextPan, nextZoom, imageRef.current, stageRef.current);
  }

  function setZoomTo(nextZoom) {
    const boundedZoom = clampZoom(nextZoom);
    setZoom(boundedZoom);
    setPan((current) =>
      boundedZoom === MIN_ZOOM
        ? { x: 0, y: 0 }
        : boundedPan(current, boundedZoom),
    );
  }

  function changeZoom(amount) {
    setZoomTo(zoom + amount);
  }

  function resetView() {
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
  }

  function goToImage(nextIndex) {
    const items = galleryRef.current;
    if (items.length < 2) return;
    const next = (nextIndex + items.length) % items.length;
    setIndex(next);
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
    setImageSize(null);
    setImageStatus("loading");
    pointerMapRef.current.clear();
    dragStartRef.current = null;
    pinchStartRef.current = null;
    setIsDragging(false);
  }

  function closeLightbox() {
    setOpen(false);
    resetView();
    pointerMapRef.current.clear();
    if (suppressClickTimerRef.current)
      window.clearTimeout(suppressClickTimerRef.current);
    suppressBackdropClickRef.current = false;
    setIsDragging(false);
  }

  function openLightbox(event) {
    const trigger = event.currentTarget;
    const fallback = {
      src: trigger.dataset.imageLightboxSrc || src,
      alt: trigger.dataset.imageLightboxAlt || alt,
      caption: trigger.dataset.imageLightboxCaption || caption,
    };
    const result = readGallery(group, trigger, fallback);

    previousFocusRef.current = trigger;
    setGallery(result.items);
    setIndex(result.index);
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
    setImageSize(null);
    setImageStatus("loading");
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return undefined;

    const dialog = dialogRef.current;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = Math.max(
      0,
      window.innerWidth - document.documentElement.clientWidth,
    );
    const previousFocus = previousFocusRef.current || document.activeElement;
    const siblings = Array.from(document.body.children)
      .filter((element) => element !== dialog)
      .map((element) => ({
        element,
        inert: element.inert,
        ariaHidden: element.getAttribute("aria-hidden"),
      }));

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    if (scrollbarWidth) {
      const currentPadding =
        Number.parseFloat(
          window.getComputedStyle(document.body).paddingRight,
        ) || 0;
      document.body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
    }

    siblings.forEach(({ element }) => {
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
    });

    const focusableSelector =
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeLightbox();
        return;
      }

      if (event.key === "Tab") {
        const focusable = Array.from(
          dialog?.querySelectorAll(focusableSelector) || [],
        ).filter(
          (element) =>
            !element.closest("[hidden]") &&
            element.getAttribute("aria-hidden") !== "true",
        );
        if (!focusable.length) {
          event.preventDefault();
          dialog?.focus();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === dialog)
        ) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
        return;
      }

      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        setZoomTo(zoomRef.current + ZOOM_STEP);
      } else if (event.key === "-") {
        event.preventDefault();
        setZoomTo(zoomRef.current - ZOOM_STEP);
      } else if (event.key === "0") {
        event.preventDefault();
        resetView();
      } else if (
        zoomRef.current <= MIN_ZOOM &&
        event.key === "ArrowLeft" &&
        galleryRef.current.length > 1
      ) {
        event.preventDefault();
        goToImage(indexRef.current - 1);
      } else if (
        zoomRef.current <= MIN_ZOOM &&
        event.key === "ArrowRight" &&
        galleryRef.current.length > 1
      ) {
        event.preventDefault();
        goToImage(indexRef.current + 1);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.documentElement.style.overflow = previousDocumentOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.paddingRight = previousBodyPaddingRight;
      siblings.forEach(({ element, inert, ariaHidden }) => {
        element.inert = inert;
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
      });
      if (previousFocus?.isConnected) previousFocus.focus?.();
    };
    // closeLightbox and view helpers use stable state setters/refs. Rebinding on
    // every zoom would incorrectly unlock the page and restore focus mid-session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || galleryLength < 2 || typeof window === "undefined")
      return undefined;
    const adjacent = [
      gallery[(index + 1) % galleryLength],
      gallery[(index - 1 + galleryLength) % galleryLength],
    ];
    adjacent.filter(Boolean).forEach((item) => {
      const image = new window.Image();
      image.decoding = "async";
      image.src = item.src;
    });
  }, [gallery, galleryLength, index, open]);

  function handleWheel(event) {
    event.preventDefault();
    const factor = event.deltaY < 0 ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR;
    setZoomTo(zoom * factor);
  }

  function handlePointerDown(event) {
    if (event.target.closest("button")) return;
    if (
      event.pointerType === "mouse" &&
      (event.button !== 0 || zoom <= MIN_ZOOM)
    )
      return;
    const pointers = pointerMapRef.current;
    pointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
      pointerType: event.pointerType,
      swipeEligible: event.pointerType !== "mouse" && zoom <= MIN_ZOOM,
    });
    event.currentTarget.setPointerCapture?.(event.pointerId);

    if (pointers.size === 1) {
      suppressBackdropClickRef.current = false;
      dragStartRef.current = { ...pointers.get(event.pointerId), pan };
      setIsDragging(zoom > MIN_ZOOM);
    } else if (pointers.size === 2) {
      const points = Array.from(pointers.values());
      pinchStartRef.current = {
        distance: pointerDistance(points[0], points[1]),
        zoom,
      };
      dragStartRef.current = null;
      setIsDragging(true);
    }
  }

  function handlePointerMove(event) {
    const pointers = pointerMapRef.current;
    if (!pointers.has(event.pointerId)) return;
    const activePointer = pointers.get(event.pointerId);
    pointers.set(event.pointerId, {
      ...activePointer,
      x: event.clientX,
      y: event.clientY,
    });

    if (pointers.size >= 2) {
      const points = Array.from(pointers.values()).slice(0, 2);
      const start = pinchStartRef.current;
      if (!start || start.distance <= 0) return;
      const distance = pointerDistance(points[0], points[1]);
      setZoomTo(start.zoom * (distance / start.distance));
      return;
    }

    if (zoom <= MIN_ZOOM || !dragStartRef.current) return;
    const start = dragStartRef.current;
    setPan(
      boundedPan({
        x: start.pan.x + event.clientX - start.x,
        y: start.pan.y + event.clientY - start.y,
      }),
    );
  }

  function finishPointer(event) {
    const pointers = pointerMapRef.current;
    const wasLastPointer = pointers.size === 1;
    const swipeStart = dragStartRef.current;
    const deltaX = swipeStart ? event.clientX - swipeStart.x : 0;
    const deltaY = swipeStart ? event.clientY - swipeStart.y : 0;
    const moved = Math.hypot(deltaX, deltaY) > 4;
    const shouldSwipe =
      wasLastPointer &&
      event.type !== "pointercancel" &&
      event.pointerType !== "mouse" &&
      zoom <= MIN_ZOOM &&
      galleryRef.current.length > 1 &&
      swipeStart?.swipeEligible === true &&
      Math.abs(deltaX) > 52 &&
      Math.abs(deltaX) > Math.abs(deltaY) * 1.2;

    pointers.delete(event.pointerId);
    pinchStartRef.current = null;

    if (shouldSwipe) {
      goToImage(indexRef.current + (deltaX < 0 ? 1 : -1));
    }
    if (wasLastPointer && moved && (zoom > MIN_ZOOM || shouldSwipe)) {
      event.preventDefault();
      suppressBackdropClickRef.current = true;
      if (suppressClickTimerRef.current)
        window.clearTimeout(suppressClickTimerRef.current);
      suppressClickTimerRef.current = window.setTimeout(() => {
        suppressBackdropClickRef.current = false;
        suppressClickTimerRef.current = null;
      }, 0);
    }

    if (pointers.size === 1) {
      const [remaining] = pointers.values();
      dragStartRef.current = { ...remaining, pan, swipeEligible: false };
      setIsDragging(zoom > MIN_ZOOM);
    } else {
      dragStartRef.current = null;
      setIsDragging(false);
    }
  }

  const dialog =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={dialogRef}
            className="fixed inset-0 z-[250] flex flex-col bg-[#080b12]/[0.98] text-white backdrop-blur-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={helpId}
            tabIndex={-1}
            data-image-lightbox-dialog="true"
            onClick={(event) => {
              if (event.target === event.currentTarget) closeLightbox();
            }}
          >
            <header className="relative z-20 flex shrink-0 flex-col gap-2 border-b border-white/10 bg-slate-950/80 px-3 py-3 backdrop-blur-xl sm:flex-row sm:items-center sm:gap-4 sm:px-5">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 text-white/80">
                  <ZoomIn size={18} aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2
                    id={titleId}
                    className="truncate text-sm font-semibold text-white"
                    title={activeImage.alt}
                  >
                    {activeImage.alt}
                  </h2>
                  {activeImage.caption ? (
                    <p
                      className="mt-0.5 truncate text-xs text-white/55"
                      title={activeImage.caption}
                    >
                      {activeImage.caption}
                    </p>
                  ) : null}
                </div>
                {galleryLength > 1 ? (
                  <span
                    className="shrink-0 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium tabular-nums text-white/75"
                    aria-live="polite"
                  >
                    {index + 1} / {galleryLength}
                  </span>
                ) : null}
              </div>

              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <div
                  className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.06] p-1"
                  role="group"
                  aria-label="Kontrol pembesaran gambar"
                >
                  <button
                    type="button"
                    onClick={() => changeZoom(-ZOOM_STEP)}
                    disabled={zoom <= MIN_ZOOM}
                    className="grid size-9 place-items-center rounded-lg text-white/85 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-30 sm:size-10"
                    aria-label="Perkecil gambar"
                    title="Perkecil (−)"
                  >
                    <Minus size={18} aria-hidden="true" />
                  </button>
                  <span
                    className="min-w-12 text-center text-xs font-semibold tabular-nums text-white"
                    aria-live="polite"
                  >
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => changeZoom(ZOOM_STEP)}
                    disabled={zoom >= MAX_ZOOM}
                    className="grid size-9 place-items-center rounded-lg text-white/85 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-30 sm:size-10"
                    aria-label="Perbesar gambar"
                    title="Perbesar (+)"
                  >
                    <Plus size={18} aria-hidden="true" />
                  </button>
                  <span
                    className="mx-0.5 h-6 w-px bg-white/15"
                    aria-hidden="true"
                  />
                  <button
                    type="button"
                    onClick={resetView}
                    disabled={zoom === MIN_ZOOM && pan.x === 0 && pan.y === 0}
                    className="grid size-9 place-items-center rounded-lg text-white/85 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-30 sm:size-10"
                    aria-label="Atur ulang ukuran gambar"
                    title="Sesuaikan ke layar (0)"
                  >
                    <RotateCcw size={17} aria-hidden="true" />
                  </button>
                </div>

                <a
                  href={activeImage.src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 text-white/80 transition hover:bg-white/10 hover:text-white"
                  aria-label="Buka gambar asli di tab baru"
                  title="Buka gambar asli"
                >
                  <ArrowUpRight size={18} aria-hidden="true" />
                </a>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={closeLightbox}
                  className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-slate-950 shadow-lg transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  aria-label="Tutup pratinjau gambar"
                  title="Tutup (Esc)"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>
            </header>

            <main
              ref={stageRef}
              className={`relative min-h-0 flex-1 touch-none select-none overflow-hidden overscroll-contain ${zoom > MIN_ZOOM ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"}`}
              onWheel={handleWheel}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishPointer}
              onPointerCancel={finishPointer}
              onDoubleClick={() => setZoomTo(zoom > MIN_ZOOM ? MIN_ZOOM : 2)}
              onClick={(event) => {
                if (suppressBackdropClickRef.current) {
                  suppressBackdropClickRef.current = false;
                  if (suppressClickTimerRef.current)
                    window.clearTimeout(suppressClickTimerRef.current);
                  suppressClickTimerRef.current = null;
                  event.preventDefault();
                  event.stopPropagation();
                  return;
                }
                if (event.target === event.currentTarget) closeLightbox();
              }}
              aria-label="Area pratinjau gambar. Gunakan roda mouse atau gestur cubit untuk zoom, lalu geser gambar yang diperbesar."
            >
              <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-8 lg:p-10">
                {imageStatus === "loading" ? (
                  <div
                    className="absolute z-10 flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-4 py-2 text-xs text-white/75"
                    role="status"
                  >
                    <LoaderCircle
                      size={15}
                      className="animate-spin"
                      aria-hidden="true"
                    />{" "}
                    Memuat gambar…
                  </div>
                ) : null}
                {imageStatus === "error" ? (
                  <div
                    className="z-10 flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-6 text-center"
                    role="alert"
                  >
                    <div className="grid size-12 place-items-center rounded-full bg-white/10">
                      <ZoomIn size={22} aria-hidden="true" />
                    </div>
                    <p className="text-sm font-semibold">
                      Gambar tidak dapat dimuat
                    </p>
                    <p className="text-xs leading-5 text-white/60">
                      Periksa koneksi atau buka berkas sumber secara langsung.
                    </p>
                    <a
                      href={activeImage.src}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-white px-4 text-xs font-semibold text-slate-950 hover:bg-slate-200"
                    >
                      Buka gambar asli{" "}
                      <ArrowUpRight size={14} aria-hidden="true" />
                    </a>
                  </div>
                ) : (
                  <Image
                    key={`${activeImage.src}:${index}`}
                    ref={imageRef}
                    src={activeImage.src}
                    alt={activeImage.alt}
                    width={imageSize?.width || 1600}
                    height={imageSize?.height || 1200}
                    unoptimized
                    priority
                    draggable={false}
                    sizes="100vw"
                    className={`h-auto w-auto max-h-full max-w-full object-contain ${zoom > MIN_ZOOM ? "will-change-transform" : ""}`}
                    style={{
                      transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                      transformOrigin: "center center",
                      transition: isDragging
                        ? "none"
                        : "transform 120ms ease-out",
                    }}
                    onLoad={(event) => {
                      setImageSize({
                        width: event.currentTarget.naturalWidth,
                        height: event.currentTarget.naturalHeight,
                      });
                      setImageStatus("loaded");
                    }}
                    onError={() => setImageStatus("error")}
                  />
                )}
              </div>

              {galleryLength > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => goToImage(index - 1)}
                    className="absolute left-3 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-slate-950/55 text-white shadow-lg backdrop-blur-md transition hover:bg-slate-950/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:left-5 sm:size-12"
                    aria-label="Gambar sebelumnya"
                    title="Sebelumnya (←)"
                  >
                    <ChevronLeft size={23} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => goToImage(index + 1)}
                    className="absolute right-3 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-slate-950/55 text-white shadow-lg backdrop-blur-md transition hover:bg-slate-950/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-5 sm:size-12"
                    aria-label="Gambar berikutnya"
                    title="Berikutnya (→)"
                  >
                    <ChevronRight size={23} aria-hidden="true" />
                  </button>
                </>
              ) : null}
            </main>

            {galleryLength > 1 ? (
              <nav
                aria-label="Pilih gambar dalam galeri"
                className="flex shrink-0 items-center justify-center gap-2 overflow-x-auto border-t border-white/10 bg-slate-950/65 px-3 py-2.5"
              >
                {visibleThumbnails.map((item, thumbnailOffset) => {
                  const thumbnailIndex = thumbnailStart + thumbnailOffset;
                  const selected = thumbnailIndex === index;
                  return (
                    <button
                      key={`${item.src}-${thumbnailIndex}`}
                      type="button"
                      onClick={() => goToImage(thumbnailIndex)}
                      aria-label={`Tampilkan gambar ${thumbnailIndex + 1}: ${item.alt}`}
                      aria-pressed={selected}
                      title={item.alt}
                      className={`relative h-11 w-16 shrink-0 overflow-hidden rounded-lg border transition sm:h-14 sm:w-20 ${selected ? "border-white ring-2 ring-white/35" : "border-white/15 opacity-65 hover:border-white/50 hover:opacity-100"}`}
                    >
                      <Image
                        src={item.src}
                        alt=""
                        fill
                        unoptimized
                        sizes="80px"
                        className="object-cover"
                      />
                    </button>
                  );
                })}
              </nav>
            ) : null}

            <footer
              id={helpId}
              className="flex min-h-11 shrink-0 items-center justify-center gap-x-3 gap-y-1 border-t border-white/10 bg-slate-950/75 px-3 py-2 text-center text-[10px] leading-4 text-white/55 sm:gap-x-5 sm:text-xs"
            >
              <span>Roda mouse / cubit untuk zoom</span>
              <span aria-hidden="true" className="text-white/25">
                ·
              </span>
              <span>
                {galleryLength > 1
                  ? "Geser atau gunakan panah untuk navigasi"
                  : "Klik dua kali untuk zoom"}
              </span>
              <span aria-hidden="true" className="text-white/25">
                ·
              </span>
              <span>Esc untuk menutup</span>
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
        data-image-lightbox-src={src}
        data-image-lightbox-alt={alt}
        data-image-lightbox-caption={caption || ""}
        data-image-lightbox-group={group || undefined}
        className={`group relative block w-full cursor-zoom-in overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 ${className}`}
        onClick={openLightbox}
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
          className="pointer-events-none absolute bottom-3 right-3 inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-white/15 bg-slate-950/80 px-2.5 py-1.5 text-[11px] font-semibold text-white opacity-95 shadow-lg transition group-hover:bg-slate-950 group-focus-visible:opacity-100"
          aria-hidden="true"
        >
          <ZoomIn size={14} /> Perbesar
        </span>
      </button>
      {dialog}
    </>
  );
}
