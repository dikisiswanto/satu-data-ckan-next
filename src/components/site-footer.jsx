import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { siteConfig } from "@/lib/site-config";
import { footerNavigation } from "@/lib/public-navigation";
export function SiteFooter() {
  return (
    <footer className="mt-16 border-t bg-white">
      <div className="page-container grid gap-8 py-10 sm:grid-cols-2 sm:items-end">
        <div className="flex items-start gap-3">
          <Image
            src={siteConfig.logoPath}
            alt={siteConfig.logoAlt}
            width={48}
            height={56}
            className="h-12 w-auto shrink-0 object-contain"
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {siteConfig.organizationName}
            </p>
            <p className="mt-1 font-semibold">{siteConfig.shortName}</p>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted">
              Satu pintu untuk menemukan, memahami, dan menggunakan data publik
              daerah. Informasi dataset yang belum tersedia ditandai secara
              terbuka.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-4 sm:items-end">
          <a
            href="https://data.go.id/about"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 rounded-lg border border-line bg-slate-50 px-3 py-2 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
            aria-label="Portal Satu Data Indonesia (situs resmi, terbuka di tab baru)"
          >
            <span className="text-left">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.13em] text-muted">Portal nasional</span>
              <Image
                src="/logo-satu-data-indonesia.svg"
                alt="Logo Satu Data Indonesia"
                width={146}
                height={88}
                className="mt-1 h-auto w-[146px] max-w-full object-contain object-left"
              />
            </span>
            <ExternalLink size={14} className="shrink-0 text-muted" aria-hidden="true" />
          </a>
          <nav aria-label="Navigasi kaki halaman" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted sm:justify-end">
            {footerNavigation.map((item) => (
              <Link key={item.href} href={item.href} className="public-link">
                {item.label}
              </Link>
            ))}
            <a href={process.env.NEXT_PUBLIC_CKAN_ADMIN_URL || "https://ckan.data.wajokab.go.id"} target="_blank" rel="noopener noreferrer" className="public-link">
              Kelola data (CKAN)
            </a>
          </nav>
        </div>
        <p className="text-xs text-muted sm:col-span-2">
          © {new Date().getFullYear()} {siteConfig.name}. Data
          resmi hanya ditampilkan setelah dipublikasikan oleh pengelola
          berwenang.
        </p>
      </div>
    </footer>
  );
}
