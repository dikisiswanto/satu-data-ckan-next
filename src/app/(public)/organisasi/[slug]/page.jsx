import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  ChartNoAxesColumn,
  Database,
  Image as ImageIcon,
} from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { getPublicOrganizationBySlugResult } from "@/lib/data/organizations";
import { getPublicOrganizationImageUrl } from "@/lib/ckan/public-media-url";
import { formatDate } from "@/lib/utils";
import { getPublishedDatasetsResult } from "@/lib/data/public";
import { getPublishedIndicatorsResult } from "@/lib/data/public-indicators";
import { getPublishedInfographicsResult } from "@/lib/data/public-infographics";
import { getPublishedPublicationsResult } from "@/lib/data/public-publications";
import { SectionReveal } from "@/components/section-reveal";
import {
  getCanonicalMetadata,
  getSocialMetadata,
  siteConfig,
} from "@/lib/site-config";

function formatCount(value) {
  return new Intl.NumberFormat("id-ID").format(Number(value) || 0);
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const result = await getPublicOrganizationBySlugResult(slug);
  if (result.unavailable) {
    return {
      title: "Profil perangkat daerah belum dapat dimuat",
      description: "Profil perangkat daerah sementara belum dapat ditampilkan.",
      robots: { index: false, follow: false },
    };
  }
  const org = result.data;
  return org
    ? {
        title: org.title || org.name,
        description: (
          org.description ||
          `Dataset umum, indikator, infografik, dan publikasi publik yang diterbitkan ${org.title || org.name}.`
        ).slice(0, 160),
        ...getCanonicalMetadata(`/organisasi/${org.name}`),
        ...getSocialMetadata({
          path: `/organisasi/${org.name}`,
          title: `${org.title || org.name} | ${siteConfig.shortName}`,
          description: (
            org.description ||
            `Dataset umum, indikator, infografik, dan publikasi publik yang diterbitkan ${org.title || org.name}.`
          ).slice(0, 160),
        }),
      }
    : {
        title: "Perangkat daerah tidak ditemukan",
        robots: { index: false, follow: false },
      };
}

