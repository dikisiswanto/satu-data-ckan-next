# Administrasi CKAN, CMS, dan Identitas Portal

Dokumen ini mencakup pengelolaan CKAN, penerbitan konten, media editorial, serta konfigurasi identitas portal. CKAN tetap menjadi sumber utama data dan pengelolaan; Next.js menyajikan portal publik.

## Administrasi CKAN

Portal Admin adalah antarmuka pengelolaan CKAN 2.12.1. CKAN tetap menjadi sumber utama data sekaligus menangani autentikasi, otorisasi, validasi, CSRF, unggahan, DataStore, dan alur kerja extension. Next.js menyajikan katalog publik; proyek ini tidak membuat backend CRUD kedua.

### Shell dan dashboard

- **Topbar:** identitas instansi dari konfigurasi, tautan portal publik, profil, pengaturan sysadmin, dan logout yang dilindungi token CSRF.
- **Sidebar:** Ringkasan, Katalog Data, Publikasi Data, Halaman & Informasi, Integrasi Data, Akun Saya, dan Pengaturan Sistem. Menu mengikuti izin CKAN.
- **Area kerja:** konten bawaan CKAN—navigasi lokasi, notifikasi, formulir, toolbar, tabel, tab, dan widget—tetap dirender oleh template CKAN.
- **Footer:** identitas dan versi CKAN selaras dengan topbar. Sidebar dapat diringkas pada layar menengah dan kecil; tabel harus tetap berada dalam area gulirnya agar tidak melebarkan halaman.

Rute dashboard: `/admin/`. Metrik memakai Action API berdasarkan hak akses pengguna: dataset (`package_search`), organisasi (`organization_list`), kategori (`group_list`), dataset milik pengguna, enam dataset terakhir diperbarui, dan tindakan cepat yang hanya muncul bila izin mengizinkan. Kegagalan satu query tidak boleh merusak render dashboard; metrik terkait menampilkan `—`, bukan angka nol palsu.

### Menu dan alur kerja

| Menu                    | Fungsi dan alur utama                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Semua dataset           | Cari/filter → detail → metadata → resource → pratinjau/API                                                       |
| Organisasi              | Kelola organisasi, anggota/peran, dan dataset pemilik                                                            |
| Kategori data           | Kelola kelompok tematik dan hubungkan dataset relevan                                                            |
| Publikasi & laporan     | Dataset `portal-publikasi`; lengkapi penerbit, periode, lisensi, berkas, lalu terbitkan                          |
| Indikator & statistik   | Dataset `portal-indikator`; lengkapi definisi, satuan, metodologi, wilayah, periode, frekuensi, dan data tabular |
| Infografik              | Dataset `portal-infografik`; unggah visual dan cantumkan sumber/periode                                          |
| Halaman portal          | Pages untuk profil, kebijakan, panduan, dan informasi tetap                                                      |
| Berita & blog           | Blog Article untuk berita, pengumuman, dan artikel berkala                                                       |
| Pengambilan data        | CKAN Harvest: sumber → harvester → jadwal/organisasi → pekerjaan → laporan                                       |
| DataStore dan pratinjau | Pemeriksaan plugin/izin, worker XLoader, antrean resource lama, dan verifikasi API                               |

Publikasi, indikator, dan infografik adalah klasifikasi dataset CKAN melalui `portal_type`/tag, bukan modul CRUD terpisah. Pages dan Blog menggunakan rute serta formulir bawaan `ckanext-pages`; tetapkan visibilitas dan tanggal terbit sebelum memeriksa hasilnya di portal.

### Formulir kontekstual dan metadata

Formulir menampilkan kolom sesuai entitas dan `portal_type`, tanpa membuat package type baru:

