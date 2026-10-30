# Portal Satu Data Kabupaten Wajo

Portal data publik Kabupaten Wajo dengan **Next.js** sebagai frontend dan **CKAN 2.12.1** sebagai backend katalog. CKAN menyimpan metadata, organisasi, dataset, resource, DataStore, pengguna, dan konten CMS. Next.js menyediakan katalog, pencarian, statistik, infografik, publikasi, halaman informasi, dan API baca.

## Domain dan layanan

| Domain               | Layanan       | Tujuan                                                     |
| -------------------- | ------------- | ---------------------------------------------------------- |
| `data.wajokab.go.id` | Portal publik | Next.js, katalog, statistik, publikasi, dan API baca       |
| `ckan.wajokab.go.id` | Administrasi  | Login dan seluruh antarmuka CKAN; respons diberi `noindex` |

Hostname admin menggunakan `ckan.wajokab.go.id`, satu tingkat di bawah domain utama agar tercakup oleh Cloudflare Universal SSL standar pada Full DNS Setup. `CKAN_HOST` dapat diganti melalui `.env.ckan`; URL Portal Pengelola dan routing Caddy diselaraskan saat bootstrap/build. Detail migrasi staging dan TLS tersedia di [`deploy/ckan/README.md`](deploy/ckan/README.md).

API publik tersedia melalui `https://data.wajokab.go.id/api/3/action/*`. API facade hanya meneruskan action baca yang diizinkan. Hostname API terpisah tidak diperlukan.

## Persyaratan

- Docker Engine dan Docker Compose v2
- Git
- Python 3
- Akses keluar ke GitHub dan container registry
- Cloudflare Tunnel token untuk deployment dengan profil `cloudflare`

## Instalasi dan deployment

Salin konfigurasi awal, lalu sesuaikan hostname, token Tunnel, branding, dan alamat email sysadmin:

```bash
cp .env.ckan.example .env.ckan
nano .env.ckan
bash ./deploy/ckan/bootstrap-upstream.sh
```

Bootstrap menyiapkan dua repository resmi dengan fungsi berbeda:

- `ckan/ckan-docker` menyediakan Docker Compose dan service pendukung.
- `ckan/ckan-docker-base` menyediakan source image runtime CKAN.

Versi pada `ckan-2.12/VERSION.txt` wajib `2.12.1`. Sebelum Compose dijalankan, source base image dibangun dan diverifikasi sebagai `ckan/ckan-base:2.12.1`. Image aplikasi kemudian memasang extension CKAN, schema metadata, CMS, dan theme admin Wajo.

Pilih satu profil ingress. Untuk Cloudflare Tunnel:

```bash
bash ./deploy/ckan/compose.sh cloudflare config -q
bash ./deploy/ckan/compose.sh cloudflare up -d --build
```

Untuk DNS langsung dengan Caddy:

```bash
bash ./deploy/ckan/compose.sh manual config -q
bash ./deploy/ckan/compose.sh manual up -d --build
```

Jangan jalankan profil `manual`, `cloudflare`, dan `cloudflare-access` bersamaan pada satu deployment.

Setelah CKAN sehat, konfigurasi DataStore dan XLoader:

```bash
bash ./deploy/ckan/apply-datastore-permissions.sh
bash ./deploy/ckan/enable-xloader.sh cloudflare
```

Ganti argumen `cloudflare` menjadi `manual` jika memakai ingress langsung. Perintah operasional lainnya tersedia di [`deploy/ckan/README.md`](deploy/ckan/README.md).

## Akun sysadmin awal

Pada provisioning pertama, CKAN Docker membuat akun sysadmin dari variabel `CKAN_SYSADMIN_NAME`, `CKAN_SYSADMIN_PASSWORD`, dan `CKAN_SYSADMIN_EMAIL`. Konfigurasi proyek menetapkan username awal `ckan_admin`. Bootstrap mengganti penanda password dengan nilai acak 64 karakter heksadesimal sebelum container pertama dijalankan.

Password tidak dicetak ke log. Nilainya disimpan di `.env.ckan`, file yang dibatasi dengan permission `600`:

```bash
grep -E '^CKAN_SYSADMIN_(NAME|PASSWORD|EMAIL)=' .env.ckan
```

Ganti `CKAN_SYSADMIN_EMAIL` dengan mailbox yang benar-benar dikelola sebelum provisioning pertama. Jangan mengunggah `.env.ckan`, mengirim password melalui issue, atau memasukkannya ke repository.

Jika database CKAN sudah pernah diinisialisasi, perubahan `CKAN_SYSADMIN_PASSWORD` di `.env.ckan` tidak otomatis mengganti password akun yang tersimpan di database. Reset password melalui CLI CKAN:

```bash
bash ./deploy/ckan/compose.sh cloudflare exec ckan ckan user setpass ckan_admin
```

