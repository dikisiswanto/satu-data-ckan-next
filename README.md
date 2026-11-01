# Portal Satu Data Kabupaten Wajo

Portal publik **Next.js** terintegrasi dengan **CKAN 2.12.1**. CKAN menjadi sumber data, metadata, pengguna, DataStore, dan CMS; Next.js menyajikan katalog, statistik, visualisasi, berita, dan API baca.

## Jalankan

```bash
cp .env.ckan.example .env.ckan
# Isi hostname dan secret pada .env.ckan
bash ./deploy/ckan/bootstrap-upstream.sh
bash ./deploy/ckan/compose.sh cloudflare up -d --build
```

Profil `manual` tersedia untuk ingress non-Tunnel. Jalankan perintah dari root repository. Jangan menghapus volume database, Solr, Redis, atau FileStore saat memperbarui aplikasi.

## Pemeriksaan lokal

```bash
python -m pip install -r requirements-ci.txt
npm ci
npm run check
npm run test
npm run build
```

GitHub Actions menjalankan static checks dan ESLint. Smoke test browser/CKAN serta pemeriksaan security tersedia pada workflow extended validation.

## Dokumentasi terpelihara

- `deploy/ckan/README.md` — operasi dan deployment ringkas.
- `docs/API.md` — API publik.
- `docs/CMS.md` — Pages, Blog, Markdown, dan media editorial.
- `docs/WAJO-ADMIN.md` dan `docs/WAJO-ADMIN-DESIGN-SYSTEM.md` — alur kerja dan UI admin.
- `docs/PANDUAN-MENU-ADMIN.md` — panduan pengguna pengelola.
- `docs/CKAN-ADMIN-LOKALISASI.md` — katalog bahasa dan proses kompilasi.
- `docs/CKAN-CUSTOM-FORMS-CONTEXT-AWARE.md` — perilaku form Scheming.
- `docs/DATASTORE-PREVIEW-SYNC.md` — preview dan sinkronisasi DataStore.
- `docs/PRIVATE-DATASET-DOWNLOAD-AUTH.md` — otorisasi dataset dan FileStore.
- `docs/IMAGE-LIGHTBOX-AND-CATALOG.md` — preview gambar dan pemisahan katalog.

## Struktur

| Path                    | Fungsi                                      |
| ----------------------- | ------------------------------------------- |
| `src/`                  | Next.js, API, komponen, integrasi CKAN      |
| `deploy/ckan/`          | Compose, Caddy, bootstrap, extension, theme |
| `scripts/` dan `tests/` | CI checks, unit, E2E                        |
| `docs/`                 | Panduan teknis dan operasional              |

## Produksi

Simpan `.env.ckan` di luar Git, batasi akses host admin, gunakan HTTPS, dan backup PostgreSQL, FileStore, serta Solr sebelum migrasi. Jangan menjalankan `docker compose down -v` pada server produksi.