- Dataset baru default ke `portal_type=dataset`; tautan pintas dapat meneruskan `?portal_type=indikator|infografik|publikasi|geospasial`.
- Kolom lanjutan mengikuti tipe dataset. Resource tetap menggunakan `resource_fields`; `portal_resource_role` menentukan metadata dan saran format.
- Organisasi memakai `organization.yaml`; kategori tematik memakai `group.yaml`. Kelompok tidak memiliki pemilih `portal_type`.
- Kolom yang tidak relevan disembunyikan di browser, bukan dihapus dari schema/record. Tag portal diselaraskan saat tipe berubah, sedangkan tag lain dipertahankan.
- Formulir untuk mengedit data lama menyimpulkan tipe dari tag penemuan bila metadata `portal_type` belum tersedia.

| Tipe       | Metadata tambahan utama                                                            |
| ---------- | ---------------------------------------------------------------------------------- |
| Dataset    | Periode, tanggal, frekuensi, pembaruan, versi, revisi, metodologi, sumber, wilayah |
| Indikator  | Metadata dataset + definisi, satuan, rumus                                         |
| Infografik | Periode acuan, sumber, wilayah, kategori, periode tampil, atribusi                 |
| Publikasi  | Periode acuan, tanggal rilis, versi, revisi, kategori, lisensi/atribusi            |
| Geospasial | Periode, tanggal, frekuensi, versi, metodologi, sumber, wilayah                    |

`dataset_type` CKAN tetap `dataset`; `portal_type` hanyalah metadata portal. Skema Scheming tetap menjadi sumber validasi/penyimpanan, sehingga perubahan ini tidak membutuhkan migrasi database.

### DataStore dari UI

Buka **Integrasi Data → DataStore dan pratinjau** (`/admin/data-preview`). Admin dapat memeriksa konfigurasi, menyalin perintah izin DataStore, memeriksa status dan log worker, lalu mengantrekan hingga 25 resource tabular lama yang publik dan didukung. Antrean melalui antarmuka hanya tersedia untuk sysadmin. Worker berjalan di server; browser hanya menyalin perintah dan tidak menjalankan perintah shell. Pemrosesan ulang resource lama penuh mengikuti [panduan DataStore](DATASTORE-DAN-AKSES.md).

### Rute, host, dan autentikasi

- `CKAN__AUTH__ROUTE_AFTER_LOGIN=portal_admin.index` mengarahkan login sukses ke dashboard.
- Blueprint `portal_admin` memakai prefix `/admin`; jangan menghapus prefix karena middleware root dapat membentuk redirect loop.
- Root `CKAN_HOST` mengarahkan pengguna anonim ke login dan pengguna terautentikasi ke dashboard.
- Host admin meminta login pada seluruh rute admin; Action API tanpa sesi mendapat JSON `401`. Host publik dan host internal tidak ikut dikunci.
- Login hanya mengautentikasi. Permission CRUD tetap ditegakkan CKAN menurut peran dan keanggotaan.

### Lokalisasi

Bahasa Indonesia (`id`) adalah default; English (`en`) tetap tersedia. Bootstrap menegakkan konfigurasi berikut:

```dotenv
CKAN__LOCALE_DEFAULT=id
CKAN__LOCALES_OFFERED="id en"
CKAN__LOCALE_ORDER="id en"
```

Katalog project dipisah menurut domain gettext:

| Domain            | Cakupan                                                      |
| ----------------- | ------------------------------------------------------------ |
| `ckan`            | CKAN core, shell portal, label umum, formulir, dan validasi  |
| `ckanext-harvest` | Sumber, pekerjaan, status, jadwal, dan tindakan Harvest      |
| `ckanext-pages`   | Pages/CMS, formulir, status publikasi, dan tindakan Pages    |
| `ckanext-dcat`    | Metadata DCAT/RDF, penerbit, kontak, lisensi, dan distribusi |

Plugin `ITranslation` mendaftarkan domain extension. Katalog `ckan.po` digabung dengan terjemahan upstream sehingga pesan bawaan yang tidak dimiliki portal tetap ada; katalog extension dikompilasi ke `.mo` saat build. Setelah plugin aktif, `ckan translation js` membangun katalog JavaScript. File `.mo` dan bundle hasil kompilasi adalah artefak build, bukan berkas sumber untuk disimpan di repository.

