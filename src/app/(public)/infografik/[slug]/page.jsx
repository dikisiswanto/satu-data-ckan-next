import Image from "next/image";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import {
  ArrowLeft,
  ArrowUpRight,
  Download,
  FileText,
  Images,
} from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import {
  getPublicInfographicBySlugResult,
  isImageResource,
} from "@/lib/data/public-infographics";
import {
  getCanonicalMetadata,
  getSocialMetadata,
  siteConfig,
} from "@/lib/site-config";
import { formatDate } from "@/lib/utils";
import { publicResourceUrl } from "@/lib/ckan/public-resource-url";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const result = await getPublicInfographicBySlugResult(slug);
  if (result.unavailable)
    return {
      title: "Infografik belum dapat dimuat",
      robots: { index: false, follow: false },
    };
  if (!result.data)
    return {
      title: "Infografik tidak ditemukan",
      robots: { index: false, follow: false },
    };
  const item = result.data;
  return {
    title: item.title,
    description: (
      item.notes || `Infografik resmi ${siteConfig.regionName}.`
    ).slice(0, 160),
    ...getCanonicalMetadata(`/infografik/${item.name}`),
    ...getSocialMetadata({
      path: `/infografik/${item.name}`,
      title: `${item.title} | ${siteConfig.shortName}`,
      description: (
        item.notes || `Infografik resmi ${siteConfig.regionName}.`
      ).slice(0, 160),
      type: "article",
    }),
  };
}

export default async function InfographicDetailPage({ params }) {
  const { slug } = await params;
  const result = await getPublicInfographicBySlugResult(slug);
  if (result.unavailable) {
    await connection();
    return (
      <main className="page-container section-space public-interior-page">
        <section className="public-empty-panel" role="alert">
          <h1 className="text-xl font-semibold">
            Infografik belum dapat dimuat
          </h1>
          <p className="mt-3 text-sm text-muted">
            Saat ini infografik belum dapat ditampilkan. Silakan coba kembali
            beberapa saat lagi.
          </p>
          <Link
            href={`/infografik/${encodeURIComponent(slug)}`}
            className="public-empty-action mt-5"
          >
            Coba lagi
          </Link>
        </section>
      </main>
    );
  }
  if (!result.data) notFound();
  const item = result.data;
  const images = item.resources.filter(isImageResource);
  const downloads = item.resources.filter((resource) =>
    publicResourceUrl(resource.url),
  );

  return (
    <main className="page-container section-space public-interior-page">
      <Link
        href="/infografik"
        className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-primary"
      >
        <ArrowLeft size={16} aria-hidden="true" /> Kembali ke infografik
      </Link>
      <PageHeading
        className="public-dynamic-heading"
        reserveTitle
        reserveDescription
        eyebrow={item.category || "Infografik"}
        title={item.title}
        description={item.notes || "Deskripsi infografik belum tersedia."}
      />
      <div className="mt-7 grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="public-infographic-gallery space-y-5">
          {images.length ? (
            images.map((resource) => (
              <figure
                key={resource.id}
                className="overflow-hidden rounded-2xl border border-line bg-white p-3 sm:p-5"
              >
                <ImageLightbox
                  src={publicResourceUrl(resource.url)}
                  alt={resource.description || resource.name || item.title}
                  caption={resource.name || item.title}
                  group={`infographic-${item.name}`}
                  className="rounded-xl bg-slate-50"
                >
                  <div className="relative aspect-[4/3] w-full">
                    <Image
                      src={publicResourceUrl(resource.url)}
                      alt={resource.description || resource.name || item.title}
                      fill
                      unoptimized
                      sizes="(min-width: 1280px) 65vw, 100vw"
                      className="object-contain"
                    />
                  </div>
                </ImageLightbox>
                <figcaption className="mt-3 text-sm text-muted">
                  {resource.name || item.title}
                </figcaption>
              </figure>
            ))
          ) : (
            <div className="public-empty-panel infographic-preview-empty flex min-h-[24rem] flex-col items-center justify-center">
              <Images
                size={30}
                className="mx-auto text-muted"
                aria-hidden="true"
              />
              <p className="mt-4 text-sm text-muted">
                Pratinjau gambar belum tersedia. Anda masih dapat membuka atau
                mengunduh berkas yang tercantum.
              </p>
            </div>
          )}
        </section>
        <aside className="rounded-2xl border border-line bg-white p-5">
          <h2 className="text-base font-semibold">Informasi publikasi</h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="text-muted">Perangkat daerah penerbit</dt>
              <dd className="mt-1 font-medium">
                {item.attribution || "Belum dicantumkan"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Periode</dt>
              <dd className="mt-1 font-medium">
                {item.period || "Belum dicantumkan"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Terakhir diperbarui</dt>
              <dd className="mt-1 font-medium">
                {formatDate(
                  item.package.metadata_modified ||
                    item.package.metadata_created,
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Kode dataset</dt>
              <dd className="mt-1 break-all font-mono text-xs">{item.name}</dd>
            </div>
          </dl>
          <h3 className="mt-6 border-t border-line pt-5 text-sm font-semibold">
            Berkas dan unduhan
          </h3>
          <div className="public-infographic-download-list mt-3 grid gap-2">
            {downloads.length ? (
              downloads.map((resource) => (
                <a
                  key={resource.id}
                  href={publicResourceUrl(resource.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-11 items-center gap-3 rounded-lg border border-line p-3 text-sm hover:bg-accent"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                    <FileText size={17} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate">
                      {resource.name || resource.description || "Berkas"}
                    </strong>
                    <small className="text-muted">
                      {resource.format || resource.mimetype || "Berkas"}
                    </small>
                  </span>
                  <Download size={16} aria-hidden="true" />
                </a>
              ))
            ) : (
              <p className="text-sm text-muted">
                Belum ada berkas yang dapat diunduh.
              </p>
            )}
          </div>
          <Link
            href={`/dataset/${item.name}`}
            className="mt-5 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Lihat dataset terkait <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </aside>
      </div>
    </main>
  );
}
