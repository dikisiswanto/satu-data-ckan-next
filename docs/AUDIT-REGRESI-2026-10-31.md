# Audit regresi Portal Satu Data Wajo — 31 Oktober 2026

## Ringkasan

Audit dilakukan pada paket sumber utuh CKAN 2.12.1 + Next.js yang tersedia di percakapan. Satu regresi penting ditemukan pada kebijakan cache hasil pencarian dataset dan diperbaiki. Pemeriksaan statis proyek lulus setelah perbaikan.

## Temuan dan perbaikan

### 1. Hasil pencarian dapat tertahan setelah dataset diprivatkan atau ditarik

**Risiko:** `package_search` sebelumnya memakai cache Next.js bawaan `ckanAction` (60 detik) dan facade API mengizinkan shared cache singkat. Metadata dataset yang sebelumnya publik berpotensi masih terlihat sementara setelah statusnya diubah menjadi privat/nonaktif.

**Perbaikan:**

- Action `package_search`, `package_show`, `package_activity_list`, `resource_show`, `file_show`, dan `datastore_search` sekarang selalu memakai `cache: no-store` pada fetch internal CKAN, sekalipun pemanggil meminta `revalidate` positif.
- Respons facade publik untuk `package_search` sekarang `Cache-Control: private, no-store`.
- Dokumentasi API dan halaman dokumentasi API diperbarui agar sesuai dengan perilaku cache baru.
- Tes regresi ditambahkan untuk kebijakan cache `ckanAction` dan header respons `package_search`.

### 2. Pemeriksaan build meninggalkan artefak di source tree

**Risiko:** pemeriksaan wheel theme dapat meninggalkan `*.egg-info`, `build/`, atau artefak Python di direktori kerja. Artefak seperti ini berpotensi mengotori working tree atau ikut terbawa ke Docker build context.

**Perbaikan:**

- `scripts/check-build.py` membangun wheel dari salinan theme pada direktori sementara.
- `scripts/check-static.sh` menetapkan `PYTHONDONTWRITEBYTECODE=1` agar validasi tidak membuat bytecode di sumber.
- `.dockerignore` mengecualikan upstream-base snapshot, lock internal, bytecode, egg-info, serta direktori build Python.
- Artefak `egg-info` dan `__pycache__` yang sudah ada dibersihkan dari paket.

## Pemeriksaan yang berhasil

| Pemeriksaan                                                                                                                                                                                                                        | Hasil                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `bash scripts/check-static.sh` — seluruh pemeriksaan kontrak CI, environment, CKAN theme/auth, forms, media, Markdown, download, lokalisasi, build packaging, plugin, public sync, CSS, navigasi, API, arsitektur, imports, layout | LULUS                                                                                                |
| Parsing sintaks JavaScript/JSX/MJS dengan TypeScript parser                                                                                                                                                                        | LULUS — 140 file                                                                                     |
| Parsing sintaks CSS dengan PostCSS                                                                                                                                                                                                 | LULUS — 12 file                                                                                      |
| Parsing YAML Compose, workflow CI, dan schema                                                                                                                                                                                      | LULUS — 12 file                                                                                      |
| Sintaks Python                                                                                                                                                                                                                     | LULUS — 18 file; juga dieksekusi melalui pemeriksaan statis proyek                                   |
| Sintaks shell (`bash -n`)                                                                                                                                                                                                          | LULUS                                                                                                |
| Konsistensi `package.json` dan root dependency ranges pada `package-lock.json`                                                                                                                                                     | LULUS                                                                                                |
| Pembersihan artefak build dari source tree                                                                                                                                                                                         | LULUS — tidak ada `__pycache__`, `*.egg-info`, `node_modules`, `.next`, `build`, atau `dist` tersisa |

## Pemeriksaan yang belum dapat dijalankan

`npm ci` tidak selesai karena lingkungan eksekusi tidak dapat me-resolve `registry.npmjs.org` (`EAI_AGAIN`) saat mengambil dependency. Karena dependency tidak terpasang, pemeriksaan berikut belum dijalankan dan **tidak dinyatakan lulus**:

- ESLint (`npm run lint` / `npm run check` lengkap)
- Vitest (`npm run test`)
- Next.js production build (`npm run build`)
- Playwright browser E2E (`npm run test:e2e`)
- npm production dependency audit (`npm run security:check`)

Validasi live pada Docker Compose, CKAN yang berjalan, Cloudflare Tunnel, serta pengujian browser terhadap akun sysadmin/editor juga belum dilakukan. Paket ini belum diterapkan ke VPS.

## Catatan deployment

- Pertahankan `.env.ckan` milik server yang sudah ada; berkas rahasia tersebut tidak disertakan dalam paket. `.env.ckan.example` hanya contoh.
- Jangan menghapus volume PostgreSQL, Solr, Redis, atau filestore saat menerapkan perubahan.
- Setelah dependency dapat diunduh di server/runner, jalankan `HUSKY=0 npm ci`, `npm run check`, `npm run test`, dan `npm run build` sebelum rebuild layanan Next.js.
- Perubahan cache tidak memerlukan migrasi database. Hasil pencarian dataset akan lebih sering membaca CKAN secara langsung demi konsistensi visibilitas.