Aturan pemeliharaan: `msgid` harus sama dengan sumber; `msgstr` tidak boleh kosong/fuzzy; placeholder harus identik; string harus masuk ke domain yang benar; istilah teknis lazim boleh dipertahankan. Setelah upgrade CKAN/extension, ekstrak ulang string dan periksa katalog.

Validasi `python3 scripts/check-id-translations.py` (juga bagian `check-static.sh`) memeriksa empat domain, placeholder, string wajib, merge upstream `.po`/`.mo`, dan hasil kompilasi. Cakupan ini menjamin katalog yang dipelihara project, bukan seluruh teks hard-coded extension pihak ketiga.

### Peta berkas utama

| Lokasi                                                                             | Fungsi                                          |
| ---------------------------------------------------------------------------------- | ----------------------------------------------- |
| `deploy/ckan/theme/ckanext/portal_theme/templates/`                                | Shell, navigasi, dashboard, dan template portal |
| `deploy/ckan/theme/ckanext/portal_theme/assets/css/portal-theme.css`               | Compatibility styling CKAN                      |
| `deploy/ckan/theme/ckanext/portal_theme/assets/css/portal-admin-design-system.css` | Token dan komponen visual admin                 |
| `deploy/ckan/theme/ckanext/portal_theme/plugin.py`                                 | Middleware, blueprint, helper, dan schema Pages |
| `deploy/ckan/theme/setup.py`                                                       | Metadata package dan package-data               |

Template portal didaftarkan satu kali melalui `plugin_template_paths`. Bootstrap menempatkan `portal_theme` sebelum `pages` dan `activity`; urutan ini diperlukan untuk prioritas helper/template CKAN 2.12. Jangan menduplikasi direktori template pada `extra_template_paths`.

### Batas perubahan dan validasi

Jangan mengganti rute/action dataset, resource, organisasi, grup, pengguna, revisi, DataStore, validasi NAVL/Scheming, CSRF, izin, unggah, pesan notifikasi dan kesalahan, atau extension Pages, Harvest, GeoView, DCAT, dan XLoader demi styling. Detail token, layout, dan paritas publik/login/admin ada di [Sistem Desain Portal](DESAIN-DAN-KUALITAS-FRONTEND.md).

```bash
bash scripts/check-static.sh
python3 scripts/check-auth-middleware.py
node scripts/check-admin-forms.mjs
python3 scripts/check-id-translations.py
```

Uji penerimaan melalui browser mencakup login, dashboard, dataset dan resource, organisasi, Pages/Blog, Harvest, DataStore, formulir panjang, izin, filter, menu pilihan, dialog, dan unggahan, serta keyboard dan ukuran layar desktop/tablet/mobile. Rebuild dan diagnostik ada di [Panduan Operasional](OPERASIONAL-DEPLOYMENT.md).

## CMS, Berita, dan Media

CKAN adalah sumber tunggal konten, metadata, resource, dan hak akses. Next.js mengambil konten melalui Action API secara server-side; tidak ada database CMS kedua.

### Pages dan Blog

1. Buka menu **Pages** di CKAN Admin.
2. Gunakan **Page** untuk profil, kebijakan, panduan, dan informasi tetap.
3. Gunakan **Blog Article** untuk berita, pengumuman, dan artikel berkala.
4. Isi judul, slug, tanggal terbit, kategori, ringkasan, dan konten Markdown.
5. Atur `Visibility = Public`, simpan, lalu periksa halaman publik.

Konten private dan artikel bertanggal di masa depan tidak masuk ke portal, daftar, atau sitemap. Zona tanggal mengikuti `NEXT_PUBLIC_TIME_ZONE` (default `Asia/Makassar`).

### Kolom metadata CMS

