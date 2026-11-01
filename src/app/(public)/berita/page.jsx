import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Newspaper } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { CmsContentCard } from "@/components/cms/content-card";
import {
  getCmsMarkdownImage,
  getPublicCmsBlogPostsResult,
} from "@/lib/cms/pages";
import { publicPageCopy } from "@/lib/public-copy";
import {
  getCanonicalMetadata,
  getPublicSiteOrigin,
  getSocialMetadata,
  siteConfig,
} from "@/lib/site-config";

const description = `Berita, pengumuman, dan artikel resmi ${siteConfig.regionName} dari pengelola Portal Satu Data.`;
export const metadata = {
  title: "Berita dan Artikel",
  description,
  ...getCanonicalMetadata("/berita"),
  ...getSocialMetadata({
    path: "/berita",
    title: `Berita | ${siteConfig.shortName}`,
    description,
  }),
};

export default async function BeritaPage() {
  const result = await getPublicCmsBlogPostsResult();
  const posts = result.data || [];
  const featured = posts.find((post) => post.featured) || posts[0] || null;
  const featuredImage = featured
    ? getCmsMarkdownImage(featured, getPublicSiteOrigin())
    : null;
  const remaining = featured
    ? posts.filter((post) => post.name !== featured.name)
    : posts;

  return (
    <main className="page-container section-space public-interior-page">
      <PageHeading {...publicPageCopy.berita} />
      <section className="public-news-featured-slot mt-8 grid overflow-hidden rounded-3xl border border-line bg-white shadow-sm lg:grid-cols-[1.1fr_0.9fr]">
        {featured ? (
          <>
            <div className="public-news-feature-copy order-2 flex flex-col justify-center p-6 sm:p-9 lg:order-1">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                {featured.category || "Artikel pilihan"}
              </span>
              <h2 className="mt-3 min-h-[2.4em] break-words text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                {featured.title}
              </h2>
              <p className="mt-4 line-clamp-4 min-h-[7rem] leading-7 text-muted">
                {featured.excerpt}
              </p>
              <Link
                href={`/berita/${encodeURIComponent(featured.name)}`}
                className="mt-6 inline-flex min-h-11 w-fit items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Baca artikel <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </div>
            {featuredImage ? (
              <div className="public-news-feature-media relative order-1 min-h-56 bg-slate-100 lg:order-2">
                <Image
                  src={featuredImage.src}
                  alt={featuredImage.alt}
                  fill
                  unoptimized
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-cover"
                />
              </div>
            ) : (
              <div
                className="public-news-feature-media order-1 flex min-h-56 items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 lg:order-2"
                aria-hidden="true"
              >
                <span className="flex size-20 items-center justify-center rounded-3xl border border-white/80 bg-white/85 text-primary shadow-sm">
                  <Newspaper size={46} strokeWidth={1.35} />
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="col-span-full flex min-h-[18rem] flex-col items-center justify-center p-8 text-center">
            <Newspaper size={28} className="text-muted" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold">
              {result.unavailable
                ? "Berita belum dapat dimuat"
                : "Belum ada berita pilihan"}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
              {result.unavailable
                ? "Daftar berita belum dapat ditampilkan. Silakan coba kembali beberapa saat lagi."
                : "Berita pilihan akan muncul setelah diterbitkan oleh pengelola portal."}
            </p>
          </div>
        )}
      </section>
      <section className="public-news-list-slot mt-10">
        <div className="mb-5">
          <p className="eyebrow">TERBIT TERBARU</p>
          <h2 className="text-xl font-semibold">Semua berita</h2>
        </div>
        {remaining.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {remaining.map((post) => (
              <CmsContentCard
                key={post.name}
                page={post}
                href={`/berita/${encodeURIComponent(post.name)}`}
                kind="Berita"
              />
            ))}
          </div>
        ) : (
          <div
            className="cms-directory-empty"
            role={result.unavailable ? "alert" : "status"}
          >
            {result.unavailable
              ? "Daftar berita lainnya belum dapat dimuat."
              : posts.length
                ? "Belum ada berita lainnya."
                : "Berita lainnya akan ditampilkan setelah diterbitkan."}
          </div>
        )}
      </section>
    </main>
  );
}
