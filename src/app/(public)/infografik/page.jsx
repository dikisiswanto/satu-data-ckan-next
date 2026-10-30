import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowUpRight, Images, Info } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { getPublishedInfographicsResult } from "@/lib/data/public-infographics";
import {
  getCanonicalMetadata,
  getSocialMetadata,
  siteConfig,
} from "@/lib/site-config";
import { safeHttpUrl } from "@/lib/utils";

export const metadata = {
  title: "Infografik",
  description: `Infografik resmi dan visualisasi data ${siteConfig.regionName} yang diterbitkan melalui katalog CKAN.`,
  ...getCanonicalMetadata("/infografik"),
  ...getSocialMetadata({
    path: "/infografik",
    title: `Infografik | ${siteConfig.shortName}`,
    description: `Lihat infografik dan ringkasan data resmi ${siteConfig.regionName}.`,
  }),
};

export default async function InfografikPage({ searchParams }) {
  await connection();
  const params = await searchParams;
  const requested =
    typeof params?.halaman === "string" ? Number(params.halaman) : 1;
  const page =
    Number.isSafeInteger(requested) && requested > 0
      ? Math.min(requested, 10000)
      : 1;
  const result = await getPublishedInfographicsResult({ limit: 18, page });
  if (result.unavailable) await connection();
  const items = result.data || [];

  return (
    <main className="page-container section-space public-interior-page">
      <PageHeading
        eyebrow="Data dalam visual"
        title="Infografik"
        description="Temukan ringkasan data dan informasi daerah dalam bentuk visual. Konten di halaman ini bersumber dari dataset publik CKAN yang ditandai sebagai infografik."
      />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {result.unavailable
            ? "Katalog infografik sementara tidak dapat diakses."
            : `${Number(result.meta?.total || 0).toLocaleString("id-ID")} infografik diterbitkan.`}
        </p>
        <Link
          href="/dataset"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline underline-offset-4"
        >
          Telusuri dataset sumber <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </div>

      {items.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const imageUrl = safeHttpUrl(item.cover?.url);
            return (
              <article
                key={item.name}
                className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <Link
                  href={`/infografik/${encodeURIComponent(item.name)}`}
                  className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-slate-50">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={item.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        unoptimized
                        className="object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-3 p-8 text-center text-muted">
                        <Images size={38} aria-hidden="true" />
                        <span className="text-sm">
                          Pratinjau visual belum tersedia
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wide text-muted">
                      <span>{item.category}</span>
                      {item.period ? <span>{item.period}</span> : null}
                    </div>
                    <h2 className="mt-3 text-lg font-semibold leading-6 text-ink">
                      {item.title}
                    </h2>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">
                      {item.notes || "Ringkasan infografik belum dilengkapi."}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                      Buka infografik{" "}
                      <ArrowUpRight size={15} aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      ) : (
        <section
          className="public-empty-panel"
          role={result.unavailable ? "alert" : "status"}
        >
          <span className="public-empty-icon">
            <Images size={23} aria-hidden="true" />
          </span>
          <p className="eyebrow mt-5">
            {result.unavailable
              ? "Katalog sementara terganggu"
              : "Belum tersedia"}
          </p>
          <h2 className="mt-2 text-xl font-semibold">
            {result.unavailable
              ? "Infografik belum dapat dimuat"
              : "Belum ada infografik yang dipublikasikan"}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            {result.unavailable
              ? "Coba lagi saat layanan CKAN kembali tersedia."
              : "Buat dataset publik melalui CKAN, tambahkan tag portal-infografik, lalu unggah resource gambar PNG, JPG atau WebP dan lengkapi judul, deskripsi, organisasi, serta periode."}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
            <Link href="/dataset" className="public-empty-action">
              Jelajahi katalog dataset{" "}
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
            <Link
              href="/api-data#infografik"
              className="text-sm font-semibold text-primary underline underline-offset-4"
            >
              Panduan penerbitan
            </Link>
          </div>
          <p className="mt-5 flex items-start justify-center gap-2 text-xs leading-5 text-muted">
            <Info size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
            Infografik dan file unduh hanya ditampilkan dari resource publik
            CKAN.
          </p>
        </section>
      )}

      {items.length &&
      (page > 1 || page < Number(result.meta?.last_page || 1)) ? (
        <nav
          aria-label="Navigasi halaman infografik"
          className="mt-8 flex justify-between border-t border-line pt-5"
        >
          {page > 1 ? (
            <Link
              rel="prev"
              href={
                page === 2 ? "/infografik" : `/infografik?halaman=${page - 1}`
              }
              className="text-sm font-semibold text-primary underline underline-offset-4"
            >
              Sebelumnya
            </Link>
          ) : (
            <span />
          )}
          {page < Number(result.meta?.last_page || 1) ? (
            <Link
              rel="next"
              href={`/infografik?halaman=${page + 1}`}
              className="text-sm font-semibold text-primary underline underline-offset-4"
            >
              Berikutnya
            </Link>
          ) : null}
        </nav>
      ) : null}
    </main>
  );
}
