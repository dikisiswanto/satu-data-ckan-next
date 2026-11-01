# CMS Publik

CKAN Pages adalah sumber konten dan hak akses. Next.js mengambil konten melalui Action API secara server-side dan merender halaman publik. Tidak ada database CMS kedua.

## Publikasi

1. Buka **Pages** di CKAN Admin.
2. Gunakan **Page** untuk informasi, profil, kebijakan, dan panduan.
3. Gunakan **Blog Article** untuk berita dan artikel.
4. Isi judul, slug, tanggal terbit, kategori, serta konten Markdown.
5. Atur **Visibility = Public**, simpan, lalu periksa halaman portal.

Konten private dan artikel bertanggal di masa depan tidak ditampilkan pada portal, daftar, atau sitemap. Tanggal kalender mengikuti `NEXT_PUBLIC_TIME_ZONE` (default `Asia/Makassar`).

## Field tambahan

| Field                          | Fungsi                                                   |
| ------------------------------ | -------------------------------------------------------- |
| `excerpt`                      | Ringkasan kartu dan fallback deskripsi SEO               |
| `category`                     | Kategori konten                                          |
| `template_type`                | `standard`, `landing`, `policy`, `guide`, `article`      |
| `featured`                     | Prioritas berita/konten pilihan                          |
| `show_in_menu`                 | Tampilkan laman pada navigasi CMS dan footer             |
| `menu_label`, `menu_order`     | Label dan urutan tautan                                  |
| `seo_title`, `seo_description` | Metadata pencarian dan social sharing                    |
| `og_image`                     | Gambar Open Graph                                        |
| `content_blocks`               | Komponen halaman terstruktur (JSON, maks. 16 blok/80 KB) |

## Konten dan gambar

CKAN Pages memakai Markdown. HTML mentah tidak dirender. Renderer mendukung heading, paragraf, format teks bertingkat (termasuk `~~*teks*~~`), tautan, gambar, daftar bersarang, daftar tugas `[ ]`/`[x]`, blockquote, tabel, fenced code, dan pemisah.

Elemen blok seperti daftar, blockquote, tabel, code block, dan pemisah harus dipisahkan dengan baris baru. Setiap butir daftar harus berada pada barisnya sendiri; tabel harus memiliki baris pemisah kolom. Contoh:

````markdown
**Tebal** dan _miring_ serta ~~_miring dicoret_~~. [Tautan](https://example.com)

- Butir pertama
- Butir kedua
  - Butir bertingkat

1. Langkah pertama
2. Langkah kedua

- [ ] Belum selesai
- [x] Sudah selesai

> Ini kutipan.

| Kolom 1 | Kolom 2 |
| ------- | ------- |
| Isi A   | Isi B   |

```text
Contoh kode
Baris kedua
```

---
````

Untuk menyisipkan foto di artikel, gunakan gambar Markdown:

```markdown
![Kegiatan di Kabupaten Wajo](/uploads/page_images/kegiatan.webp)
```

Kartu berita mengambil gambar Markdown pertama. Jika artikel tidak memiliki gambar Markdown yang valid, kartu menampilkan ikon artikel bawaan. `og_image` tetap digunakan untuk Open Graph; gambar Markdown menjadi fallback metadata sosial.

Gunakan tombol **Unggah gambar** pada editor Markdown. File disimpan sebagai File entity CKAN dengan owner `wajo_media/public-editorial-media`. Hanya PNG, JPEG, GIF, dan WebP hingga 8 MiB yang diterima. SVG/HTML tidak disajikan sebagai gambar.

URL gambar harus HTTPS atau path media CKAN yang didukung. Next.js memeriksa referensi konten publik, owner, MIME, signature, dan ukuran sebelum menyajikan media. Jangan membuka seluruh FileStore untuk akses anonim.

## Blok konten (content blocks)

`content_blocks` menerima array JSON dengan tipe:

- `hero`: judul, deskripsi, gambar, dan CTA.
- `rich_text`: Markdown tambahan.
- `image`, `gallery`: gambar dan caption.
- `stats`: ringkasan editorial; bukan query statistik live.
- `dataset_links`: dataset yang diverifikasi masih publik.
- `publication_list`: daftar publikasi CKAN.
- `cta`, `divider`: ajakan dan pemisah.

Contoh singkat:

```json
[
  {
    "type": "hero",
    "title": "Satu Data Wajo",
    "description": "Data resmi Kabupaten Wajo."
  },
  {
    "type": "dataset_links",
    "title": "Dataset pilihan",
    "items": [{ "slug": "data-sekolah-wajo" }]
  }
]
```

## Halaman publik

| URL                 | Isi                                       |
| ------------------- | ----------------------------------------- |
| `/informasi`        | Daftar laman dan berita pilihan           |
| `/informasi/[slug]` | Detail laman                              |
| `/berita`           | Daftar berita dan artikel                 |
| `/berita/[slug]`    | Detail artikel dan metadata `NewsArticle` |

Footer menampilkan tautan laman yang ditandai **Tampilkan di menu**, tautan `/informasi`, dan daftar `/berita`.

## Penerapan

`wajo_pages` dan `wajo_theme` harus terdaftar sebelum `pages` dan `activity` pada `CKAN__PLUGINS`. CKAN 2.12 membalik urutan iterasi `IConfigurer` dan `ITemplateHelpers`; karena itu plugin yang lebih awal memiliki prioritas helper dan template. Urutan ini wajib agar helper `render_content` Wajo menggantikan helper bawaan `ckanext-pages` dan template Wajo mewarisi shell Midnight Blue tanpa rekursi. Bootstrap mengatur urutan plugin secara kanonis; jalankan ulang `bootstrap-upstream.sh` sebelum rebuild CKAN bila memperbarui penerapan lama. Jalankan migrasi awal/upgrade Pages melalui:

```bash
ckan db upgrade -p pages
```

Simpan `.env.ckan` secara privat. Jangan mengaktifkan `ckanext.pages.allow_html` untuk konten editorial publik.

## Rujukan terkait

- [Lokalisasi admin CKAN](LOKALISASI-ADMIN-CKAN.md)
- [Panduan Wajo Admin](PANDUAN-ADMIN-WAJO.md)
- [Indeks dokumentasi](INDEX.md)
