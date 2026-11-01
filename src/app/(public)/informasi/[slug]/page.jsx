import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { CmsPageBody } from "@/components/cms/content-blocks";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import {
  getAbsoluteCmsImageUrl,
  getCmsFeatureImage,
  getCmsPageDescription,
  getPublicCmsPageBySlugResult,
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
  const result = await getPublicCmsPageBySlugResult(slug);
  if (result.unavailable || !result.data)
    return {
      title: "Informasi tidak ditemukan",
      robots: { index: false, follow: false },
    };
  const page = result.data;
  const title = page.seoTitle || page.title;
  const description =
    getCmsPageDescription(page) || `Informasi resmi ${siteConfig.regionName}.`;
  const featureImage = getCmsFeatureImage(page, getPublicSiteOrigin());
  const absoluteImage = getAbsoluteCmsImageUrl(
    featureImage?.src,
    getPublicSiteOrigin(),
  );
  const social = getSocialMetadata({
    path: `/informasi/${page.name}`,
    title: `${title} | ${siteConfig.shortName}`,
    description,
    type: "article",
  });
  return {
    title,
    description,
    ...getCanonicalMetadata(`/informasi/${page.name}`),
    ...social,
    // CMS pages do not inherit the site's generic hero as a fake cover. An
    // actual image is discovered from metadata, Markdown or content blocks;
    // otherwise Open Graph/Twitter image arrays remain explicitly empty.
    openGraph: {
      ...social.openGraph,
      images: absoluteImage
        ? [{ url: absoluteImage, alt: featureImage?.alt || title }]
        : [],
    },
    twitter: {
      ...social.twitter,
      images: absoluteImage ? [absoluteImage] : [],
    },
  };
}

export default async function InformasiDetailPage({ params }) {
  const { slug } = await params;
  const result = await getPublicCmsPageBySlugResult(slug);
  if (result.unavailable) {
    await connection();
    return (
      <main className="page-container section-space public-interior-page">
        <section className="public-empty-panel" role="alert">
          <h1 className="text-xl font-semibold">
            Informasi belum dapat dimuat
          </h1>
          <p className="mt-3 text-sm text-muted">
            Silakan coba kembali beberapa saat lagi.
          </p>
          <Link
            href={`/informasi/${encodeURIComponent(slug)}`}
            className="public-empty-action mt-5"
          >
            Coba lagi
          </Link>
        </section>
      </main>
    );
  }
  if (!result.data) notFound();
  const page = result.data;
  const featureImage = getCmsFeatureImage(page, getPublicSiteOrigin());
  const absoluteImage = getAbsoluteCmsImageUrl(
    featureImage?.src,
    getPublicSiteOrigin(),
  );
  const canonical = getPublicSiteOrigin()
    ? new URL(`/informasi/${page.name}`, getPublicSiteOrigin()).toString()
    : undefined;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.title,
    description: getCmsPageDescription(page),
    ...(canonical ? { url: canonical } : {}),
    ...(absoluteImage ? { image: [absoluteImage] } : {}),
    publisher: { "@type": "Organization", name: siteConfig.organizationName },
  };

  return (
    <main className="page-container section-space public-interior-page">
      <Link
        href="/informasi"
        className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-primary"
      >
        <ArrowLeft size={16} aria-hidden="true" /> Kembali ke pusat informasi
      </Link>
      <PageHeading
        className="public-dynamic-heading"
        reserveTitle
        reserveDescription
        eyebrow={page.category || "Informasi"}
        title={page.title}
        description={page.excerpt || "Ringkasan informasi belum tersedia."}
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
      {featureImage?.src ? (
        <figure className="public-cms-cover relative mt-7 aspect-[16/7] overflow-hidden rounded-2xl bg-slate-100">
          <div className="absolute inset-0">
            <ImageLightbox
              src={featureImage.src}
              alt={featureImage.alt || page.title}
              className="h-full w-full"
            >
              <div className="relative h-full w-full">
                <Image
                  src={featureImage.src}
                  alt={featureImage.alt || page.title}
                  fill
                  unoptimized
                  sizes="100vw"
                  className="object-cover"
                />
              </div>
            </ImageLightbox>
          </div>
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
