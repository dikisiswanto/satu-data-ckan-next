"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const routeLabels = {
  dataset: { label: "Dataset", detail: "Detail dataset" },
  organisasi: { label: "Perangkat Daerah", detail: "Profil perangkat daerah" },
  statistik: { label: "Statistik", detail: "Rincian indikator" },
  infografik: { label: "Infografik", detail: "Detail infografik" },
  publikasi: { label: "Publikasi", detail: "Detail publikasi" },
  informasi: { label: "Informasi", detail: "Rincian informasi" },
  berita: { label: "Berita dan artikel", detail: "Detail artikel" },
  "api-data": { label: "Dokumentasi API" },
  bantuan: { label: "Bantuan" },
};

/** Lightweight breadcrumbs keep route discovery consistent on every interior page. */
export function PublicBreadcrumbs() {
  const pathname = usePathname();
  const segments = (pathname || "/").split("/").filter(Boolean);
  if (!segments.length) return null;

  const [section, ...rest] = segments;
  const route = routeLabels[section];
  if (!route) return null;

  const items = [{ label: "Beranda", href: "/", home: true }];
  if (rest.length && route.detail) {
    items.push({ label: route.label, href: `/${section}` });
    items.push({ label: route.detail, current: true });
  } else {
    items.push({ label: route.label, current: true });
  }

  return (
    <div className="public-breadcrumb-band">
      <nav aria-label="Breadcrumb" className="page-container py-2.5 sm:py-3">
        <ol className="inline-flex w-fit max-w-full min-w-0 items-center gap-1.5 overflow-x-auto rounded-lg border border-line/80 bg-white/90 px-3 py-2 text-xs text-muted shadow-sm sm:gap-2 sm:px-3.5 sm:py-2 sm:text-sm">
          {items.map((item, index) => (
            <li
              key={`${item.label}-${index}`}
              className="flex shrink-0 items-center gap-1.5 sm:gap-2"
            >
              {index > 0 ? (
                <ChevronRight
                  size={14}
                  className="text-muted/70"
                  aria-hidden="true"
                />
              ) : null}
              {item.current ? (
                <span
                  aria-current="page"
                  className="max-w-[48vw] truncate font-semibold text-ink sm:max-w-none"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    "inline-flex min-h-7 items-center gap-1.5 rounded-sm hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                    item.home && "font-medium",
                  )}
                >
                  {item.home ? <Home size={14} aria-hidden="true" /> : null}
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}
