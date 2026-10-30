import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, Database } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { DatasetCard } from "@/components/dataset-card";
import { getPublicOrganizationBySlugResult } from "@/lib/data/organizations";
import { getPublishedDatasetsResult } from "@/lib/data/public";
import { SectionReveal } from "@/components/section-reveal";
import { getCanonicalMetadata, getSocialMetadata, siteConfig } from "@/lib/site-config";

function formatCount(value) {
  return new Intl.NumberFormat("id-ID").format(Number(value) || 0);
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const result = await getPublicOrganizationBySlugResult(slug);
  if (result.unavailable) {
    return {
      title: "Informasi organisasi belum dapat dimuat",
      description: "Informasi perangkat daerah sementara tidak dapat diakses.",
      robots: { index: false, follow: false },
    };
  }
  const org = result.data;
  return org
    ? {
        title: org.title || org.name,
        description: (
          org.description || `Dataset publik yang dikelola ${org.title || org.name}.`
        ).slice(0, 160),
        ...getCanonicalMetadata(`/organisasi/${org.name}`),
        ...getSocialMetadata({
          path: `/organisasi/${org.name}`,
          title: `${org.title || org.name} | ${siteConfig.shortName}`,
          description: (
            org.description || `Dataset publik yang dikelola ${org.title || org.name}.`
          ).slice(0, 160),
        }),
      }
    : {
        title: "Organisasi tidak ditemukan",
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
          <p className="eyebrow">Layanan data tidak tersedia</p>
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

  const datasetsResult = await getPublishedDatasetsResult({
    organizationId: org.name,
    limit: 9,
  });
  if (datasetsResult.unavailable) await connection();
  const datasets = datasetsResult.data;
  const catalogHref = `/dataset?organisasi=${encodeURIComponent(org.name)}`;

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
          <PageHeading
            className="mb-4 sm:mb-4"
            eyebrow="Profil pengampu data"
            title={org.title || org.name}
            description={
              org.description ||
              "Informasi profil organisasi belum dilengkapi. Dataset yang tercantum di bawah merupakan data yang telah dipublikasikan dan dapat diakses publik."
            }
          />
          <div className="organization-detail-meta">
            <span>
              <Building2 size={16} aria-hidden="true" /> ID CKAN:{" "}
              <strong>{org.name}</strong>
            </span>
            <span>
              <Database size={16} aria-hidden="true" />{" "}
              <strong>{formatCount(org.package_count)}</strong> dataset publik
            </span>
          </div>
        </div>
      </div>

      <SectionReveal
        as="section"
        className="page-container section-space organization-datasets-section"
      >
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">DATA YANG DITERBITKAN</p>
            <h2 className="mt-2 text-2xl font-semibold">
              Dataset dari {org.title || org.name}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {datasetsResult.unavailable
                ? "Kami belum dapat memperbarui jumlah dataset karena layanan katalog sedang bermasalah."
                : `Menampilkan ${formatCount(Math.min(9, datasets.length, Number(org.package_count) || 0))} dataset terbaru dari ${formatCount(org.package_count)} dataset publik.`}
            </p>
          </div>
          {Number(org.package_count) > 0 ? (
            <Link href={catalogHref} className="home-section-link">
              Buka katalog terfilter <ArrowRight size={16} aria-hidden="true" />
            </Link>
          ) : null}
        </div>
        {datasetsResult.unavailable ? (
          <div className="surface-panel p-6" role="alert">
            <p className="font-semibold">
              Dataset organisasi belum dapat dimuat.
            </p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Layanan katalog belum merespons. Tunggu sebentar, lalu coba lagi.
              Daftar yang kosong saat ini belum tentu berarti belum ada dataset.
            </p>
            <Link
              href={catalogHref}
              className="mt-4 inline-flex text-sm font-semibold text-primary underline underline-offset-4"
            >
              Coba melalui katalog
            </Link>
          </div>
        ) : datasets.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {datasets.slice(0, 9).map((dataset) => (
              <DatasetCard key={dataset.id} dataset={dataset} />
            ))}
          </div>
        ) : (
          <div className="surface-panel p-6">
            <p className="font-semibold">
              Belum ada dataset publik yang dapat ditampilkan.
            </p>
            <p className="mt-2 text-sm text-muted">
              Dataset yang masih berupa draf atau menunggu pemeriksaan tidak
              ditampilkan pada halaman publik.
            </p>
          </div>
        )}
      </SectionReveal>
    </main>
  );
}
