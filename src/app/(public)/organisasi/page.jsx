import { connection } from "next/server";
import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { OrganizationDirectory } from "@/components/organization-directory";
import { getPublicOrganizationsResult } from "@/lib/data/organizations";
import { SectionReveal } from "@/components/section-reveal";
import { getCanonicalMetadata, getSocialMetadata, siteConfig } from "@/lib/site-config";

export const metadata = {
  title: "Perangkat Daerah",
  description:
    `Cari perangkat daerah pengampu data ${siteConfig.regionName} dan lihat jumlah dataset yang telah dipublikasikan.`,
  ...getCanonicalMetadata("/organisasi"),
  ...getSocialMetadata({
    path: "/organisasi",
    title: `Perangkat Daerah | ${siteConfig.shortName}`,
    description:
      `Temukan perangkat daerah pengampu data dan dataset publik ${siteConfig.regionName}.`,
  }),
};

export default async function OrganizationsPage() {
  // Organization cards include published-dataset counts. Keep a temporary
  // service failure from being cached as a healthy empty directory.
  const { data: organizations, unavailable } =
    await getPublicOrganizationsResult();
  if (unavailable) await connection();
  return (
    <main className="page-container section-space public-interior-page organization-directory-page">
      <PageHeading
        className="mb-6 sm:mb-6"
        eyebrow="Pengampu data"
        title="Perangkat daerah"
        description={`Temukan perangkat daerah aktif yang mengampu data ${siteConfig.regionName}, termasuk organisasi yang sedang menyiapkan publikasi pertamanya.`}
      />
      {organizations.length ? (
        <SectionReveal as="div">
          <OrganizationDirectory organizations={organizations} />
        </SectionReveal>
      ) : (
        <div
          className="public-empty-panel max-w-3xl p-6 text-left sm:p-8"
          role={unavailable ? "alert" : undefined}
        >
          <h2 className="text-lg font-semibold">
            {unavailable
              ? "Daftar perangkat daerah belum dapat dimuat"
              : "Belum ada perangkat daerah aktif"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            {unavailable
              ? "Layanan data organisasi sedang tidak dapat diakses. Coba muat ulang halaman beberapa saat lagi."
              : "Belum ada organisasi aktif yang terdaftar untuk ditampilkan. Organisasi aktif akan muncul di sini meskipun belum memiliki dataset publik."}{" "}
            Dataset draf dan informasi internal tidak ditampilkan pada portal
            publik.
          </p>
          {unavailable ? (
            <Link
              href="/organisasi"
              className="mt-4 inline-flex text-sm font-semibold text-primary underline underline-offset-4"
            >
              Coba lagi
            </Link>
          ) : null}
        </div>
      )}
    </main>
  );
}
