import Link from "next/link";
import { ArrowRight, Newspaper } from "lucide-react";
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

const pageTitle = `Informasi ${siteConfig.regionName}`;
const pageDescription = `Halaman informasi, panduan, kebijakan, dan berita resmi ${siteConfig.regionName} yang dikelola melalui CMS CKAN.`;

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

export default async function InformasiPage() {
  const [pagesResult, postsResult, navigationResult] = await Promise.all([
    getPublicCmsPagesResult(),
    getPublicCmsBlogPostsResult(),
    getPublicCmsNavigationResult(),
  ]);
  const pages = pagesResult.data || [];
  const posts = (postsResult.data || []).slice(0, 6);
  const featuredPages = pages
    .filter((page) => page.featured || page.showInMenu)
    .sort(
      (left, right) =>
        left.menuOrder - right.menuOrder ||
        left.title.localeCompare(right.title, "id"),
    );
  const generalPages = pages.filter(
    (page) => !page.featured && !page.showInMenu,
  );
  const unavailable =
    pagesResult.unavailable ||
    postsResult.unavailable ||
    navigationResult.unavailable;

  return (
    <main className="page-container section-space public-interior-page">
      <PageHeading
        eyebrow="Pusat informasi"
        title="Informasi"
        description={`Temukan kebijakan, panduan, profil, berita, dan artikel resmi ${siteConfig.regionName}. Konten dikelola oleh pengelola berwenang melalui CKAN.`}
      />

      {unavailable ? (
        <section
          className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"
          role="status"
        >
          <strong>Konten belum lengkap.</strong> Sebagian informasi dari CMS
          CKAN sementara tidak dapat dimuat. Konten lain yang berhasil diambil
          tetap ditampilkan.
        </section>
      ) : null}

      {navigationResult.data.length ? (
        <nav
          className="mt-7 flex flex-wrap gap-2"
          aria-label="Navigasi informasi"
        >
          {navigationResult.data.map((item) => (
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
        <section
          className="mt-9"
          aria-labelledby="information-featured-heading"
        >
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">HALAMAN UTAMA</p>
              <h2
                id="information-featured-heading"
                className="text-xl font-semibold"
              >
                Informasi pilihan
              </h2>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {featuredPages.map((page) => (
              <Link
                key={page.name}
                href={`/informasi/${encodeURIComponent(page.name)}`}
                className="rounded-2xl border border-line bg-white p-5 transition hover:border-primary/40 hover:shadow-sm"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {page.category || "Informasi"}
                </span>
                <h3 className="mt-2 font-semibold leading-6">
                  {page.menuLabel || page.title}
                </h3>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">
                  {page.excerpt}
                </p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  Buka halaman <ArrowRight size={15} aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {posts.length ? (
        <section className="mt-12" aria-labelledby="information-news-heading">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">KABAR DAN PUBLIKASI</p>
              <h2
                id="information-news-heading"
                className="text-xl font-semibold"
              >
                Berita dan artikel terbaru
              </h2>
            </div>
            <Link
              href="#berita-lainnya"
              className="text-sm font-semibold text-primary hover:underline"
            >
              Lihat daftar berita
            </Link>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {posts.slice(0, 3).map((page) => (
              <CmsContentCard
                key={page.name}
                page={page}
                href={`/berita/${encodeURIComponent(page.name)}`}
                kind="Berita"
              />
            ))}
          </div>
        </section>
      ) : null}

      {generalPages.length ? (
        <section className="mt-12" aria-labelledby="information-pages-heading">
          <div className="mb-5">
            <p className="eyebrow">DOKUMEN DAN PANDUAN</p>
            <h2
              id="information-pages-heading"
              className="text-xl font-semibold"
            >
              Halaman informasi lainnya
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {generalPages.map((page) => (
              <CmsContentCard
                key={page.name}
                page={page}
                href={`/informasi/${encodeURIComponent(page.name)}`}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section
        id="berita-lainnya"
        className="mt-12 rounded-2xl border border-line bg-slate-50 p-5 sm:p-7"
      >
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-primary">
            <Newspaper size={21} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Berita dan artikel</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              {posts.length
                ? `${posts.length} konten terbaru dimuat dari CKAN Pages.`
                : "Belum ada berita yang dipublikasikan. Pengelola dapat membuat artikel melalui menu Pages di CKAN Admin."}
            </p>
            <Link
              href="/berita"
              className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              Buka arsip berita <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
      <p className="mt-6 text-xs leading-5 text-muted">
        Konten publik di halaman ini bersumber dari CKAN Pages. Halaman privat
        tetap dilindungi oleh pemeriksaan hak akses CKAN dan tidak dirender oleh
        portal publik.
      </p>
    </main>
  );
}
