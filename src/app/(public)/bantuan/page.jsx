import Link from "next/link";
import {
  ArrowUpRight,
  ClipboardList,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import {
  getCanonicalMetadata,
  getSocialMetadata,
  siteConfig,
} from "@/lib/site-config";

export const metadata = {
  title: "Bantuan dan Permintaan Informasi Publik",
  description: `Panduan mengajukan permintaan informasi publik yang belum tersedia di ${siteConfig.shortName} melalui ${siteConfig.ppidName}.`,
  ...getCanonicalMetadata("/bantuan"),
  ...getSocialMetadata({
    path: "/bantuan",
    title: `Bantuan dan Permintaan Informasi | ${siteConfig.shortName}`,
    description: `Panduan mengajukan permintaan informasi publik melalui kanal resmi ${siteConfig.ppidName}.`,
  }),
};

const ppidUrl = siteConfig.ppidUrl;

export default function HelpPage() {
  return (
    <main className="page-container section-space public-interior-page">
      <PageHeading
        eyebrow="Pusat bantuan"
        title="Bantuan dan permintaan informasi"
        description={`Belum menemukan informasi yang dibutuhkan? Ajukan permintaan informasi publik melalui ${siteConfig.ppidName}.`}
      />
      <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <section className="rounded-2xl border border-[#e1eaf1] bg-[linear-gradient(145deg,_#f1f7ff_0%,_#ffffff_72%)] p-5 shadow-[0_8px_30px_rgb(24_58_68_/_4%)] sm:p-8">
          <span className="grid size-12 place-items-center rounded-xl bg-[#e8f1ff] text-[#1d5fa7]">
            <ClipboardList size={22} aria-hidden="true" />
          </span>
          <p className="eyebrow mt-5">Permintaan informasi</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#17364f]">
            Belum menemukan informasi yang Anda butuhkan?
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-[#526777]">
            Ajukan permintaan melalui layanan PPID. Sampaikan jenis informasi
            yang Anda butuhkan dengan jelas agar petugas dapat
            menindaklanjutinya.
          </p>
          {ppidUrl ? (
            <Link
              href={ppidUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#246de5] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195bc7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#246de5] focus-visible:ring-offset-2"
            >
              Buka layanan PPID <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          ) : (
            <p className="mt-6 text-sm leading-6 text-muted">
              Tautan layanan PPID belum dicantumkan. Silakan kunjungi situs
              resmi PPID.
            </p>
          )}
        </section>
        <section className="rounded-2xl border border-[#e1eaf1] bg-white p-5 shadow-[0_8px_30px_rgb(24_58_68_/_4%)] sm:p-8">
          <div className="flex items-start gap-3">
            <span className="grid size-12 place-items-center rounded-xl bg-[#e8f1ff] text-[#1d5fa7]">
              <ShieldCheck size={19} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-[#17364f]">
                Kontak {siteConfig.ppidName}
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#526777]">
                Gunakan kontak resmi berikut untuk menghubungi PPID.
              </p>
            </div>
          </div>
          {siteConfig.ppidAddress ? (
            <div className="mt-6 flex items-start gap-3">
              <MapPin
                size={18}
                className="mt-0.5 shrink-0 text-[#246de5]"
                aria-hidden="true"
              />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#607587]">
                  Alamat
                </p>
                <p className="mt-1 text-sm leading-6 text-[#263f52]">
                  {siteConfig.ppidAddress}
                </p>
              </div>
            </div>
          ) : null}
          {siteConfig.ppidEmail ? (
            <div className="mt-5 flex items-start gap-3">
              <Mail
                size={18}
                className="mt-0.5 shrink-0 text-[#246de5]"
                aria-hidden="true"
              />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#607587]">
                  Email resmi
                </p>
                <a
                  className="mt-1 inline-block text-sm font-semibold text-[#174ea6] underline-offset-4 hover:underline"
                  href={`mailto:${siteConfig.ppidEmail}`}
                >
                  {siteConfig.ppidEmail}
                </a>
              </div>
            </div>
          ) : null}
          {siteConfig.ppidPhone ? (
            <div className="mt-5 flex items-start gap-3">
              <Phone
                size={18}
                className="mt-0.5 shrink-0 text-[#246de5]"
                aria-hidden="true"
              />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#607587]">
                  Telepon
                </p>
                <a
                  className="mt-1 inline-block text-sm font-semibold text-[#174ea6]"
                  href={`tel:${siteConfig.ppidPhone.replace(/[^+0-9]/g, "")}`}
                >
                  {siteConfig.ppidPhone}
                </a>
              </div>
            </div>
          ) : null}
          {siteConfig.ppidContactUrl ? (
            <Link
              href={siteConfig.ppidContactUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#174ea6] hover:underline"
            >
              Lihat kontak dan jam layanan{" "}
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          ) : null}
        </section>
      </div>
      {ppidUrl ? (
        <p className="mt-5 text-xs leading-5 text-[#64798a]">
          Informasi kontak bersumber dari{" "}
          <Link
            href={ppidUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            portal resmi {siteConfig.ppidName}
          </Link>
          . Kunjungi situs PPID untuk melihat jam layanan dan informasi kontak
          terbaru.
        </p>
      ) : null}
    </main>
  );
}
