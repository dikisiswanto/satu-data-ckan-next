"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { scrollPublicPageToTop, scrollToPublicList } from "@/lib/public-scroll";

const PAGINATED_PUBLIC_LISTS = {
  "/dataset": "dataset-list",
  "/statistik": "statistics-list",
  "/infografik": "infographic-list",
  "/publikasi": "publication-list",
};

// Content-list items and homepage sections reveal once when they enter view.
// Page shells, headings, hero sections, and route transitions stay static.
const PUBLIC_REVEAL_SELECTOR = '[data-public-list-item="true"]';
const PUBLIC_HOME_SECTION_SELECTOR =
  ".public-home .home-section, .public-home .home-feature-row";

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
    const observedSections = new WeakSet();
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
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-home-section-visible");
          sectionObserver.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.04 },
    );
    const register = (target) => {
      if (
        observed.has(target) ||
        target.classList.contains("is-scroll-visible") ||
        target.closest('[aria-busy="true"]')
      )
        return;
      target.classList.add("has-scroll-reveal");
      observed.add(target);
      observer.observe(target);
    };
    const registerSection = (target) => {
      if (
        observedSections.has(target) ||
        target.classList.contains("is-home-section-visible") ||
        target.closest('[aria-busy="true"]')
      )
        return;
      target.classList.add("has-home-section-reveal");
      observedSections.add(target);
      sectionObserver.observe(target);
    };
    const scan = (root) => {
      if (root instanceof Element) {
        if (root.matches(PUBLIC_REVEAL_SELECTOR)) register(root);
        if (root.matches(PUBLIC_HOME_SECTION_SELECTOR)) registerSection(root);
      }
      root.querySelectorAll?.(PUBLIC_REVEAL_SELECTOR).forEach(register);
      root
        .querySelectorAll?.(PUBLIC_HOME_SECTION_SELECTOR)
        .forEach(registerSection);
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
      sectionObserver.disconnect();
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
          const list = document.getElementById(listId);
          scrollToPublicList(list);
          list?.focus({ preventScroll: true });
        });
        return () => window.cancelAnimationFrame(scheduleScroll);
      }
    }
  }, [pathname, queryKey, page]);

  return null;
}
