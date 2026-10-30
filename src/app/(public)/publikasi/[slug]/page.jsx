import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, ArrowUpRight, BookOpen, CalendarDays, Download, FileText } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { getPublicPublicationBySlugResult } from "@/lib/data/public-publications";
import { publicResourceUrl } from "@/lib/ckan/public-resource-url";
import { ckanResourceFormat, ckanResourceName } from "@/lib/ckan/client";
import { ckanResourceExtra } from "@/lib/ckan/public-resource-url";
import { getCanonicalMetadata, getSocialMetadata, siteConfig } from "@/lib/site-config";
import { formatDate, formatBytes } from "@/lib/utils";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const result = await getPublicPublicationBySlugResult(slug);
  if (result.unavailable || !result.data) return { title: "Publikasi tidak tersedia", robots: { index: false, follow: false } };
  const item = result.data;
  return {
    title: item.title,
    description: (item.notes || `Publikasi resmi ${siteConfig.regionName}.`).slice(0, 160),
    ...getCanonicalMetadata(`/publikasi/${item.name}`),
    ...getSocialMetadata({ path: `/publikasi/${item.name}`, title: `${item.title} | ${siteConfig.shortName}`, description: (item.notes || `Publikasi resmi ${siteConfig.regionName}.`).slice(0, 160), type: "article" }),
  };
}

export default async function PublicationDetailPage({ params }) {
  const { slug } = await params;
  const result = await getPublicPublicationBySlugResult(slug);
  if (result.unavailable) {
    await connection();
    return <main className="page-container section-space public-interior-page"><section className="public-empty-panel" role="alert"><h1 className="text-xl font-semibold">Publikasi belum dapat dimuat</h1><p className="mt-3 text-sm text-muted">Katalog CKAN sementara tidak dapat diakses.</p><Link href={`/publikasi/${encodeURIComponent(slug)}`} className="public-empty-action mt-5">Coba lagi</Link></section></main>;
  }
  if (!result.data) notFound();
  const item = result.data;
  const pdfResources = item.resources.filter((resource) => ["pdf"].includes(ckanResourceFormat(resource)) && publicResourceUrl(resource.url));

  return <main className="page-container section-space public-interior-page">
    <Link href="/publikasi" className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-primary"><ArrowLeft size={16} aria-hidden="true" /> Kembali ke publikasi</Link>
    <PageHeading eyebrow={item.category} title={item.title} description={item.notes || "Deskripsi publikasi belum dilengkapi oleh organisasi penerbit."} />
    <div className="mt-7 grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="space-y-5">
        {pdfResources.length ? pdfResources.slice(0, 1).map((resource) => <section key={resource.id} className="overflow-hidden rounded-2xl border border-line bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4"><div className="min-w-0"><h2 className="font-semibold">Pratinjau dokumen</h2><p className="mt-1 text-sm text-muted">{ckanResourceName(resource)}</p></div><a href={publicResourceUrl(resource.url)} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-line px-3 text-sm font-semibold hover:bg-accent"><ArrowUpRight size={15} aria-hidden="true" /> Buka PDF</a></div><iframe title={`Pratinjau ${ckanResourceName(resource)}`} src={publicResourceUrl(resource.url)} className="h-[68vh] min-h-[460px] w-full bg-slate-50" loading="lazy" /></section>) : <section className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-white p-10 text-center"><BookOpen size={34} className="text-muted" aria-hidden="true" /><h2 className="mt-4 text-lg font-semibold">Dokumen belum menyediakan PDF</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted">Gunakan daftar resource untuk membuka berkas sumber yang tersedia. Format dan periode mengikuti metadata CKAN.</p></section>}
        <section className="rounded-2xl border border-line bg-white p-5 sm:p-6"><h2 className="text-lg font-semibold">Resource publikasi</h2><div className="mt-4 divide-y divide-line">{item.resources.map((resource) => { const url = publicResourceUrl(resource.url); return <div key={resource.id} className="flex flex-wrap items-center gap-3 py-4 first:pt-0 last:pb-0"><span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-primary"><FileText size={18} aria-hidden="true" /></span><div className="min-w-0 flex-1"><p className="font-medium">{ckanResourceName(resource)}</p><p className="mt-1 text-xs text-muted">{ckanResourceFormat(resource).toUpperCase() || resource.mimetype || "Berkas"} · {formatBytes(resource.size)}{ckanResourceExtra(resource, "portal_resource_period") ? ` · Periode ${ckanResourceExtra(resource, "portal_resource_period")}` : ""}{ckanResourceExtra(resource, "portal_resource_version") ? ` · Versi ${ckanResourceExtra(resource, "portal_resource_version")}` : ""}</p>{resource.description ? <p className="mt-1 text-sm leading-5 text-muted">{resource.description}</p> : null}</div>{url ? <a href={url} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-semibold hover:bg-accent"><Download size={15} aria-hidden="true" /> Unduh</a> : <span className="text-xs text-muted">URL tidak tersedia</span>}</div>; })}</div></section>
      </section>
      <aside className="space-y-4">
        <section className="rounded-2xl border border-line bg-white p-5"><h2 className="text-base font-semibold">Informasi publikasi</h2><dl className="mt-4 space-y-4 text-sm"><div><dt className="text-muted">Organisasi penerbit</dt><dd className="mt-1 font-medium">{item.organization?.title || item.organization?.name || "Belum dicantumkan"}</dd></div><div><dt className="text-muted">Periode acuan</dt><dd className="mt-1 font-medium">{item.period || "Belum dicantumkan"}</dd></div><div><dt className="text-muted">Tanggal rilis</dt><dd className="mt-1 inline-flex items-center gap-2 font-medium"><CalendarDays size={15} aria-hidden="true" />{item.publicationDate ? formatDate(item.publicationDate) : "Belum dicantumkan"}</dd></div><div><dt className="text-muted">Versi rilis</dt><dd className="mt-1 font-medium">{item.version || "Belum dicantumkan"}</dd></div><div><dt className="text-muted">Metadata CKAN diperbarui</dt><dd className="mt-1 font-medium">{formatDate(item.package.metadata_modified || item.package.metadata_created)}</dd></div><div><dt className="text-muted">Penerbit/atribusi</dt><dd className="mt-1 font-medium">{item.attribution || "Belum dicantumkan"}</dd></div></dl>{item.revisionNote ? <div className="mt-5 rounded-xl bg-amber-50 p-4"><h3 className="text-sm font-semibold text-amber-950">Catatan revisi</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-amber-950">{item.revisionNote}</p></div> : null}{item.methodology ? <div className="mt-5"><h3 className="text-sm font-semibold">Metodologi</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">{item.methodology}</p></div> : null}</section>
        <Link href={`/dataset/${encodeURIComponent(item.name)}`} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold hover:bg-accent">Lihat dataset CKAN <ArrowUpRight size={15} aria-hidden="true" /></Link>
      </aside>
    </div>
  </main>;
}
