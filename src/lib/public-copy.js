import { siteConfig } from "@/lib/site-config";

/**
 * Copy used by both public route content and its loading boundary.
 * Keep these strings in one place so text wrapping does not change solely
 * because a fallback and its resolved page use different wording.
 */
export const publicPageCopy = Object.freeze({
  dataset: Object.freeze({
    eyebrow: "Jelajahi data publik",
    title: "Katalog dataset",
    description:
      "Temukan dataset berdasarkan judul, topik, kata kunci, perangkat daerah, tahun, atau format berkas.",
  }),
  infografik: Object.freeze({
    eyebrow: "Data dalam visual",
    title: "Infografik",
    description:
      "Lihat ringkasan data dan informasi daerah dalam bentuk visual yang mudah dipahami.",
  }),
  organisasi: Object.freeze({
    eyebrow: "Penerbit data",
    title: "Perangkat daerah",
    description: `Lihat perangkat daerah yang menerbitkan data ${siteConfig.regionName} dan dataset yang telah tersedia untuk publik.`,
  }),
  publikasi: Object.freeze({
    eyebrow: "Pengetahuan dan analisis",
    title: "Publikasi dan laporan",
    description:
      "Temukan laporan statistik, buku daerah, analisis sektoral, metodologi, dan dokumen resmi dari perangkat daerah.",
  }),
  statistik: Object.freeze({
    eyebrow: "Ringkasan pembangunan",
    title: "Statistik dan indikator",
    description:
      "Jelajahi indikator pembangunan beserta definisi, satuan, periode, sumber, dan nilai terbarunya.",
  }),
  berita: Object.freeze({
    eyebrow: "Kabar daerah dan data",
    title: "Berita dan artikel",
    description: `Ikuti berita, pengumuman, dan artikel resmi dari ${siteConfig.regionName}.`,
  }),
  informasi: Object.freeze({
    eyebrow: "Pusat informasi",
    title: "Informasi",
    description: `Temukan kebijakan, panduan, profil, berita, dan artikel resmi ${siteConfig.regionName}.`,
  }),
});
