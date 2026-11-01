# Portal Satu Data Kabupaten Wajo

Frontend **Next.js** dan backend **CKAN 2.12.1**. CKAN mengelola dataset, resource, organisasi, pengguna, DataStore, dan CMS. Next.js menyediakan katalog publik, pencarian, statistik, visualisasi, berita, dan API baca.

## Domain

Hostname publik dan admin diatur melalui `.env.ckan`. Contoh pemisahan layanan:

| Host          | Fungsi                        |
| ------------- | ----------------------------- |
| `PUBLIC_HOST` | Portal Next.js dan API publik |
| `CKAN_HOST`   | Login dan administrasi CKAN   |

## Menjalankan proyek

```bash
cp .env.ckan.example .env.ckan
nano .env.ckan
bash ./deploy/ckan/bootstrap-upstream.sh
```

Bootstrap membangun image dari source resmi `ckan/ckan-docker-base` dan memakai stack `ckan/ckan-docker`.

Pilih profil deployment sesuai infrastruktur:

```bash
# Cloudflare Tunnel
bash ./deploy/ckan/compose.sh cloudflare up -d --build

# DNS/Caddy manual
bash ./deploy/ckan/compose.sh manual up -d --build
```

Jalankan perintah dari root repository. Jangan menghapus volume database, Solr, Redis, atau FileStore saat memperbarui source.

## Pemeriksaan

```bash
npm ci
npm run check
npm run test
npm run build
```

`npm run check` menjalankan pemeriksaan statis dan ESLint. E2E browser, audit dependency, serta smoke test image CKAN tersedia pada workflow **Extended validation**.

## Fitur utama

- Katalog dataset, pencarian, organisasi, kategori, indikator, infografik, dan publikasi.
- API publik read-only dan preview resource/DataStore.
- Preview GeoJSON dengan basemap; batas saat ini 20 MB, 10.000 fitur, dan 300.000 koordinat.
- Wajo Admin untuk pengelolaan CKAN, Pages, organisasi, resource, dan harvesting.
- CMS berita/halaman berbasis Markdown. Foto kartu berita diambil dari gambar Markdown pertama; jika tidak ada, portal menampilkan ikon artikel.
- Footer memuat tautan laman CMS dan daftar berita.

## Struktur penting

| Path           | Isi                                                 |
| -------------- | --------------------------------------------------- |
| `src/`         | Aplikasi Next.js, API, komponen, dan integrasi CKAN |
| `deploy/ckan/` | Compose, Caddy, bootstrap CKAN, dan custom theme    |
| `scripts/`     | Pemeriksaan CI, konfigurasi, API, dan UI            |
| `tests/`       | Unit test dan E2E                                   |
| `docs/`        | Panduan API, CMS, admin, lokalisasi, dan operasi    |

## Dokumentasi

- [Deployment CKAN](deploy/ckan/README.md)
- [Dokumentasi API](docs/API.md)
- [CMS dan publikasi berita](docs/CMS.md)
- [Panduan menu admin](docs/PANDUAN-MENU-ADMIN.md)
- [Wajo Admin](docs/WAJO-ADMIN.md)
- [Design system admin](docs/WAJO-ADMIN-DESIGN-SYSTEM.md)
- [Sinkronisasi DataStore](docs/DATASTORE-PREVIEW-SYNC.md)
- [Lokalisasi CKAN](docs/CKAN-ADMIN-LOKALISASI.md)
- [Form CKAN berbasis konteks](docs/CKAN-CUSTOM-FORMS-CONTEXT-AWARE.md)
- [Otorisasi dataset privat dan unduhan Next.js](docs/PRIVATE-DATASET-DOWNLOAD-AUTH.md)
- [Lightbox gambar dan pemisahan katalog](docs/IMAGE-LIGHTBOX-AND-CATALOG.md)
- [Panduan UI/UX](docs/UI-UX-DESIGN-GUIDELINES.md)

## Keamanan produksi

- `.env.ckan` berisi credential dan secret; jangan dikomit atau dibagikan.
- Gunakan HTTPS untuk host publik dan admin. Batasi akses admin melalui konfigurasi deployment.
- CKAN tetap menjadi sumber kebenaran autentikasi dan otorisasi dataset/resource.
- Backup PostgreSQL, FileStore, dan Solr sebelum migrasi atau perubahan versi.
- Jangan menjalankan `docker compose down -v` pada server produksi.