CKAN akan meminta password baru. Dokumentasi CLI resmi: [CKAN 2.12.1 — User management](https://docs.ckan.org/en/2.12/maintaining/cli.html).

## Integrasi Satu Data Indonesia dan Harvest

Portal SDI Pusat melakukan harvesting terhadap katalog instansi. Dalam alur tersebut, Sekretariat SDI Pusat membuat harvest source pada portal pusat untuk mengambil metadata dari Portal Data Instansi. Portal Wajo perlu menyediakan katalog CKAN/API yang dapat dijangkau dan mengikuti persyaratan integrasi; instalasi `ckanext-harvest` di Wajo bukan syarat agar katalog Wajo dapat dipanen oleh pusat. Dokumen kebijakan tersebut menjelaskan alur harvesting oleh Sekretariat Pusat, tetapi tidak menyebut nama package atau versi extension yang dipakai pada server pusat. Karena itu, penggunaan package GitHub yang sama di pusat tidak dapat dipastikan hanya dari dokumen tersebut.

`ckanext-harvest` versi `1.6.3` juga dipasang dan diaktifkan pada CKAN Wajo untuk kebutuhan **harvesting dari sisi Wajo**: mengimpor atau menyinkronkan katalog CKAN/DCAT dari sumber lain, misalnya portal OPD atau katalog sektoral. Plugin `harvest` dan `ckan_harvester` serta worker `harvest-gather` dan `harvest-fetch` disediakan untuk kebutuhan tersebut. Tanpa harvest source yang dibuat dan diaktifkan, worker tidak menarik katalog apa pun.

Untuk integrasi dengan SDI Pusat, gunakan endpoint katalog/API publik pada `PUBLIC_HOST`. `CKAN_HOST` adalah antarmuka administrasi privat: seluruh halaman dan API di host ini mewajibkan login CKAN, sementara Next.js menyediakan facade API publik read-only dan route ekspor/unduhan publik tertentu.

Fungsi extension:

| Extension            | Fungsi                                      |
| -------------------- | ------------------------------------------- |
| `ckanext-scheming`   | Skema metadata dataset dan resource         |
| `ckanext-pages`      | CMS halaman dan artikel untuk Next.js       |
| `ckanext-dcat`       | Ekspor metadata DCAT/RDF dan integrasi DCAT |
| `ckanext-harvest`    | Impor katalog jarak jauh ke CKAN Wajo       |
| `ckanext-geoview`    | Preview resource geospasial di CKAN Admin   |
| `ckanext-xloader`    | Memuat resource tabular ke DataStore        |
| `ckanext-wajo-theme` | Branding dan layout CKAN Admin              |

Dokumen kebijakan integrasi Portal SDI menjelaskan peran Sekretariat SDI Pusat dalam membuat harvest source untuk Portal Data Instansi dan merekomendasikan antarmuka CKAN. Referensi operasional extension: [ckanext-harvest](https://github.com/ckan/ckanext-harvest).

## CMS publik

`ckanext-pages` menjadi sumber konten di CKAN Admin. Extension lokal `wajo_pages` menambahkan metadata editorial dan content blocks. Next.js mengambil `ckanext_pages_list` dan `ckanext_pages_show` dari jaringan internal secara server-side, lalu merender halaman informasi, berita, SEO, dan sitemap.

Route publik CMS:

- `/informasi` dan `/informasi/[slug]`
- `/berita` dan `/berita/[slug]`

Panduan field, template, komponen, media, keamanan, dan alur publikasi tersedia di [`docs/CMS.md`](docs/CMS.md).

Halaman detail dataset publik menyediakan endpoint API per dataset (`package_show`), per resource (`resource_show`), dan isi tabel DataStore (`datastore_search`). Untuk CSV/TSV lokal yang belum selesai diindeks XLoader, tersedia pratinjau sementara dengan batas ukuran/baris; pratinjau penuh tetap memakai DataStore. Halaman katalog, organisasi, statistik, publikasi, infografik, informasi, berita, API, dan route publik lain menyediakan panduan kontekstual yang relevan.

## Wajo Admin — antarmuka administrasi CKAN

CKAN 2.12.1 tetap menjadi backend katalog, autentikasi, otorisasi, CRUD, DataStore, dan extension. Antarmuka administrasinya menggunakan **Wajo Admin**, custom application shell pada extension lokal `ckanext-wajo-theme`:

- Topbar dengan identitas Kabupaten Wajo, tautan portal publik, profil pengguna, pengaturan sistem, dan logout ber-CSRF.
- Sidebar responsif dengan navigasi Ringkasan, Dataset, Organisasi, Kategori data, Pages, Harvesting, dashboard pribadi, Pengguna, dan Pengaturan CKAN. Menu sensitif ditampilkan sesuai role/permission.
- Ringkasan khusus di `/admin/` dengan metrik yang diambil dari CKAN Action API menggunakan identitas pengguna yang sedang login, daftar dataset terbaru, dan akses cepat berdasarkan permission.
- Bahasa Indonesia menjadi default CKAN Admin. Katalog terjemahan dikompilasi saat image dibangun.
- Design system CSS merapikan formulir, tabel, tombol, alert, breadcrumb, pagination, tabs, dropdown, fokus keyboard, serta breakpoint desktop/tablet/mobile.

Wajo Admin **tidak mengganti route atau workflow native** dataset, resource, organisasi, user, DataStore, Pages, Harvest, Scheming, dan GeoView. Shell ditambahkan secara aditif di `page.html`; form dan action tiap modul tetap berasal dari CKAN/extension upstream. Ini menjaga validasi, CSRF, upload, permission, dan URL existing. Dashboard ringkasan merupakan satu halaman custom yang memanggil Action API CKAN; ia bukan pengganti halaman CRUD.

Blueprint ringkasan memakai prefix `/admin`, sedangkan root hostname admin mengarahkan pengguna terautentikasi ke ringkasan tersebut. `CKAN__AUTH__ROUTE_AFTER_LOGIN=wajo_admin.index` dipastikan oleh bootstrap. Pengunjung anonim pada `CKAN_HOST` hanya dapat membuka login dan aset login; halaman lain meminta autentikasi dan Action API admin tanpa sesi mendapat `401`. Setelah login, seluruh path CKAN dan extension diteruskan ke CKAN, tanpa allowlist route yang dapat mematikan menu baru.

Untuk mengubah tampilan, edit:

- `deploy/ckan/theme/ckanext/wajo_theme/templates/header.html` — topbar dan identitas.
- `deploy/ckan/theme/ckanext/wajo_theme/templates/page.html` — application shell.
- `deploy/ckan/theme/ckanext/wajo_theme/templates/wajo_theme/sidebar.html` — navigasi.
- `deploy/ckan/theme/ckanext/wajo_theme/templates/wajo_theme/dashboard.html` — halaman Ringkasan.
- `deploy/ckan/theme/ckanext/wajo_theme/assets/css/wajo-theme.css` — design system dan styling seluruh halaman CKAN.

Jangan mengedit core CKAN atau folder hasil bootstrap `deploy/ckan/upstream`. Perubahan plugin/template/CSS memerlukan bootstrap dan rebuild image CKAN. Static check membangun wheel theme sungguhan dan memastikan semua template, logo, CSS, WebAssets, dan katalog `.po` ikut terkemas.

## Pemeriksaan kualitas

```bash
npm ci
npm run check
npm run test
npm run test:e2e
npm run build
npm run security:check
```

`bash scripts/check-static.sh` menjalankan pemeriksaan struktur dan integrasi tanpa bergantung pada permission executable. `npm run check:static` memanggil pemeriksaan yang sama, sedangkan `npm run check` menambahkan ESLint.

E2E publik menggunakan CKAN Action API mock. Smoke test image extension dijalankan melalui GitHub Actions. Pengujian visual CKAN Admin tetap perlu dilakukan pada instance yang berjalan menggunakan akun sysadmin dan akun editor.

## Konfigurasi dan data produksi

`.env.ckan` adalah satu-satunya sumber konfigurasi deployment dan berisi credential serta secret. File ini tidak boleh dikomit atau dibagikan. Source upstream di `deploy/ckan/upstream/` dan lock build di `deploy/ckan/` dibuat oleh bootstrap.

Pembaruan source tidak memerlukan penghapusan volume PostgreSQL, Solr, Redis, atau filestore. Backup database, filestore, dan indeks Solr sebelum perubahan versi atau migrasi. Jangan menjalankan `docker compose down -v` pada deployment produksi.

## CKAN 2.12 resource views

Pratinjau tabel memakai `datatables_view`; pratinjau geospasial memakai `geo_view`,
`geojson_view`, `wmts_view`, dan `shp_view`. Plugin berbasis Recline telah dihapus
dari CKAN 2.12 dan tidak boleh diaktifkan. Bootstrap membersihkan ID lama dari
`.env.ckan` dan menormalisasi daftar plugin saat dijalankan ulang.

## Panduan administrator

- Peta menu dan alur kerja admin: [`docs/PANDUAN-MENU-ADMIN.md`](docs/PANDUAN-MENU-ADMIN.md)
- Tema dan shell Wajo Admin: [`docs/WAJO-ADMIN.md`](docs/WAJO-ADMIN.md)
- Alur DataStore/XLoader dan preview: [`docs/DATASTORE-PREVIEW-SYNC.md`](docs/DATASTORE-PREVIEW-SYNC.md)
- Cakupan lokalisasi CKAN: [`docs/CKAN-ADMIN-LOKALISASI.md`](docs/CKAN-ADMIN-LOKALISASI.md)
- Design tokens, ukuran konten, tipografi, komponen, dan aturan responsif: [`docs/WAJO-ADMIN-DESIGN-SYSTEM.md`](docs/WAJO-ADMIN-DESIGN-SYSTEM.md)