| Kolom                                      | Fungsi                                                                      |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| `excerpt`                                  | Ringkasan kartu dan fallback deskripsi SEO                                  |
| `category`, `template_type`                | Kategori dan template (`standard`, `landing`, `policy`, `guide`, `article`) |
| `featured`                                 | Prioritas konten pilihan                                                    |
| `show_in_menu`, `menu_label`, `menu_order` | Visibilitas, label, dan urutan navigasi                                     |
| `seo_title`, `seo_description`, `og_image` | Metadata pencarian dan pratinjau tautan di media sosial                     |
| `content_blocks`                           | Komponen terstruktur JSON, maksimum 16 blok/80 KB                           |

### Markdown dan gambar editorial

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

![Contoh kegiatan](/unggahs/page_images/kegiatan.webp)
````

Gunakan tombol **Unggah gambar** pada editor. Hanya PNG, JPEG, GIF, dan WebP hingga 8 MiB yang diterima; SVG/HTML tidak disajikan sebagai gambar. File disimpan sebagai entitas File CKAN dengan owner `portal_media/public-editorial-media`. URL harus HTTPS atau path media CKAN yang didukung. Next.js memeriksa referensi konten publik, owner, MIME, signature, dan ukuran; pembacaan `owner_info` menerima bentuk CKAN 2.12 (`owner_type` + `id`) maupun representasi ORM (`owner_type` + `owner_id`). FileStore internal tidak boleh dibuka langsung untuk akses anonim.

Kartu berita menggunakan gambar Markdown pertama yang valid. `og_image` tetap menjadi gambar Open Graph; gambar Markdown menjadi fallback metadata sosial dan gambar kartu.

### Blok konten terstruktur

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

### Rute publik

| URL                 | Isi                                          |
| ------------------- | -------------------------------------------- |
| `/informasi`        | Daftar laman dan berita pilihan              |
| `/informasi/[slug]` | Detail laman                                 |
| `/berita`           | Daftar berita dan artikel                    |
| `/berita/[slug]`    | Detail artikel dengan metadata `NewsArticle` |

Footer menampilkan laman bertanda **Tampilkan di menu**, tautan informasi, dan daftar berita.

### Pratinjau gambar (lightbox)

Komponen `src/components/ui/image-lightbox.jsx` membuka gambar pada dialog yang dirender ke `body` agar tidak terpotong `overflow` atau stacking context.

- Pilih gambar untuk membuka; pilih area latar atau tekan `Escape` untuk menutup.
- Zoom `100–500%`, roda mouse, klik ganda, pan, pinch zoom, dan swipe didukung.
- Galeri menyediakan navigasi sebelumnya/berikutnya, thumbnail, dan memuat gambar lebih awal sekitar posisi aktif.
- `+`/`=` dan `-` mengatur zoom; `0` reset; panah kiri/kanan berpindah gambar saat tidak diperbesar.
- Status loading/error terlihat; kegagalan menyediakan tautan sumber asli.
- Dialog mengelola fokus, mengunci scroll, mengembalikan fokus saat ditutup, dan mengumumkan judul/posisi galeri.

Integrasi mencakup resource gambar detail dataset, katalog/detail infografik, blok gambar/galeri CMS, Markdown Pages dan Blog, dan sampul informasi/berita. Pratinjau menggunakan URL media publik yang telah divalidasi; tidak membentuk URL penyimpanan langsung atau melewati otorisasi CKAN.

### Pemisahan katalog publik

Tipe package CKAN tetap `dataset`. `portal_type` hanya mengatur klasifikasi dan penyajian portal; bukan tipe package baru atau penyimpanan terpisah.

Katalog `/dataset` mengecualikan indikator (`portal-indikator`), infografik (`portal-infografik`), dan publikasi (`portal-publikasi`) berdasarkan tag/`extras_portal_type`. Tag mendukung record lama yang belum mempunyai extra. Katalog khusus mengambil sumber berikut:

- `/statistik`: dataset indikator dan resource tabular DataStore.
- `/infografik`: dataset infografik dan resource gambar atau PDF.
- `/publikasi`: dataset publikasi/laporan dan resource dokumen.

