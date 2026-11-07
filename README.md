# Portal Satu Data

Portal ini dibangun dengan **Next.js** dan menggunakan **CKAN 2.12.1** sebagai sumber utama dataset, resource, organisasi, pengguna, DataStore, dan CMS.

## Menjalankan proyek

```bash
cp .env.ckan.example .env.ckan
# Isi hostname dan secret pada .env.ckan
bash ./deploy/ckan/bootstrap-upstream.sh
bash ./deploy/ckan/compose.sh cloudflare up -d --build
```

Jalankan perintah dari root repository. Profil `manual` tersedia untuk ingress non-Tunnel. Jangan menghapus volume PostgreSQL, Solr, Redis, atau FileStore saat memperbarui aplikasi.

## Pemeriksaan dan perapian kode

```bash
python -m pip install -r requirements-ci.txt
npm ci
npm run fix
npm run format:check
npm run check
npm run test
npm run test:e2e
npm run build
```

`npm run fix` menjalankan Prettier dan ESLint autofix. `npm run check` menjalankan pemeriksaan statis serta ESLint. `npm run test:e2e` memerlukan browser Playwright.

## Identitas instansi dan dokumentasi

Konfigurasi identitas institusi dipusatkan pada blok `PORTAL_*` di `.env.ckan`. Nilai bawaan deployment disediakan melalui `.env.ckan.example`; source code menggunakan fallback netral dan tidak mengunci identitas instansi. Panduan lengkap tersedia di [Konfigurasi Identitas Instansi](docs/CONFIGURASI-INSTANSI.md).

Mulai dari [Indeks Dokumentasi](docs/INDEX.md). Semua panduan operasional dan teknis disimpan pada satu lokasi kanonis di `docs/`; jangan menambahkan salinan panduan atau catatan perubahan sementara ke root repository.

## Struktur proyek

| Lokasi                  | Isi                                                  |
| ----------------------- | ---------------------------------------------------- |
| `src/`                  | Aplikasi Next.js, API, komponen, dan integrasi CKAN  |
| `deploy/ckan/`          | Compose, Caddy, bootstrap, extension, dan theme CKAN |
| `scripts/` dan `tests/` | Pemeriksaan CI, unit test, dan E2E                   |
| `docs/`                 | Dokumentasi teknis dan operasional                   |

## Keamanan produksi

Simpan `.env.ckan` di luar Git, lindungi hostname admin, gunakan HTTPS, dan cadangkan PostgreSQL, FileStore, serta Solr sebelum migrasi. Jangan menjalankan `docker compose down -v` pada server produksi.
