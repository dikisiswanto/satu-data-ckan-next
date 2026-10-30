import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { CmsContentCard } from "@/components/cms/content-card";
import {
  getPublicCmsBlogPostsResult,
  getPublicCmsNavigationResult,
  getPublicCmsPagesResult,
} from "@/lib/cms/pages";
import {
  getCanonicalMetadata,
  getSocialMetadata,
  siteConfig,
} from "@/lib/site-config";
import { publicPageCopy } from "@/lib/public-copy";

const pageTitle = `Informasi ${siteConfig.regionName}`;
const pageDescription = `Informasi, panduan, kebijakan, dan berita resmi ${siteConfig.regionName}.`;

export const metadata = {
  title: "Informasi",
  description: pageDescription,
  ...getCanonicalMetadata("/informasi"),
  ...getSocialMetadata({
    path: "/informasi",
    title: `${pageTitle} | ${siteConfig.shortName}`,
    description: pageDescription,
  }),
};

function InformationSection({
  eyebrow,
  title,
  href,
  linkLabel,
  children,
  className = "",
}) {
  return (
    <section
      className={`cms-directory-section ${className}`}
      aria-label={title}
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-5">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="text-xl font-semibold text-ink">{title}</h2>
        </div>
        {href ? (
          <Link
            href={href}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            {linkLabel} <ArrowRight size={15} aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export default async function InformasiPage() {
  const [pagesResult, postsResult, navigationResult] = await Promise.all([
    getPublicCmsPagesResult(),
    getPublicCmsBlogPostsResult(),
    getPublicCmsNavigationResult(),
  ]);
  const pages = pagesResult.data || [];
  const posts = (postsResult.data || []).slice(0, 3);
  const featuredPages = pages
    .filter((page) => page.featured || page.showInMenu)
    .sort(
      (left, right) =>
        left.menuOrder - right.menuOrder ||
        left.title.localeCompare(right.title, "id-ID"),
    );
  const generalPages = pages.filter(
    (page) => !page.featured && !page.showInMenu,
  );
  const navigation = navigationResult.data || [];
  const unavailable =
    pagesResult.unavailable ||
    postsResult.unavailable ||
    navigationResult.unavailable;
  const hasContent =
    featuredPages.length || posts.length || generalPages.length;

  return (
    <main className="page-container section-space public-interior-page informasi-directory-page">
      <PageHeading
        {...publicPageCopy.informasi}
        compact
        className="mb-4 sm:mb-5"
      />

      {unavailable ? (
        <p className="cms-directory-status" role="status">
          Sebagian informasi belum dapat dimuat. Konten yang tersedia tetap
          dapat dibaca.
        </p>
      ) : null}

      {navigation.length ? (
        <nav
          className="cms-directory-nav mt-2 flex flex-wrap gap-2 sm:mt-3"
          aria-label="Navigasi informasi"
        >
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex min-h-10 items-center rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-primary/40 hover:bg-accent hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}

      {featuredPages.length ? (
        <InformationSection
          eyebrow="HALAMAN UTAMA"
          title="Informasi pilihan"
          className="mt-6"
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {featuredPages.map((page) => (
              <Link
                data-public-list-item="true"
                key={page.name}
                href={`/informasi/${encodeURIComponent(page.name)}`}
                className="cms-directory-card rounded-2xl border border-line bg-white p-5 transition hover:border-primary/40 hover:shadow-sm"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {page.category || "Informasi"}
                </span>
                <h3 className="mt-2 min-h-12 line-clamp-2 font-semibold leading-6">
                  {page.menuLabel || page.title}
                </h3>
                <p className="mt-2 min-h-[4.5rem] line-clamp-3 text-sm leading-6 text-muted">
                  {page.excerpt}
                </p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  Baca informasi <ArrowRight size={15} aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </InformationSection>
      ) : null}

      {posts.length ? (
        <InformationSection
          eyebrow="KABAR TERBARU"
          title="Berita dan artikel terbaru"
          href="/berita"
          linkLabel="Lihat semua berita"
          className="mt-7"
        >
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((page) => (
              <CmsContentCard
                key={page.name}
                page={page}
                href={`/berita/${encodeURIComponent(page.name)}`}
                kind="Berita"
              />
            ))}
          </div>
        </InformationSection>
      ) : null}

      {generalPages.length ? (
        <InformationSection
          eyebrow="DOKUMEN DAN PANDUAN"
          title="Halaman informasi lainnya"
          className="mt-7"
        >
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {generalPages.map((page) => (
              <CmsContentCard
                key={page.name}
                page={page}
                href={`/informasi/${encodeURIComponent(page.name)}`}
              />
            ))}
          </div>
        </InformationSection>
      ) : null}

      {!hasContent && !unavailable ? (
        <div className="cms-directory-empty mt-6" role="status">
          <h2 className="font-semibold text-ink">
            Belum ada informasi yang diterbitkan
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
            Halaman panduan, kebijakan, dan berita akan muncul di sini setelah
            dipublikasikan oleh pengelola portal.
          </p>
        </div>
      ) : null}

      <p className="mt-6 text-xs leading-5 text-muted">
        Halaman ini hanya menampilkan informasi yang telah dipublikasikan untuk
        umum.
      </p>
    </main>
  );
}
