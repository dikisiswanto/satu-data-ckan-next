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
