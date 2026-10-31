import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { CmsPageBody } from "@/components/cms/content-blocks";
import {
  getAbsoluteCmsImageUrl,
  getCmsMarkdownImage,
  getCmsPageDescription,
  getPublicCmsBlogPostBySlugResult,
  publicCmsImageUrl,
} from "@/lib/cms/pages";
import {
  getCanonicalMetadata,
  getPublicSiteOrigin,
  getSocialMetadata,
  siteConfig,
} from "@/lib/site-config";
import { serializeJsonLd } from "@/lib/seo/json-ld";
import { formatDate } from "@/lib/utils";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const result = await getPublicCmsBlogPostBySlugResult(slug);
  if (result.unavailable || !result.data)
    return {
      title: "Artikel tidak ditemukan",
      robots: { index: false, follow: false },
    };
  const page = result.data;
  const title = page.seoTitle || page.title;
  const description =
    getCmsPageDescription(page) ||
    `Berita dan artikel resmi ${siteConfig.regionName}.`;
  const image =
    publicCmsImageUrl(page.ogImage || page.image, getPublicSiteOrigin()) ||
    getCmsMarkdownImage(page, getPublicSiteOrigin())?.src ||
    "";
  const social = getSocialMetadata({
    path: `/berita/${page.name}`,
    title: `${title} | ${siteConfig.shortName}`,
    description,
    type: "article",
  });
  return {
    title,
    description,
    ...getCanonicalMetadata(`/berita/${page.name}`),
    ...social,
    ...(image
      ? {
          openGraph: {
            ...social.openGraph,
            images: [{ url: image, alt: title }],
          },
          twitter: { ...social.twitter, images: [image] },
        }
      : {}),
    ...(page.publishDate
      ? { other: { "article:published_time": page.publishDate } }
      : {}),
  };
}

export default async function BeritaDetailPage({ params }) {
  const { slug } = await params;
  const result = await getPublicCmsBlogPostBySlugResult(slug);
  if (result.unavailable) {
    await connection();
    return (
      <main className="page-container section-space public-interior-page">
        <section className="public-empty-panel" role="alert">
          <h1 className="text-xl font-semibold">Artikel belum dapat dimuat</h1>
          <p className="mt-3 text-sm text-muted">
            Artikel belum dapat ditampilkan. Silakan coba kembali beberapa saat
            lagi.
          </p>
          <Link href="/berita" className="public-empty-action mt-5">
            Kembali ke daftar berita
          </Link>
        </section>
      </main>
    );
  }
  if (!result.data) notFound();
  const page = result.data;
  const image = publicCmsImageUrl(
    page.ogImage || page.image,
    getPublicSiteOrigin(),
  );
  const socialImage =
    image || getCmsMarkdownImage(page, getPublicSiteOrigin())?.src || "";
  const absoluteImage = getAbsoluteCmsImageUrl(
    socialImage,
    getPublicSiteOrigin(),
  );
  const canonical = getPublicSiteOrigin()
    ? new URL(`/berita/${page.name}`, getPublicSiteOrigin()).toString()
    : undefined;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: page.title,
    description: getCmsPageDescription(page),
    ...(canonical ? { mainEntityOfPage: canonical, url: canonical } : {}),
    ...(page.publishDate ? { datePublished: page.publishDate } : {}),
    ...(absoluteImage ? { image: [absoluteImage] } : {}),
    publisher: { "@type": "Organization", name: siteConfig.organizationName },
  };

  return (
    <main className="page-container section-space public-interior-page">
      <Link
        href="/berita"
        className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-primary"
      >
        <ArrowLeft size={16} aria-hidden="true" /> Kembali ke daftar berita
      </Link>
      <PageHeading
        className="public-dynamic-heading"
        reserveTitle
        eyebrow={page.category || "Berita dan artikel"}
        title={page.title}
      />
      <p className="public-publish-date mt-3 inline-flex min-h-5 items-center gap-2 text-xs text-muted">
        {page.publishDate ? (
          <>
            <CalendarDays size={14} aria-hidden="true" /> Diterbitkan{" "}
            {formatDate(page.publishDate)}
          </>
        ) : (
          "Tanggal terbit belum dicantumkan"
        )}
      </p>
      {image ? (
        <figure className="public-cms-cover relative mt-7 aspect-[16/7] overflow-hidden rounded-2xl bg-slate-100">
          <Image
            src={image}
            alt={page.title}
            fill
            unoptimized
            sizes="100vw"
            className="object-cover"
          />
        </figure>
      ) : null}
      <article className="cms-document mt-8 rounded-2xl border border-line bg-white p-5 sm:p-8 lg:p-10">
        <CmsPageBody page={page} />
      </article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
    </main>
  );
}
