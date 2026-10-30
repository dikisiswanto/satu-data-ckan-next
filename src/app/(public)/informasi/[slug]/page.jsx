import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { CmsPageBody } from "@/components/cms/content-blocks";
import {
  getCmsPageDescription,
  getPublicCmsPageBySlugResult,
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
  const image = publicCmsImageUrl(
    page.ogImage || page.image,
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
    ...(image
      ? {
          openGraph: {
            ...social.openGraph,
            images: [{ url: image, alt: title }],
          },
          twitter: { ...social.twitter, images: [image] },
        }
      : {}),
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
            Layanan CMS CKAN sementara tidak dapat diakses. Silakan coba
            kembali.
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
  const image = publicCmsImageUrl(
    page.ogImage || page.image,
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
    publisher: { "@type": "Organization", name: siteConfig.organizationName },
  };

  return (
    <main className="page-container section-space public-interior-page">
      <Link
        href="/informasi"
        className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-primary"
      >
        <ArrowLeft size={16} aria-hidden="true" /> Kembali ke informasi
      </Link>
      <PageHeading
        eyebrow={page.category || "Informasi resmi"}
        title={page.title}
        description={page.excerpt}
      />
      {page.publishDate ? (
        <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted">
          <CalendarDays size={14} aria-hidden="true" /> Diterbitkan{" "}
          {formatDate(page.publishDate)}
        </p>
      ) : null}
      {image ? (
        <figure className="relative mt-7 aspect-[16/7] overflow-hidden rounded-2xl bg-slate-100">
          {" "}
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
