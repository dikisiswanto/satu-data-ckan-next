# Portal Satu Data

Portal data publik berbasis **Next.js** dengan **CKAN 2.12.1** sebagai sumber otoritatif untuk dataset, resource, organisasi, pengguna, DataStore, dan CMS.

## Mulai cepat

```bash
cp .env.ckan.example .env.ckan
# Isi hostname, secret, identitas portal, dan kredensial deployment
bash ./deploy/ckan/bootstrap-upstream.sh
bash ./deploy/ckan/compose.sh cloudflare up -d --build
```

Jalankan perintah dari root repository. Gunakan profil `manual` untuk ingress non-Tunnel. Jangan menghapus volume PostgreSQL, Solr, Redis, atau FileStore saat memperbarui aplikasi. Detail deployment dan diagnostik ada di [Panduan Operasional](docs/OPERASIONAL-DEPLOYMENT.md).

## Pemeriksaan pengembangan

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

`npm run check` menjalankan static quality gate dan ESLint. E2E memerlukan browser Playwright.

## Dokumentasi kanonis

Perbarui dokumen yang sudah ada sebelum membuat file baru. Dokumentasi teknis disimpan di `docs/`; jangan menambahkan salinan README, catatan audit sementara, atau changelog ad hoc ke root repository.

| Area                                                      | Panduan                                                             |
| --------------------------------------------------------- | ------------------------------------------------------------------- |
| API dan integrasi                                         | [API publik](docs/API.md)                                           |
| Frontend, UX, aksesibilitas, PWA, dan performa            | [Kualitas frontend publik](docs/KUALITAS-FE-PUBLIK.md)              |
| Identitas visual publik, login, dan admin                 | [Sistem desain](docs/DESAIN-SISTEM.md)                              |
| Pengelolaan CKAN, form kontekstual, dan lokalisasi        | [Administrasi CKAN](docs/ADMIN-CKAN.md)                             |
| Pages/Blog, media, lightbox, dan klasifikasi katalog      | [Konten, CMS, dan media](docs/KONTEN-CMS-MEDIA.md)                  |
| Identitas dan konfigurasi multi-instansi                  | [Konfigurasi instansi](docs/CONFIGURASI-INSTANSI.md)                |
| DataStore, XLoader, dan sinkronisasi                      | [Pratinjau DataStore](docs/PRATINJAU-DATASTORE-DAN-SINKRONISASI.md) |
| Sesi dan unduhan dataset privat                           | [Akses dataset privat](docs/AKSES-UNDUHAN-DATASET-PRIVAT.md)        |
| Docker, Cloudflare Tunnel, Caddy, rebuild, dan diagnostik | [Operasional deployment](docs/OPERASIONAL-DEPLOYMENT.md)            |

## Struktur proyek

| Lokasi                  | Isi                                                  |
| ----------------------- | ---------------------------------------------------- |
| `src/`                  | Aplikasi Next.js, API, komponen, integrasi CKAN      |
| `deploy/ckan/`          | Compose, Caddy, bootstrap, extension, dan theme CKAN |
| `scripts/` dan `tests/` | Pemeriksaan CI, unit test, dan E2E                   |
| `docs/`                 | Dokumentasi teknis dan operasional kanonis           |

## Keamanan produksi

Simpan `.env.ckan` di luar Git, lindungi hostname admin, gunakan HTTPS, dan cadangkan PostgreSQL, FileStore, serta Solr sebelum migrasi. Jangan menjalankan `docker compose down -v` pada server produksi.
