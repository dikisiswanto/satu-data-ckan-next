# Konfigurasi Identitas Instansi

## Prinsip

Source code, package CKAN, plugin, blueprint, helper, nama komponen, CSS class, custom property, aset admin, serta header internal memakai namespace generik `portal_*` atau `portal-*`. Nama institusi hanya menjadi data konfigurasi. Prefix extension lama yang perlu dibersihkan saat upgrade diatur melalui `PORTAL_LEGACY_EXTENSION_PREFIXES` di file environment contoh, bukan ditanam pada source code. Satu portal dapat dipakai oleh kabupaten, kota, provinsi, kementerian, atau organisasi lain tanpa mengganti nama modul maupun meng-fork extension.

Identitas instansi dipusatkan pada blok `PORTAL_*` di `.env.ckan`. Nilai bawaan deployment disediakan hanya melalui `.env.ckan.example`. Script `deploy/ckan/sync-env.py` menurunkan nilai Next.js dan CKAN dari blok ini agar label, logo, deskripsi, dan identitas admin/publik tidak berbeda.

## Mengganti instansi

1. Salin `.env.ckan.example` menjadi `.env.ckan`.
2. Ubah `PUBLIC_HOST` dan `CKAN_HOST` menjadi dua hostname berbeda pada zona DNS yang sama. Contoh: `data.instansi.go.id` dan `ckan.instansi.go.id`.
3. Ubah `PORTAL_INSTITUTION_NAME` sesuai instansi tujuan. Source code tidak mengenali nama tenant tertentu dan tidak melakukan penggantian otomatis berdasarkan nama. Karena itu, tinjau seluruh nilai identitas lain dalam blok `PORTAL_*` pada file `.env.ckan` salinan Anda.
4. Untuk identitas final, isi atau tinjau nilai berikut sesuai kebutuhan: `PORTAL_INSTITUTION_SHORT_NAME`, `PORTAL_BRAND_NAME`, `PORTAL_SHORT_NAME`, `PORTAL_ORGANIZATION_NAME`, `PORTAL_SITE_DESCRIPTION`, `PORTAL_PUBLIC_SUBTITLE`, `PORTAL_BRAND_PROFILE`, `PORTAL_LOGO_PATH`, `PORTAL_LOGO_ALT`, `PORTAL_HERO_IMAGE`, `PORTAL_ICON_PATH`, `PORTAL_PWA_ICON_192`, dan `PORTAL_PWA_ICON_512`.
5. Tempatkan file logo/gambar pada direktori aset publik Next.js dan/atau aset publik extension CKAN sesuai pemakaiannya. Pastikan path `PORTAL_LOGO_PATH` dan `PORTAL_HERO_IMAGE` menunjuk ke aset yang benar.
6. Isi kontak dan endpoint PPID milik instansi pada `PORTAL_PPID_NAME`, `PORTAL_PPID_URL`, `PORTAL_PPID_CONTACT_URL`, `PORTAL_PPID_ADDRESS`, `PORTAL_PPID_EMAIL`, dan `PORTAL_PPID_PHONE`. Nilai di `.env.ckan.example` adalah contoh konfigurasi deployment; ganti semua kontak sebelum deployment ke instansi lain.
7. Sesuaikan `CKAN_SYSADMIN_EMAIL`, locale/timezone, map tile, dan kredensial integrasi bila diperlukan.
8. Jalankan bootstrap/build ulang sesuai [Panduan Operasional CKAN](OPERASIONAL-DEPLOYMENT.md). `sync-env.py` dijalankan oleh bootstrap dan wrapper Compose; tidak perlu mengedit nilai turunan `NEXT_PUBLIC_*` atau `CKAN__SITE_*` secara manual.

## Konfigurasi visual dan komponen

`PORTAL_THEME_COLOR` dan `PORTAL_PWA_BACKGROUND_COLOR` mengatur warna tema browser/PWA dengan format heksadesimal enam digit, misalnya `#174566` dan `#f4f6f8`. Komponen dan token CSS tetap generik. Penyesuaian lebih jauh terhadap design system admin dilakukan melalui token `--portal-*` pada `deploy/ckan/theme/ckanext/portal_theme/assets/css/portal-admin-design-system.css` dan `portal-theme.css`, bukan dengan menambahkan class bernama institusi.

Nama CSS/JS, helper Jinja, cookie preferensi, owner media, dan plugin CKAN juga generik. `PORTAL_MEDIA_OWNER_TYPE` (default `portal_media`) serta `PORTAL_MEDIA_OWNER_ID` (default `public-editorial-media`) mengatur pemilik file editorial tanpa menyematkan nama kabupaten/instansi. `PORTAL_LEGACY_EXTENSION_PREFIXES` hanya dipakai saat upgrade untuk menghapus entry point extension lama; kosongkan setelah migrasi selesai.

## Nama extension dan plugin CKAN

Package extension yang dipasang adalah `ckanext-portal-theme`, namespace Python `ckanext.portal_theme`, dan entry point:

- `portal_theme`
- `portal_pages`
- `portal_harvest_i18n`
- `portal_pages_i18n`
- `portal_dcat_i18n`

Konfigurasi extension menggunakan namespace `CKANEXT__PORTAL_THEME__*` / `ckanext.portal_theme.*`. ID teknis tersebut tidak perlu diubah ketika identitas atau nama instansi berubah. Bootstrap memasang ID plugin generik yang ditentukan oleh konfigurasi. Source code tidak membawa alias nama institusi.

## Default yang dipertahankan

`.env.ckan.example` menyediakan konfigurasi awal deployment, termasuk hostname, logo, brand profile, kontak PPID, dan identitas portal. Nilai tersebut hanya berada di file contoh environment. Source code, komponen, static content, dan test guard tidak mengunci nama instansi.
