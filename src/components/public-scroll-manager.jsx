"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { scrollPublicPageToTop, scrollToPublicList } from "@/lib/public-scroll";

const PAGINATED_PUBLIC_LISTS = {
  "/dataset": "dataset-list",
  "/statistik": "statistics-list",
};

/**
 * Public route changes start at the top. Query pagination is the exception:
 * keep the reader focused on the list whose contents changed.
 */
export function PublicScrollManager() {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const queryKey = searchParams.toString();
  const page = searchParams.get("halaman");
  const previousRouteRef = useRef(null);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;

    const observed = new WeakSet();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-scroll-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    const scan = (root) => {
      if (
        root instanceof Element &&
        root.matches(
          ".home-content .home-section, .home-content .home-feature-row",
        ) &&
        !observed.has(root)
      ) {
        root.classList.add("has-scroll-reveal");
        observed.add(root);
        observer.observe(root);
      }
      root
        .querySelectorAll?.(
          ".home-content .home-section, .home-content .home-feature-row",
        )
        .forEach((target) => {
          if (observed.has(target)) return;
          target.classList.add("has-scroll-reveal");
          observed.add(target);
          observer.observe(target);
        });
    };

    scan(document);
    const mutations = new MutationObserver((records) => {
      records.forEach((record) =>
        record.addedNodes.forEach((node) => {
          if (node instanceof Element) scan(node);
        }),
      );
    });
    mutations.observe(document.body, { childList: true, subtree: true });
    return () => {
      mutations.disconnect();
      observer.disconnect();
    };
  }, [pathname]);

  useEffect(() => {
    const previous = previousRouteRef.current;
    previousRouteRef.current = { pathname, queryKey, page };

    // On initial load, start at the top unless this URL explicitly targets an
    // in-page anchor (for example, the skip link or a section deep-link).
    if (!previous) {
      if (!window.location.hash) scrollPublicPageToTop();
      return;
    }

    if (previous.pathname !== pathname) {
      if (!window.location.hash) scrollPublicPageToTop();
      return;
    }

    if (previous.page !== page) {
      const listId = PAGINATED_PUBLIC_LISTS[pathname];
      if (listId) {
        const scheduleScroll = window.requestAnimationFrame(() => {
          scrollToPublicList(document.getElementById(listId));
        });
        return () => window.cancelAnimationFrame(scheduleScroll);
      }
    }
  }, [pathname, queryKey, page]);

  return null;
}
