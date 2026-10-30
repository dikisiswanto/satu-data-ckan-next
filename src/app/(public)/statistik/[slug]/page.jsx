import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, ArrowUpRight, Database, Info } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { IndicatorTrendChart } from "@/components/indicator-trend-chart";
import { getPublicIndicatorBySlugResult } from "@/lib/data/public-indicators";
import { getCanonicalMetadata, getSocialMetadata, siteConfig } from "@/lib/site-config";
import { formatDate } from "@/lib/utils";
import { publicResourceUrl } from "@/lib/ckan/public-resource-url";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const result = await getPublicIndicatorBySlugResult(slug);
  if (result.unavailable) return { title: "Indikator belum dapat dimuat", robots: { index: false, follow: false } };
  if (!result.data) return { title: "Indikator tidak ditemukan", robots: { index: false, follow: false } };
  const indicator = result.data;
  return {
    title: indicator.title,
    description: (indicator.metadata.definition || indicator.notes || `Indikator statistik ${siteConfig.regionName}.`).slice(0, 160),
    ...getCanonicalMetadata(`/statistik/${indicator.name}`),
    ...getSocialMetadata({ path: `/statistik/${indicator.name}`, title: `${indicator.title} | ${siteConfig.shortName}`, description: (indicator.metadata.definition || indicator.notes || `Indikator statistik ${siteConfig.regionName}.`).slice(0, 160), type: "article" }),
  };
}

export default async function IndicatorDetailPage({ params }) {
  const { slug } = await params;
  const result = await getPublicIndicatorBySlugResult(slug);
  if (result.unavailable) {
    await connection();
    return <main className="page-container section-space public-interior-page"><section className="public-empty-panel" role="alert"><h1 className="text-xl font-semibold">Indikator belum dapat dimuat</h1><p className="mt-3 text-sm leading-6 text-muted">Katalog CKAN sedang tidak dapat diakses. Coba lagi beberapa saat lagi.</p><Link href={`/statistik/${encodeURIComponent(slug)}`} className="public-empty-action mt-5">Coba lagi</Link></section></main>;
  }
  if (!result.data) notFound();
  const indicator = result.data;
  const resourceUrl = publicResourceUrl(indicator.resource?.url);
  const observations = indicator.observations || [];
  const visibleRows = [...observations].reverse().slice(0, 100);

  return (
    <main className="page-container section-space public-interior-page">
      <Link href="/statistik" className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-primary"><ArrowLeft size={16} aria-hidden="true" /> Kembali ke statistik</Link>
      <PageHeading eyebrow="Indikator statistik" title={indicator.title} description={indicator.metadata.definition} />

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Satuan", indicator.metadata.unit],
          ["Periode acuan", indicator.metadata.referencePeriod || observations.at(-1)?.period || "Belum dicantumkan"],
          ["Frekuensi", indicator.metadata.periodicity || "Belum dicantumkan"],
          ["Cakupan", indicator.metadata.geography],
        ].map(([label, value]) => <div key={label} className="rounded-xl border border-line bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p><p className="mt-2 text-sm font-semibold leading-6">{value || "Belum dicantumkan"}</p></div>)}
      </div>

      <div className="mt-7 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <IndicatorTrendChart observations={observations} title={indicator.title} unit={indicator.metadata.unit} />
          <section className="overflow-hidden rounded-2xl border border-line bg-white">
            <div className="border-b border-line p-5"><h2 className="text-lg font-semibold">Riwayat nilai</h2><p className="mt-1 text-sm text-muted">{Number(indicator.totalObservations || 0).toLocaleString("id-ID")} baris tersedia pada DataStore. Tabel menampilkan maksimum 100 baris terbaru.</p></div>
            {visibleRows.length ? <div className="overflow-x-auto"><table className="w-full border-collapse text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Periode</th><th className="px-4 py-3">Wilayah</th><th className="px-4 py-3 text-right">Nilai</th><th className="px-4 py-3">Satuan</th></tr></thead><tbody>{visibleRows.map((row, index) => <tr key={`${row.id}-${index}`} className="border-t border-line"><td className="px-4 py-3">{row.period}</td><td className="px-4 py-3">{row.region}</td><td className="px-4 py-3 text-right tabular-nums">{row.value === null ? "—" : row.numericValue === null ? String(row.value) : new Intl.NumberFormat("id-ID", { maximumFractionDigits: 4 }).format(row.numericValue)}</td><td className="px-4 py-3">{row.unit || indicator.metadata.unit}</td></tr>)}</tbody></table></div> : <div className="p-6 text-sm leading-6 text-muted">Belum ada baris observasi yang tersedia. Pastikan resource indikator sudah diaktifkan pada CKAN DataStore dan menggunakan kolom <code>period</code>, <code>region</code>, dan <code>value</code>.</div>}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-line bg-white p-5">
            <h2 className="text-base font-semibold">Metodologi dan sumber</h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div><dt className="text-muted">Sumber data</dt><dd className="mt-1 font-medium">{indicator.metadata.source || "Sumber belum dicantumkan"}</dd></div>
              {indicator.metadata.formula ? <div><dt className="text-muted">Rumus</dt><dd className="mt-1 leading-6">{indicator.metadata.formula}</dd></div> : null}
              <div><dt className="text-muted">Metadata CKAN diperbarui</dt><dd className="mt-1 font-medium">{formatDate(indicator.package.metadata_modified || indicator.package.metadata_created)}</dd></div>
              <div><dt className="text-muted">Identitas dataset</dt><dd className="mt-1 break-all font-mono text-xs">{indicator.name}</dd></div>
            </dl>
            {(indicator.metadata.dataStart || indicator.metadata.dataEnd || indicator.metadata.updateFrequency) ? <div className="mt-5 border-t border-line pt-4"><h3 className="text-sm font-semibold">Cakupan dan pemutakhiran</h3><dl className="mt-3 space-y-3 text-sm">{(indicator.metadata.dataStart || indicator.metadata.dataEnd) ? <div><dt className="text-muted">Rentang periode</dt><dd className="mt-1 font-medium">{indicator.metadata.dataStart || "Awal tidak dicantumkan"} — {indicator.metadata.dataEnd || "Akhir tidak dicantumkan"}</dd></div> : null}{indicator.metadata.updateFrequency ? <div><dt className="text-muted">Jadwal pemutakhiran</dt><dd className="mt-1 font-medium">{indicator.metadata.updateFrequency}</dd></div> : null}</dl></div> : null}
            {indicator.metadata.methodology ? <div className="mt-5 border-t border-line pt-4"><h3 className="text-sm font-semibold">Metodologi</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">{indicator.metadata.methodology}</p></div> : null}
            {indicator.metadata.revisionNote ? <div className="mt-5 rounded-xl bg-amber-50 p-4"><h3 className="text-sm font-semibold text-amber-950">Catatan revisi/rilis</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-amber-950">{indicator.metadata.revisionNote}</p></div> : null}
            {resourceUrl ? <a href={resourceUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Unduh resource sumber <ArrowUpRight size={15} aria-hidden="true" /></a> : null}
            <Link href={`/dataset/${indicator.name}`} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-semibold hover:bg-accent">Buka metadata dataset <ArrowUpRight size={15} aria-hidden="true" /></Link>
          </section>
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950"><Info size={17} className="mb-2" aria-hidden="true" /><p>Nilai dan grafik diambil langsung dari resource DataStore yang terhubung dengan dataset CKAN ini. Pastikan periode, definisi, dan metode perhitungan diperiksa sebelum digunakan untuk keputusan.</p></div>
        </aside>
      </div>
    </main>
  );
}
