"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryKey = searchParams.toString();
  const routeKey = `${pathname}?${queryKey}`;
  const [activeRouteKey, setActiveRouteKey] = useState(null);
  const timeoutRef = useRef(null);
  const active = activeRouteKey === routeKey;

  useEffect(() => {
    // A changed route immediately hides progress through the derived `active`
    // value. Clear stale state on the next frame without cascading a render
    // from the effect itself.
    const clearStaleProgress = window.requestAnimationFrame(() => {
      setActiveRouteKey((current) => (current === routeKey ? current : null));
    });

    const startProgress = () => {
      setActiveRouteKey(routeKey);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        setActiveRouteKey((current) => (current === routeKey ? null : current));
        timeoutRef.current = null;
      }, 12000);
    };
    const handleClick = (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
      if (
        !anchor ||
        anchor.hasAttribute("download") ||
        anchor.target === "_blank"
      )
        return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search &&
        !destination.hash
      )
        return;
      if (
        destination.pathname === window.location.pathname &&
        destination.hash &&
        destination.search === window.location.search
      )
        return;
      startProgress();
    };
    const handleSubmit = (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (form.target === "_blank") return;
      const destination = new URL(
        form.action || window.location.href,
        window.location.href,
      );
      if (destination.origin !== window.location.origin) return;
      // This listener runs in capture phase. Wait until React/onSubmit handlers
      // have had a chance to prevent default, otherwise AJAX forms show a route
      // progress bar even though no navigation will occur.
      queueMicrotask(() => {
        if (!event.defaultPrevented && !form.dataset.skipRouteProgress)
          startProgress();
      });
    };
    const handlePopState = () => startProgress();
    document.addEventListener("click", handleClick, true);
    document.addEventListener("submit", handleSubmit, true);
    window.addEventListener("popstate", handlePopState);
    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("submit", handleSubmit, true);
      window.removeEventListener("popstate", handlePopState);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      window.cancelAnimationFrame(clearStaleProgress);
    };
  }, [routeKey]);

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 transition-opacity duration-150 ${active ? "opacity-100" : "opacity-0"}`}
      aria-hidden="true"
    >
      <span className="block h-full w-full bg-[#62839a]" />
    </div>
  );
}