Tidak ada record yang dihapus, dipindahkan, atau digandakan; permission CKAN dan API native tetap sama.

### Pedoman pemodelan

1. **Indikator/statistik:** gunakan `portal_type=indikator`, tag `portal-indikator`, metadata definisi/satuan/rumus/wilayah/periode, dan resource tabular DataStore.
2. **Infografik:** gunakan `portal_type=infografik` bila visual mempunyai judul, periode, penerbit/atribusi, dan siklus publikasi sendiri. Sertakan sumber dataset. Jika hanya lampiran dataset, simpan sebagai resource dataset.
3. **Publikasi/laporan:** gunakan `portal_type=publikasi` untuk laporan resmi yang memiliki penerbit, tanggal rilis, periode, lisensi, versi, metodologi, dan berkas unduhan. Berita/narasi tetap di Pages dan Blog.
4. **Geospasial:** gunakan dataset `portal_type=geospasial`; pratinjau spasial ditampilkan pada detail dataset atau GeoPortal.

### Penerapan dan pemeriksaan

`portal_pages` dan `portal_theme` harus terdaftar sebelum `pages` dan `activity` pada `CKAN__PLUGINS`. Bootstrap mengatur urutan ini agar helper `render_content` portal menggantikan helper `ckanext-pages` tanpa rekursi. Jalankan bootstrap sebelum rebuild CKAN bila memperbarui deployment lama, lalu migrasikan Pages:

```bash
ckan db upgrade -p pages
```

Simpan `.env.ckan` secara privat. Jangan mengaktifkan `ckanext.pages.allow_html` untuk konten editorial publik. Pemeriksaan terkait ada pada `scripts/check-markdown-render.mjs`, `scripts/check-editorial-media.mjs`, `scripts/check-public-media.mjs`, `scripts/check-image-lightbox.mjs`, dan unit/E2E test yang terkait.

## Identitas dan Konfigurasi Instansi

### Prinsip

Kode sumber, package CKAN, plugin, blueprint, helper, nama komponen, CSS class, properti CSS kustom, aset admin, serta header internal memakai namespace generik `portal_*` atau `portal-*`. Nama institusi hanya menjadi data konfigurasi. Prefix extension lama yang perlu dibersihkan saat upgrade diatur melalui `PORTAL_LEGACY_EXTENSION_PREFIXES` di file contoh environment, bukan ditanam pada kode sumber. Satu portal dapat dipakai oleh kabupaten, kota, provinsi, kementerian, atau organisasi lain tanpa mengganti nama modul maupun membuat fork extension.

Identitas instansi dipusatkan pada blok `PORTAL_*` di `.env.ckan`. Nilai bawaan deployment disediakan hanya melalui `.env.ckan.example`. Script `deploy/ckan/sync-env.py` menurunkan nilai Next.js dan CKAN dari blok ini agar label, logo, deskripsi, dan identitas admin/publik tidak berbeda.

### Mengganti instansi

