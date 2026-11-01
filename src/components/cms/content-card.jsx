import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, FileText, Newspaper } from "lucide-react";
import { getCmsMarkdownImage, publicCmsImageUrl } from "@/lib/cms/pages";
import { getPublicSiteOrigin } from "@/lib/site-config";
import { formatDate } from "@/lib/utils";

export function CmsContentCard({ page, href, kind = "Halaman informasi" }) {
  const isArticle =
    page.pageType === "blog" ||
    kind.toLowerCase() === "berita" ||
    kind.toLowerCase() === "artikel";
  const markdownImage = isArticle
    ? getCmsMarkdownImage(page, getPublicSiteOrigin())
    : null;
  const imageUrl = isArticle
    ? markdownImage?.src || ""
    : publicCmsImageUrl(page.ogImage || page.image, getPublicSiteOrigin());
  const FallbackIcon = isArticle ? Newspaper : FileText;

  return (
    <article
      data-public-list-item="true"
      className="group overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <Link
        href={href}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        {imageUrl ? (
          <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
            <Image
              src={imageUrl}
              alt={markdownImage?.alt || page.title}
              fill
              unoptimized
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover transition duration-500 group-hover:scale-[1.02]"
            />
          </div>
        ) : (
          <div
            className="flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 text-primary"
            aria-hidden="true"
          >
            <span className="flex size-16 items-center justify-center rounded-2xl border border-white/80 bg-white/85 shadow-sm">
              <FallbackIcon size={36} strokeWidth={1.4} />
            </span>
          </div>
        )}
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
            <span>{page.category || kind}</span>
            {page.publishDate ? (
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={12} aria-hidden="true" />
                {formatDate(page.publishDate)}
              </span>
            ) : null}
          </div>
          <h2 className="mt-3 break-words text-lg font-semibold leading-6 text-ink group-hover:text-primary">
            {page.title}
          </h2>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">
            {page.excerpt || "Ringkasan belum tersedia."}
          </p>
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
            Baca selengkapnya <ArrowUpRight size={15} aria-hidden="true" />
          </span>
        </div>
      </Link>
    </article>
  );
}
