import { ExternalLink, MapPinned } from "lucide-react";
import { safeHttpUrl } from "@/lib/utils";
import { siteConfig } from "@/lib/site-config";

function getGeoPortalUrl() {
  return safeHttpUrl(process.env.NEXT_PUBLIC_GEOPORTAL_URL) || null;
}

export function GeoPortalStatisticsPromo() {
  return (
    <section
      className="surface-panel mb-8 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
      aria-labelledby="thematic-map-heading"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-control bg-accent text-primary">
          <MapPinned size={21} aria-hidden="true" />
        </span>
        <div>
          <h2 id="thematic-map-heading" className="font-semibold">
            Jelajahi data berbasis lokasi
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
            Gunakan {`GeoPortal ${siteConfig.regionShortName}`} untuk melihat fasilitas dan data tematik di
            peta. Metadata dan sumber resmi dataset tetap dikelola di Portal
            Satu Data; ketersediaan setiap layer mengikuti konfigurasi
            GeoPortal.
          </p>
        </div>
      </div>
      {getGeoPortalUrl() ? (
        <a
          href={getGeoPortalUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-control bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
        >
          Buka {`GeoPortal ${siteConfig.regionShortName}`}
          <ExternalLink size={15} aria-hidden="true" />
        </a>
      ) : null}
    </section>
  );
}
