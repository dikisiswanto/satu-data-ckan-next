# Konten, CMS, dan Media

CKAN adalah sumber tunggal konten, metadata, resource, dan hak akses. Next.js mengambil konten melalui Action API secara server-side; tidak ada database CMS kedua.

## Pages dan Blog

1. Buka menu **Pages** di CKAN Admin.
2. Gunakan **Page** untuk profil, kebijakan, panduan, dan informasi tetap.
3. Gunakan **Blog Article** untuk berita, pengumuman, dan artikel berkala.
4. Isi judul, slug, tanggal terbit, kategori, ringkasan, dan konten Markdown.
5. Atur `Visibility = Public`, simpan, lalu periksa halaman publik.

Konten private dan artikel bertanggal di masa depan tidak masuk ke portal, daftar, atau sitemap. Zona tanggal mengikuti `NEXT_PUBLIC_TIME_ZONE` (default `Asia/Makassar`).

## Field CMS

| Field                                      | Fungsi                                                                      |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| `excerpt`                                  | Ringkasan kartu dan fallback deskripsi SEO                                  |
| `category`, `template_type`                | Kategori dan template (`standard`, `landing`, `policy`, `guide`, `article`) |
| `featured`                                 | Prioritas konten pilihan                                                    |
| `show_in_menu`, `menu_label`, `menu_order` | Visibilitas, label, dan urutan navigasi                                     |
| `seo_title`, `seo_description`, `og_image` | Metadata pencarian dan social sharing                                       |
| `content_blocks`                           | Komponen terstruktur JSON, maksimum 16 blok/80 KB                           |

## Markdown dan gambar editorial

Renderer Markdown mendukung heading, paragraf, format teks, tautan, gambar, daftar bertingkat/tugas, blockquote, tabel, fenced code, dan pemisah. Elemen blok harus dipisahkan baris baru. Contoh:

