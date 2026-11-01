import { connection } from "next/server";
import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { publicPageCopy } from "@/lib/public-copy";
import { OrganizationDirectory } from "@/components/organization-directory";
import { getPublicOrganizationsResult } from "@/lib/data/organizations";
import { SectionReveal } from "@/components/section-reveal";
import {
  getCanonicalMetadata,
  getSocialMetadata,
  siteConfig,
} from "@/lib/site-config";

export const metadata = {
  title: "Perangkat Daerah",
  description: `Temukan perangkat daerah yang menerbitkan data ${siteConfig.regionName} beserta dataset yang tersedia.`,
  ...getCanonicalMetadata("/organisasi"),
  ...getSocialMetadata({
    path: "/organisasi",
    title: `Perangkat Daerah | ${siteConfig.shortName}`,
    description: `Temukan perangkat daerah beserta dataset umum, indikator, infografik, dan publikasi publik ${siteConfig.regionName}.`,
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
      <PageHeading {...publicPageCopy.organisasi} className="mb-6 sm:mb-6" />
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
              : "Belum ada perangkat daerah yang tersedia"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            {unavailable
              ? "Informasi perangkat daerah belum dapat dimuat. Silakan coba kembali beberapa saat lagi."
              : "Daftar perangkat daerah akan tampil setelah informasinya dipublikasikan. Perangkat daerah tetap dapat ditampilkan meskipun belum memiliki dataset publik."}
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