export default async function OrganizationDetailPage({ params }) {
  const { slug } = await params;
  // The published-dataset total on this page must reflect the current catalog.
  await connection();
  const organizationResult = await getPublicOrganizationBySlugResult(slug);
  if (organizationResult.unavailable) {
    // Do not cache transient organization lookup failures as an error page.
    await connection();
    return (
      <main className="page-container section-space public-interior-page">
        <section
          className="public-empty-panel mx-auto max-w-3xl p-8 text-center sm:p-12"
          role="alert"
        >
          <p className="eyebrow">Informasi belum tersedia</p>
          <h1 className="mt-3 text-2xl font-semibold">
            Informasi perangkat daerah belum dapat dimuat
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted">
            Kami belum dapat mengambil informasi perangkat daerah saat ini. Ini
            tidak berarti perangkat daerah tersebut dihapus atau dinonaktifkan.
            Coba lagi beberapa saat lagi.
          </p>
          <a
            href={`/organisasi/${encodeURIComponent(slug)}`}
            className="public-empty-action mt-5"
          >
            Coba lagi
          </a>
          <Link
            href="/organisasi"
            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary"
          >
            Kembali ke daftar perangkat daerah
          </Link>
        </section>
      </main>
    );
  }
  const org = organizationResult.data;
  if (!org) notFound();

  // Each CKAN publication family is queried independently. CKAN's organization
  // package_count combines every package-backed content type and is not the
  // number of general datasets shown in the public dataset catalogue.
  const [
    datasetsResult,
    indicatorsResult,
    infographicsResult,
    publicationsResult,
  ] = await Promise.all([
    getPublishedDatasetsResult({ organizationId: org.name, limit: 3 }),
    getPublishedIndicatorsResult({
      organizationId: org.name,
      limit: 3,
      includeLatest: false,
    }),
    getPublishedInfographicsResult({ organizationId: org.name, limit: 3 }),
    getPublishedPublicationsResult({ organizationId: org.name, limit: 3 }),
  ]);
  if (
    [
      datasetsResult,
      indicatorsResult,
      infographicsResult,
      publicationsResult,
    ].some((result) => result.unavailable)
  ) {
    await connection();
  }
  const datasets = datasetsResult.data;
  const indicators = indicatorsResult.data;
  const infographics = infographicsResult.data;
  const publications = publicationsResult.data;
  const counts = {
    datasets: datasetsResult.unavailable
      ? null
      : (datasetsResult.meta?.total ?? null),
    indicators: indicatorsResult.unavailable
      ? null
      : (indicatorsResult.meta?.total ?? null),
    infographics: infographicsResult.unavailable
      ? null
      : (infographicsResult.meta?.total ?? null),
    publications: publicationsResult.unavailable
      ? null
      : (publicationsResult.meta?.total ?? null),
  };
  const catalogHref = `/dataset?organisasi=${encodeURIComponent(org.name)}`;
  const organizationImageUrl = getPublicOrganizationImageUrl(org);

  return (
    <main className="organization-detail-page public-interior-page">
      <div className="organization-detail-band">
        <div className="page-container py-6 sm:py-8">
          <Link
            href="/organisasi"
            className="mb-4 inline-flex items-center gap-[.4rem] text-[.8rem] font-[650] [color:var(--public-teal)]"
          >
            <ArrowLeft size={16} aria-hidden="true" /> Daftar perangkat daerah
          </Link>
          <div className="flex items-start gap-4">
            {organizationImageUrl ? (
              <Image
                src={organizationImageUrl}
                alt={`Logo ${org.title || org.name}`}
                width={88}
                height={88}
                sizes="88px"
                priority
                unoptimized
                className="size-[4.5rem] shrink-0 rounded-2xl border border-line bg-white p-2 object-contain shadow-sm sm:size-20"
              />
            ) : (
              <span className="grid size-[4.5rem] shrink-0 place-items-center rounded-2xl border border-line bg-white text-primary sm:size-20">
                <Building2 size={30} aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <PageHeading
                className="public-dynamic-heading mb-4 sm:mb-4"
                reserveTitle
                reserveDescription
                eyebrow="Profil perangkat daerah"
                title={org.title || org.name}
                description={
                  org.description ||
                  "Profil perangkat daerah belum dilengkapi. Bagian di bawah menampilkan dataset umum, indikator, infografik, dan publikasi yang telah diterbitkan serta dapat diakses publik."
                }
              />
            </div>
          </div>
          <div className="organization-detail-meta">
            <span>
              <Building2 size={16} aria-hidden="true" /> Kode perangkat daerah:{" "}
              <strong>{org.name}</strong>
            </span>
            <span>
              <Database size={16} aria-hidden="true" /> Statistik penerbitan
              hanya menghitung konten publik.
            </span>
          </div>
          <section
            className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"
            aria-label="Ringkasan konten publik perangkat daerah"
          >
            {[
              {
                key: "datasets",
                label: "Dataset umum",
                icon: Database,
                href: `/dataset?organisasi=${encodeURIComponent(org.name)}`,
              },
              {
                key: "indicators",
                label: "Indikator",
                icon: ChartNoAxesColumn,
                href: `/statistik?organisasi=${encodeURIComponent(org.name)}`,
              },
              {
                key: "infographics",
                label: "Infografik",
                icon: ImageIcon,
                href: `/infografik?organisasi=${encodeURIComponent(org.name)}`,
              },
              {
                key: "publications",
                label: "Publikasi",
                icon: BookOpen,
                href: `/publikasi?organisasi=${encodeURIComponent(org.name)}`,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className="group rounded-xl border border-line bg-white p-3.5 transition-colors hover:border-primary/40 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:p-4"
                >
                  <span className="flex items-center gap-2 text-xs font-semibold text-muted">
                    <Icon size={15} aria-hidden="true" /> {item.label}
                  </span>
                  <strong className="mt-2 block text-2xl font-bold tabular-nums text-ink">
                    {counts[item.key] === null
                      ? "—"
                      : formatCount(counts[item.key])}
                  </strong>
                  <span className="mt-1 block text-[11px] text-muted">
                    Terbit dan dapat diakses publik
                  </span>
                </Link>
              );
            })}
          </section>
        </div>
      </div>

      <SectionReveal
        as="section"
        className="page-container section-space organization-datasets-section"
      >
        <div className="mb-6">
          <p className="eyebrow">KATALOG PENERBIT</p>
          <h2 className="mt-2 text-2xl font-semibold">
            Konten yang diterbitkan
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Dataset, indikator, infografik, dan publikasi dihitung terpisah
            sesuai kategori portal. Semua angka menunjukkan konten publik yang
            dapat dibuka, bukan total package CKAN.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <section
            className="surface-panel min-w-0 p-5"
            aria-labelledby="org-datasets-heading"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 id="org-datasets-heading" className="font-semibold">
                  Dataset umum
                </h3>
                <p className="mt-1 text-sm text-muted">
                  {counts.datasets === null
                    ? "Jumlah belum tersedia"
                    : `${formatCount(counts.datasets)} dataset publik`}
                </p>
              </div>
              {counts.datasets > 0 ? (
                <Link
                  href={catalogHref}
                  className="shrink-0 text-sm font-semibold text-primary hover:underline"
                >
                  Semua{" "}
                  <ArrowRight size={14} className="inline" aria-hidden="true" />
                </Link>
              ) : null}
            </div>
            {datasetsResult.unavailable ? (
              <p className="text-sm text-muted" role="status">
                Katalog dataset sementara tidak dapat dimuat.
              </p>
            ) : datasets.length ? (
              <ul className="divide-y divide-line rounded-xl border border-line bg-white px-3 sm:px-4">
                {datasets.map((dataset) => {
                  const resourceCount = Array.isArray(dataset.resources)
                    ? dataset.resources.length
                    : 0;
                  const updated =
                    dataset.metadata_modified || dataset.metadata_created;
                  return (
                    <li
                      key={dataset.id || dataset.name}
                      className="flex min-w-0 items-center gap-3 py-3"
                    >
                      <span
                        className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface text-primary"
                        aria-hidden="true"
                      >
                        <Database size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/dataset/${encodeURIComponent(dataset.name)}`}
                          className="block truncate text-sm font-semibold text-ink hover:text-primary focus-visible:underline"
                          title={dataset.title || dataset.name}
                        >
                          {dataset.title || dataset.name}
                        </Link>
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted">
                          {dataset.notes || "Deskripsi belum tersedia."}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-0.5 text-[11px] tabular-nums text-muted">
                        <span>{formatCount(resourceCount)} berkas</span>
                        <span>{formatDate(updated)}</span>
                      </div>
                      <Link
                        href={`/dataset/${encodeURIComponent(dataset.name)}`}
                        aria-label={`Buka dataset ${dataset.title || dataset.name}`}
                        className="grid size-7 shrink-0 place-items-center rounded-md text-muted hover:bg-surface hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                      >
                        <ArrowRight size={15} aria-hidden="true" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted">
                Belum ada dataset umum yang diterbitkan.
              </p>
            )}
          </section>
          <section
            className="surface-panel min-w-0 p-5"
            aria-labelledby="org-indicators-heading"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 id="org-indicators-heading" className="font-semibold">
                  Indikator statistik
                </h3>
                <p className="mt-1 text-sm text-muted">
                  {counts.indicators === null
                    ? "Jumlah belum tersedia"
                    : `${formatCount(counts.indicators)} indikator publik`}
                </p>
              </div>
              <Link
                href={`/statistik?organisasi=${encodeURIComponent(org.name)}`}
                className="shrink-0 text-sm font-semibold text-primary hover:underline"
              >
                Lihat katalog{" "}
                <ArrowRight size={14} className="inline" aria-hidden="true" />
              </Link>
            </div>
            {indicatorsResult.unavailable ? (
              <p className="text-sm text-muted" role="status">
                Katalog indikator sementara tidak dapat dimuat.
              </p>
            ) : indicators.length ? (
              <ul className="divide-y divide-line">
                {indicators.map((item) => (
                  <li key={item.name} className="py-3 first:pt-0 last:pb-0">
                    <Link
                      href={`/statistik/${encodeURIComponent(item.name)}`}
                      className="font-semibold text-ink hover:text-primary"
                    >
                      {item.title}
                    </Link>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">
                      {item.metadata?.definition ||
                        item.notes ||
                        "Definisi belum tersedia."}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">
                Belum ada indikator statistik yang diterbitkan.
              </p>
            )}
          </section>
          <section
            className="surface-panel min-w-0 p-5"
            aria-labelledby="org-infographics-heading"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 id="org-infographics-heading" className="font-semibold">
                  Infografik
                </h3>
                <p className="mt-1 text-sm text-muted">
                  {counts.infographics === null
                    ? "Jumlah belum tersedia"
                    : `${formatCount(counts.infographics)} infografik publik`}
                </p>
              </div>
              <Link
                href={`/infografik?organisasi=${encodeURIComponent(org.name)}`}
                className="shrink-0 text-sm font-semibold text-primary hover:underline"
              >
                Lihat katalog{" "}
                <ArrowRight size={14} className="inline" aria-hidden="true" />
              </Link>
            </div>
            {infographicsResult.unavailable ? (
              <p className="text-sm text-muted" role="status">
                Katalog infografik sementara tidak dapat dimuat.
              </p>
            ) : infographics.length ? (
              <ul className="divide-y divide-line">
                {infographics.map((item) => (
                  <li key={item.name} className="py-3 first:pt-0 last:pb-0">
                    <Link
                      href={`/infografik/${encodeURIComponent(item.name)}`}
                      className="font-semibold text-ink hover:text-primary"
                    >
                      {item.title}
                    </Link>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">
                      {item.category}
                      {item.period ? ` · ${item.period}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">
                Belum ada infografik yang diterbitkan.
              </p>
            )}
          </section>
          <section
            className="surface-panel min-w-0 p-5"
            aria-labelledby="org-publications-heading"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 id="org-publications-heading" className="font-semibold">
                  Publikasi dan laporan
                </h3>
                <p className="mt-1 text-sm text-muted">
                  {counts.publications === null
                    ? "Jumlah belum tersedia"
                    : `${formatCount(counts.publications)} publikasi publik`}
                </p>
              </div>
              <Link
                href={`/publikasi?organisasi=${encodeURIComponent(org.name)}`}
                className="shrink-0 text-sm font-semibold text-primary hover:underline"
              >
                Lihat katalog{" "}
                <ArrowRight size={14} className="inline" aria-hidden="true" />
              </Link>
            </div>
            {publicationsResult.unavailable ? (
              <p className="text-sm text-muted" role="status">
                Katalog publikasi sementara tidak dapat dimuat.
              </p>
            ) : publications.length ? (
              <ul className="divide-y divide-line">
                {publications.map((item) => (
                  <li key={item.name} className="py-3 first:pt-0 last:pb-0">
                    <Link
                      href={`/publikasi/${encodeURIComponent(item.name)}`}
                      className="font-semibold text-ink hover:text-primary"
                    >
                      {item.title}
                    </Link>
                    <p className="mt-1 text-sm text-muted">
                      {item.category}
                      {item.publicationDate
                        ? ` · ${formatDate(item.publicationDate)}`
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">
                Belum ada publikasi atau laporan yang diterbitkan.
              </p>
            )}
          </section>
        </div>
      </SectionReveal>
    </main>
  );
}
