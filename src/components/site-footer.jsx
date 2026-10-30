import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { siteConfig } from "@/lib/site-config";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-white">
      <div className="page-container grid gap-7 py-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:py-9">
        <div className="flex min-w-0 items-start gap-3">
          <Image
            src={siteConfig.logoPath}
            alt={siteConfig.logoAlt}
            width={48}
            height={56}
            className="h-12 w-auto shrink-0 object-contain"
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {siteConfig.organizationName}
            </p>
            <p className="mt-1 font-semibold text-ink">
              {siteConfig.shortName}
            </p>
            <p className="mt-1.5 max-w-md text-sm leading-6 text-muted">
              Temukan, unduh, dan manfaatkan data resmi daerah melalui satu
              portal.
            </p>
          </div>
        </div>

        <a
          href="https://data.go.id"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-line bg-white px-2.5 py-2 transition hover:border-[#c4d5df] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
          aria-label="Kunjungi Portal Satu Data Indonesia di data.go.id (tab baru)"
        >
          <Image
            src="/logo-satu-data-indonesia.svg"
            alt="Logo Satu Data Indonesia"
            width={184}
            height={118}
            className="h-auto w-[9.5rem] max-w-none shrink-0 object-contain sm:w-[10rem]"
          />
          <ExternalLink
            size={13}
            className="ml-1 shrink-0 text-muted"
            aria-hidden="true"
          />
        </a>

        <p className="border-t border-line pt-4 text-xs text-muted sm:col-span-2">
          © {new Date().getFullYear()} {siteConfig.name}
        </p>
      </div>
    </footer>
  );
}
