"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ChevronDown, CircleHelp } from "lucide-react";

const GUIDES = {
  dataset: {
    title: "Memahami dan menggunakan dataset",
    body: "Periksa definisi, satuan, cakupan wilayah, periode, perangkat daerah penerbit, lisensi, dan tanggal pemutakhiran sebelum mengolah atau mengutip data. Gunakan pratinjau untuk memeriksa struktur tabel dan unduh berkas sumber untuk analisis lengkap.",
    links: [
      { href: "/api-data", label: "Gunakan API dataset" },
      { href: "/bantuan", label: "Panduan katalog" },
    ],
  },
  organisasi: {
    title: "Menelusuri data menurut perangkat daerah",
    body: "Halaman perangkat daerah menampilkan dataset yang telah dipublikasikan oleh unit pemilik data. Buka dataset untuk memeriksa metadata, periode, sumber, dan berkasnya.",
    links: [
      { href: "/dataset", label: "Buka katalog dataset" },
      { href: "/bantuan", label: "Panduan portal" },
    ],
  },
  statistik: {
    title: "Membaca indikator statistik",
    body: "Perhatikan definisi indikator, satuan, tahun/periode, cakupan wilayah, sumber, serta metodologi sebelum membandingkan nilai. Grafik membantu melihat tren, sedangkan metadata menjelaskan konteks perhitungan.",
    links: [
      { href: "/api-data#indikator", label: "API indikator" },
      { href: "/bantuan", label: "Panduan statistik" },
    ],
  },
  publikasi: {
    title: "Menggunakan dokumen publikasi",
    body: "Periksa instansi penerbit, tanggal terbit, periode, versi, dan catatan pembaruan. Gunakan pratinjau jika tersedia atau unduh berkas resmi untuk membaca keseluruhan dokumen.",
    links: [
      { href: "/dataset", label: "Cari dataset pendukung" },
      { href: "/bantuan", label: "Panduan publikasi" },
    ],
  },
  infografik: {
    title: "Membaca infografik dengan tepat",
    body: "Gunakan judul, periode, satuan, sumber, dan keterangan pada setiap visual. Buka informasi dataset atau publikasi terkait untuk memeriksa angka dan metodologi lebih lengkap.",
    links: [
      { href: "/dataset", label: "Telusuri data sumber" },
      { href: "/bantuan", label: "Panduan portal" },
    ],
  },
  informasi: {
    title: "Menemukan informasi resmi",
    body: "Gunakan kategori dan tanggal publikasi untuk menemukan panduan, kebijakan, serta informasi terbaru. Periksa dokumen sumber atau tautan instansi yang dicantumkan pada halaman.",
    links: [
      { href: "/berita", label: "Berita dan pembaruan" },
      { href: "/bantuan", label: "Pusat bantuan" },
    ],
  },
  berita: {
    title: "Mengikuti berita dan pembaruan",
    body: "Periksa tanggal terbit, kategori, dan rujukan yang menyertai artikel. Untuk angka atau data yang disebutkan, gunakan tautan dataset dan publikasi sumber.",
    links: [
      { href: "/dataset", label: "Telusuri dataset" },
      { href: "/bantuan", label: "Pusat bantuan" },
    ],
  },
  "api-data": {
    title: "Mengakses data melalui API",
    body: "API publik bersifat hanya-baca. Gunakan dokumentasi endpoint, parameter yang diizinkan, batas pagination, dan respons JSON. Detail dataset menyediakan endpoint metadata dan endpoint per resource.",
    links: [
      { href: "/dataset", label: "Pilih dataset" },
      { href: "/bantuan", label: "Pusat bantuan" },
    ],
  },
  default: {
    title: "Panduan menggunakan Portal Satu Data",
    body: "Gunakan menu dan pencarian untuk menemukan dataset, organisasi, publikasi, statistik, dan informasi. Buka detail sebelum mengunduh: periksa deskripsi, sumber, pemilik data, periode, lisensi, dan tanggal pembaruan. Gunakan API bila data perlu diolah secara otomatis.",
    links: [
      { href: "/dataset", label: "Jelajahi dataset" },
      { href: "/api-data", label: "Dokumentasi API" },
      { href: "/bantuan", label: "Pusat bantuan" },
    ],
  },
};

export function PublicContextGuide() {
  const pathname = usePathname() || "/";
  const section = pathname.split("/").filter(Boolean)[0];
  const guide = GUIDES[section] || GUIDES.default;
  if (!section || section === "bantuan") return null;

  return (
    <div className="page-container public-context-guide-wrap">
      <details className="public-context-guide">
        <summary>
          <span className="public-context-guide__icon" aria-hidden="true">
            <BookOpen size={16} />
          </span>
          <span className="public-context-guide__copy">
            <strong>Panduan halaman</strong>
            <small>{guide.title}</small>
          </span>
          <span className="public-context-guide__toggle">
            <CircleHelp size={14} /> Cara menggunakan
          </span>
          <ChevronDown
            size={16}
            className="public-context-guide__chevron"
            aria-hidden="true"
          />
        </summary>
        <div className="public-context-guide__body">
          <p>{guide.body}</p>
          <div className="public-context-guide__links">
            {guide.links.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}