````markdown
**Tebal** dan _miring_. [Tautan](https://example.com)

- Butir pertama
- Butir kedua

| Kolom 1 | Kolom 2 |
| ------- | ------- |
| Isi A   | Isi B   |

```text
Contoh kode
```

![Contoh kegiatan](/uploads/page_images/kegiatan.webp)
````

Gunakan tombol **Unggah gambar** pada editor. Hanya PNG, JPEG, GIF, dan WebP hingga 8 MiB yang diterima; SVG/HTML tidak disajikan sebagai gambar. File disimpan sebagai File entity CKAN dengan owner `portal_media/public-editorial-media`. URL harus HTTPS atau path media CKAN yang didukung. Next.js memeriksa referensi konten publik, owner, MIME, signature, dan ukuran; jangan membuka FileStore internal untuk akses anonim.

Kartu berita menggunakan gambar Markdown pertama yang valid. `og_image` tetap menjadi gambar Open Graph; gambar Markdown menjadi fallback metadata sosial dan gambar kartu.

## Blok konten terstruktur

`content_blocks` menerima array JSON dengan tipe `hero`, `rich_text`, `image`, `gallery`, `stats`, `dataset_links`, `publication_list`, `cta`, dan `divider`. Blok `stats` adalah ringkasan editorial, bukan query statistik live; `dataset_links` hanya menampilkan dataset yang diverifikasi masih publik.

Contoh:

```json
[
  {
    "type": "hero",
    "title": "Satu Data",
    "description": "Data resmi instansi."
  },
  {
    "type": "dataset_links",
    "title": "Dataset pilihan",
    "items": [{ "slug": "data-sekolah-sample" }]
  }
]
```

## Rute publik

| URL                 | Isi                                          |
| ------------------- | -------------------------------------------- |
| `/informasi`        | Daftar laman dan berita pilihan              |
| `/informasi/[slug]` | Detail laman                                 |
| `/berita`           | Daftar berita dan artikel                    |
| `/berita/[slug]`    | Detail artikel dengan metadata `NewsArticle` |

Footer menampilkan laman bertanda **Tampilkan di menu**, tautan informasi, dan daftar berita.

## Pratinjau gambar (lightbox)

Komponen `src/components/ui/image-lightbox.jsx` membuka gambar pada dialog yang dirender ke `body` agar tidak terpotong `overflow` atau stacking context.

- Klik gambar untuk membuka; klik latar atau tekan `Escape` untuk menutup.
- Zoom `100–500%`, roda mouse, klik ganda, pan, pinch zoom, dan swipe didukung.
- Galeri menyediakan navigasi sebelumnya/berikutnya, thumbnail, dan preload gambar sekitar posisi aktif.
- `+`/`=` dan `-` mengatur zoom; `0` reset; panah kiri/kanan berpindah gambar saat tidak diperbesar.
- Status loading/error terlihat; kegagalan menyediakan tautan sumber asli.
- Dialog mengelola fokus, mengunci scroll, mengembalikan fokus saat ditutup, dan mengumumkan judul/posisi galeri.

Integrasi mencakup resource gambar detail dataset, katalog/detail infografik, blok gambar/galeri CMS, Markdown Pages/Blog, dan sampul informasi/berita. Pratinjau memakai URL media publik yang telah divalidasi; tidak membentuk URL penyimpanan langsung atau melewati otorisasi CKAN.

## Pemisahan katalog publik

Tipe package CKAN tetap `dataset`. `portal_type` hanya mengatur klasifikasi dan penyajian portal; bukan tipe package baru atau penyimpanan terpisah.

Katalog `/dataset` mengecualikan indikator (`portal-indikator`), infografik (`portal-infografik`), dan publikasi (`portal-publikasi`) berdasarkan tag/`extras_portal_type`. Tag mendukung record lama yang belum mempunyai extra. Katalog khusus mengambil sumber berikut:

- `/statistik`: dataset indikator dan resource tabular DataStore.
- `/infografik`: dataset infografik dan resource gambar/PDF.
- `/publikasi`: dataset publikasi/laporan dan resource dokumen.

Tidak ada record yang dihapus, dipindahkan, atau digandakan; permission CKAN dan API native tetap sama.

## Pedoman pemodelan

1. **Indikator/statistik:** gunakan `portal_type=indikator`, tag `portal-indikator`, metadata definisi/satuan/rumus/wilayah/periode, dan resource tabular DataStore.
2. **Infografik:** gunakan `portal_type=infografik` bila visual mempunyai judul, periode, penerbit/atribusi, dan siklus publikasi sendiri. Sertakan sumber dataset. Jika hanya lampiran dataset, simpan sebagai resource dataset.
3. **Publikasi/laporan:** gunakan `portal_type=publikasi` untuk laporan resmi yang memiliki penerbit, tanggal rilis, periode, lisensi, versi, metodologi, dan berkas unduhan. Berita/narasi tetap di Pages/Blog.
4. **Geospasial:** gunakan dataset `portal_type=geospasial`; pratinjau spasial ditampilkan pada detail dataset atau GeoPortal.

## Penerapan dan pemeriksaan

`portal_pages` dan `portal_theme` harus terdaftar sebelum `pages` dan `activity` pada `CKAN__PLUGINS`. Bootstrap mengatur urutan ini agar helper `render_content` portal menggantikan helper `ckanext-pages` tanpa rekursi. Jalankan bootstrap sebelum rebuild CKAN bila memperbarui deployment lama, lalu migrasikan Pages:

```bash
ckan db upgrade -p pages
```

Simpan `.env.ckan` secara privat. Jangan mengaktifkan `ckanext.pages.allow_html` untuk konten editorial publik. Pemeriksaan terkait ada pada `scripts/check-markdown-render.mjs`, `scripts/check-editorial-media.mjs`, `scripts/check-public-media.mjs`, `scripts/check-image-lightbox.mjs`, dan unit/E2E test yang terkait.
