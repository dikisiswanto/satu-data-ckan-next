# Headless CMS — CKAN Pages + Next.js

## Arsitektur

`ckanext-pages` tetap berjalan di CKAN 2.12.1 dan menjadi sumber kebenaran konten serta hak akses. Karena wheel upstream belum menyertakan deklarasi konfigurasi dan berkas migrasi Alembic (issue [#150](https://github.com/ckan/ckanext-pages/issues/150)), `deploy/ckan/install-pages.py` melengkapi metadata package saat build, memverifikasi isi wheel, dan menguji import plugin sebelum image digunakan. Extension lokal `wajo_pages` menambahkan metadata editorial melalui `IPagesSchema`; nilai disimpan sebagai extras CKAN Pages, tanpa tabel CMS kedua. Next.js mengambil konten dari Action API CKAN melalui server component/server utility, kemudian merender seluruh halaman publik dengan komponen portal.

Browser tidak memanggil action Pages secara langsung. Token admin CKAN tidak dipakai maupun dikirim ke browser. Action `ckanext_pages_list` dan `ckanext_pages_show` tidak ditambahkan ke facade `/api/3/action` publik. Daftar anonim CKAN Pages hanya menampilkan konten publik; detail halaman tetap melewati pemeriksaan privacy upstream. Permintaan CMS memakai `no-store` agar perubahan visibilitas tidak tertahan di cache permanen.

## Alur editorial

Kelola konten melalui hostname admin yang ditetapkan pada `CKAN_HOST` (contoh: `https://ckan.silirdev.com` untuk staging atau `https://ckan.wajokab.go.id` untuk produksi):

1. Buka menu **Pages**.
2. Buat **Page** untuk profil, kebijakan, panduan, FAQ, dan halaman informasi permanen.
3. Buat **Blog Article** untuk berita, pengumuman, dan artikel analisis.
4. Pastikan **Visibility = Public** untuk publikasi. Halaman private tidak akan dirender portal.
5. Isi judul, URL/slug, tanggal publikasi (terutama blog), dan konten Markdown. CKAN Pages dipaksa memakai editor Markdown agar isi yang disimpan konsisten dengan renderer Next.js; HTML mentah tidak diaktifkan.
6. Lengkapi field editorial Wajo di bawah form konten. Gunakan tombol **Unggah gambar** untuk memasukkan gambar ke Markdown, mengisi gambar Open Graph, atau menambahkan komponen gambar ke JSON. Simpan, lalu buka URL publik untuk memeriksa hasil.

Halaman yang memiliki tanggal publikasi di masa depan disembunyikan oleh renderer Next.js sampai tanggal tersebut tiba. Tanggal kalender CKAN dibandingkan menggunakan `NEXT_PUBLIC_TIME_ZONE` (default `Asia/Makassar`), termasuk nilai datetime tengah malam yang dikembalikan Action API. Perubahan di CKAN akan terbaca pada request publik berikutnya.

## Field editorial Wajo

| Field             | Fungsi                                                                     |
| ----------------- | -------------------------------------------------------------------------- |
| `excerpt`         | Ringkasan untuk kartu, halaman daftar, dan fallback deskripsi SEO          |
| `category`        | Label kategori konten                                                      |
| `template_type`   | `standard`, `landing`, `policy`, `guide`, atau `article`                   |
| `featured`        | Prioritas pada daftar berita/konten pilihan                                |
| `show_in_menu`    | Memasukkan halaman ke navigasi cepat di pusat Informasi                    |
| `menu_label`      | Label navigasi; default memakai judul                                      |
| `menu_order`      | Urutan navigasi (1–99)                                                     |
| `seo_title`       | Judul SEO (fallback ke judul halaman)                                      |
| `seo_description` | Deskripsi SEO dan social sharing (fallback ke excerpt)                     |
| `og_image`        | URL HTTPS atau gambar yang diunggah ke Pustaka Media CKAN untuk Open Graph |
| `content_blocks`  | JSON array berisi komponen halaman terstruktur                             |

`template_type=landing` dan `guide` menampilkan blok terstruktur sebelum Markdown. `policy` memakai penanda visual dokumen kebijakan. `article` menonjolkan paragraf pembuka. `standard` memakai Markdown lalu blok tambahan.

## Komponen halaman terstruktur

Isi `content_blocks` dengan JSON array. CKAN memvalidasi JSON, ukuran maksimal 80 KB, maksimal 16 item, dan tipe komponen yang dikenal sebelum menyimpan. Tipe yang tersedia:

- `hero`: `eyebrow`, `title`, `description`, `image`, `imageAlt`, `primaryLabel`, `primaryHref`.
- `rich_text`: `title`, `markdown`.
- `image`: `src`, `alt`, `caption`.
- `gallery`: `title`, `items` berisi `src`, `alt`, `caption`.
- `stats`: `title`, `items` berisi `label`, `value`, `unit`, `source`. Angka di sini adalah nilai editorial yang diisi pengelola, bukan query statistik live.
- `dataset_links`: `title`, `items` berisi `slug` (nama dataset CKAN) dan `label`. Dataset diverifikasi lagi sebagai dataset publik sebelum ditampilkan.
- `publication_list`: `title`, `limit` (maksimum 6). Daftar berasal dari paket CKAN bertag publikasi.
- `cta`: `title`, `description`, `label`, `href`.
- `divider`: pemisah konten.

Contoh:

```json
[
  {
    "type": "hero",
    "eyebrow": "Satu Data Wajo",
    "title": "Data untuk keputusan",
    "description": "Temukan data resmi Kabupaten Wajo.",
    "primaryLabel": "Jelajahi dataset",
    "primaryHref": "/dataset"
  },
  {
    "type": "dataset_links",
    "title": "Dataset pilihan",
    "items": [{ "slug": "data-sekolah-wajo", "label": "Lihat dataset sekolah" }]
  },
  {
    "type": "cta",
    "title": "Butuh data lain?",
    "label": "Buka katalog",
    "href": "/dataset"
  }
]
```

HTML bebas dari field Markdown/JSON tidak dieksekusi. Renderer frontend dan pratinjau CKAN mendukung heading, paragraf, tebal/miring/coret, tautan, gambar, daftar berurutan/tidak berurutan/cek, daftar bersarang, blockquote, tabel GFM dengan alignment, code inline/blok, Setext heading, thematic break, dan hard line break. Renderer membatasi panjang konten dan hanya mengizinkan tautan aman (HTTPS, path lokal, mailto/tel sesuai konteks). Ini adalah subset CommonMark/GFM yang dipakai portal, bukan klaim kompatibilitas seluruh ekstensi Markdown pihak ketiga. Nilai statistik di blok `stats` perlu mencantumkan sumber dan periode secara editorial; untuk data hidup gunakan `dataset_links`, halaman statistik, atau indikator CKAN.

## Route publik

| Route               | Konten                                                      |
| ------------------- | ----------------------------------------------------------- |
| `/informasi`        | Hub informasi, navigasi halaman pilihan, dan sorotan berita |
| `/informasi/[slug]` | Halaman Page publik                                         |
| `/berita`           | Arsip Blog Articles                                         |
| `/berita/[slug]`    | Detail artikel berita                                       |

Route detail membangun canonical URL, title/description, Open Graph/Twitter metadata, dan JSON-LD `WebPage`/`NewsArticle`. Route konten ditambahkan ke `robots.txt` dan sitemap dinamis. Konten private dan artikel terjadwal tidak dimasukkan ke daftar atau sitemap.

## Gambar dan keamanan media

Form CKAN Pages memiliki tombol **Unggah gambar** dan pratinjau untuk gambar Open Graph. Pada `content_blocks`, tombol **Unggah gambar dan tambahkan komponen** mengunggah gambar lalu menambahkan blok `image` ke akhir array JSON. Tombol upload memvalidasi JSON terlebih dahulu agar berkas tidak terunggah ketika struktur yang ada masih rusak. Pada editor Markdown, tombol **Unggah gambar** memasukkan sintaks `![teks alternatif](URL)` pada posisi kursor dan pratinjau langsung menampilkan hasilnya.

Unggahan editorial disimpan sebagai File entity CKAN melalui `file_create`, lalu dipindahkan ke owner khusus `wajo_media/public-editorial-media`. Akses publik hanya diberikan untuk owner tersebut melalui `wajo_media_show`; ini tidak membuka file resource atau upload organisasi kepada anonim. Endpoint portal memeriksa owner, ID, MIME, signature raster, dan ukuran sebelum menyajikan gambar. Hanya PNG, JPEG, GIF, serta WebP maksimal 8 MiB yang diterima; SVG tidak diizinkan. FileStore harus persisten dan `ckan.files.owner.cascade_access` harus memuat `wajo_media`.

Logo organisasi dan kategori tetap menggunakan preset Scheming `organization_url_upload` pada field native `image_url`. Semua input file di Wajo Admin memakai kontrol file yang terlihat, label nama file, dan pratinjau lokal untuk gambar yang dipilih. Pratinjau lokal tidak berarti file sudah tersimpan; file baru menjadi permanen setelah form CKAN berhasil disimpan.

Gambar HTTPS eksternal dapat dipakai langsung. Path CKAN Pages `/uploads/page_images/<filename>` dipetakan ke `/api/cms/media/<filename>` di hostname portal. Endpoint media hanya melayani file yang masih direferensikan konten publik terkini, menolak nama file/path traversal, hanya menerima MIME dan signature gambar yang dikenal, membatasi respons 8 MiB, dan mengirim `no-store`/`nosniff`. Tidak ada SVG atau HTML yang disajikan sebagai gambar.

Jika deployment CKAN tidak melayani path `/uploads/page_images/` di origin internal `CKAN_API_INTERNAL_URL`, gambar upload akan gagal dimuat; uji endpoint ini setelah deployment. Gambar HTTPS eksternal tetap dapat digunakan sebagai alternatif. Jangan menyalakan `ckanext.pages.allow_html` untuk konten yang ditulis banyak editor; HTML mentah sengaja tidak dirender Next.js.

## Plugin dan database

`wajo_pages` harus aktif sebelum `pages`, agar schema tambahan diterapkan saat CKAN Pages membangun validator. `wajo_theme` tetap dimuat sesudah plugin yang membawa template agar override form admin Wajo aktif. Bootstrap proyek mengatur urutan ini otomatis. Jalankan migrasi Pages yang sudah disediakan bootstrap/initialize extension (`ckan db upgrade -p pages`) saat deploy awal atau upgrade extension.

Tidak ada database CMS baru. Record, visibility, dan revisi tetap dikelola oleh CKAN Pages. Next.js hanya berfungsi sebagai renderer/headless consumer.