1. Salin `.env.ckan.example` menjadi `.env.ckan`.
2. Ubah `PUBLIC_HOST` dan `CKAN_HOST` menjadi dua hostname berbeda pada zona DNS yang sama. Contoh: `data.instansi.go.id` dan `ckan.instansi.go.id`.
3. Ubah `PORTAL_INSTITUTION_NAME` sesuai instansi tujuan. Kode sumber tidak mengenali nama tenant tertentu dan tidak melakukan penggantian otomatis berdasarkan nama. Karena itu, tinjau seluruh nilai identitas lain pada blok `PORTAL_*` pada file `.env.ckan` salinan Anda.
4. Untuk identitas final, isi atau tinjau nilai berikut sesuai kebutuhan: `PORTAL_INSTITUTION_SHORT_NAME`, `PORTAL_BRAND_NAME`, `PORTAL_SHORT_NAME`, `PORTAL_ORGANIZATION_NAME`, `PORTAL_SITE_DESCRIPTION`, `PORTAL_PUBLIC_SUBTITLE`, `PORTAL_BRAND_PROFILE`, `PORTAL_LOGO_PATH`, `PORTAL_LOGO_ALT`, `PORTAL_HERO_IMAGE`, `PORTAL_HERO_MAP_IMAGE`, `PORTAL_ICON_PATH`, `PORTAL_PWA_ICON_192`, dan `PORTAL_PWA_ICON_512`.
5. Tempatkan file logo/gambar pada direktori aset publik Next.js dan/atau aset publik extension CKAN sesuai pemakaiannya. Pastikan path `PORTAL_LOGO_PATH`, `PORTAL_HERO_IMAGE`, dan `PORTAL_HERO_MAP_IMAGE` menunjuk ke aset yang benar.
6. Isi kontak dan alamat layanan PPID milik instansi pada `PORTAL_PPID_NAME`, `PORTAL_PPID_URL`, `PORTAL_PPID_CONTACT_URL`, `PORTAL_PPID_ADDRESS`, `PORTAL_PPID_EMAIL`, dan `PORTAL_PPID_PHONE`. Nilai di `.env.ckan.example` adalah contoh konfigurasi deployment; ganti semua kontak sebelum deployment ke instansi lain.
7. Sesuaikan `CKAN_SYSADMIN_EMAIL`, locale/timezone, map tile, dan kredensial integrasi bila diperlukan.
8. Jalankan bootstrap/build ulang sesuai [Panduan Operasional CKAN](OPERASIONAL-DEPLOYMENT.md). `sync-env.py` dijalankan oleh bootstrap dan wrapper Compose; tidak perlu mengedit nilai turunan `NEXT_PUBLIC_*` atau `CKAN__SITE_*` secara manual.

### Konfigurasi visual dan komponen

`PORTAL_THEME_COLOR` dan `PORTAL_PWA_BACKGROUND_COLOR` mengatur warna tema browser/PWA dengan format heksadesimal enam digit, misalnya `#174566` dan `#f4f6f8`. Komponen dan token CSS tetap generik. Penyesuaian lebih jauh terhadap design system admin dilakukan melalui token `--portal-*` pada `deploy/ckan/theme/ckanext/portal_theme/assets/css/portal-admin-design-system.css` dan `portal-theme.css`, bukan dengan menambahkan class bernama institusi.

Nama CSS/JS, helper Jinja, cookie preferensi, owner media, dan plugin CKAN juga generik. `PORTAL_MEDIA_OWNER_TYPE` (default `portal_media`) serta `PORTAL_MEDIA_OWNER_ID` (default `public-editorial-media`) mengatur pemilik file editorial tanpa menyematkan nama kabupaten/instansi. `PORTAL_LEGACY_EXTENSION_PREFIXES` hanya dipakai saat upgrade untuk menghapus entry point extension lama; kosongkan setelah migrasi selesai.

### Nama extension dan plugin CKAN

Package extension yang dipasang adalah `ckanext-portal-theme`, namespace Python `ckanext.portal_theme`, dan entry point:

- `portal_theme`
- `portal_pages`
- `portal_harvest_i18n`
- `portal_pages_i18n`
- `portal_dcat_i18n`

Konfigurasi extension menggunakan namespace `CKANEXT__PORTAL_THEME__*` / `ckanext.portal_theme.*`. ID teknis tersebut tidak perlu diubah ketika identitas atau nama instansi berubah. Bootstrap memasang ID plugin generik yang ditentukan oleh konfigurasi. Kode sumber tidak membawa alias nama institusi.

### Default yang dipertahankan

`.env.ckan.example` menyediakan konfigurasi awal deployment, termasuk hostname, logo, profil identitas portal, kontak PPID, dan identitas portal. Nilai tersebut hanya berada di file contoh environment. Kode sumber, komponen, konten statis, dan pemeriksaan regresi tidak mengunci nama instansi.
