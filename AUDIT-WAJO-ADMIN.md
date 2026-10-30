# Audit implementasi Wajo Admin

Tanggal: 30 Oktober 2026  
Basis: `portal-satu-data-wajo-id-admin-eslint-fix.zip`  
Target CKAN: 2.12.1

## Ringkasan implementasi

Source diperbarui menjadi **Wajo Admin**, antarmuka administrasi CKAN yang terintegrasi dengan identitas Portal Satu Data Kabupaten Wajo.

1. Header aplikasi baru dengan logo, identitas Wajo Admin, tautan portal publik, profil, akses pengaturan sysadmin, dan logout ber-CSRF.
2. Sidebar responsif dengan kelompok menu, status aktif, dan item sistem yang dibatasi untuk sysadmin.
3. Dashboard khusus `/wajo-admin/` dengan metrik dinamis dari CKAN Action API, dataset terbaru, dan quick action yang tunduk pada permission CKAN.
4. Design system CSS lintas halaman untuk judul, breadcrumb, card/module, form, input, error state, tabel, tabs, dropdown, modal, alert, pagination, tombol, focus, dan layout responsif.
5. Locale Bahasa Indonesia tetap default dan katalog `.po` dikemas bersama extension serta dikompilasi saat Docker build.
6. Halaman login tetap fokus untuk pengunjung anonim; shell administrasi tampil untuk pengguna yang sudah login.
7. Route seluruh CKAN core dan extension tetap diteruskan ke backend CKAN. CRUD/form/permission/CSRF/validasi/upload tidak diganti oleh implementasi paralel.
8. Redirect setelah login diarahkan ke endpoint `wajo_admin.index` yang sekarang dipasang pada prefix eksplisit `/wajo-admin`.

## Bug routing yang ditemukan dan diperbaiki

Blueprint awal ringkasan dibuat tanpa `url_prefix`, sehingga endpoint `wajo_admin.index` akan menghasilkan path root `/`. Middleware juga mengarahkan root ke endpoint tersebut, yang dapat menciptakan redirect loop.

Blueprint sekarang mendefinisikan:

```python
Blueprint("wajo_admin", __name__, url_prefix="/wajo-admin")
```

Dengan demikian `wajo_admin.index` mengarah ke `/wajo-admin/`. Pengujian auth/dashboard sekarang memverifikasi prefix itu, sedangkan route root CKAN tetap menjadi gerbang login/dashboard.

## Validasi yang berhasil

Perintah utama:

```bash
bash scripts/check-static.sh
```

Hasil: **PASS**. Pemeriksaan meliputi:

- `check-ci.py`
- `check-env.py`
- `check-base.py`
- `check-theme.py`
- `check-auth-middleware.py` (19 skenario)
- `check-build.py`
- `check-plugins-config.py`
- `check-css.mjs`
- `check-nav.mjs`
- `check-api.mjs`
- `check-project.mjs`
- `check-imports.mjs` (113 modul JS/JSX)
- `check-layout.mjs`

`check-build.py` membangun wheel `ckanext-wajo-theme` di direktori sementara dan memeriksa keberadaan file dashboard, sidebar, header/page templates, logo, CSS/WebAssets, dan katalog Bahasa Indonesia dalam wheel hasil build.

`python3 -m py_compile` berhasil pada plugin dan skrip pemeriksaan Python yang diubah.

## Batas validasi

- `npm run lint` tidak dijalankan karena `node_modules/.bin/eslint` tidak tersedia pada runtime ini.
- Docker/CKAN tidak dijalankan dan source belum di-deploy ke VPS.
- Belum ada browser visual test pada CKAN yang benar-benar berjalan. Karena itu tampilan akhir, versi aset WebAssets di runtime, upload resource, DataStore, serta workflow Pages/Harvest/GeoView harus melewati browser acceptance setelah image dibangun pada server.

## Deployment

Jalankan dari root source pada VPS:

```bash
bash ./deploy/ckan/bootstrap-upstream.sh
bash ./deploy/ckan/compose.sh cloudflare up -d --build --force-recreate ckan edge-tunnel
```

Untuk ingress manual, gunakan profil `manual` dan service `ckan caddy` sebagai pengganti `cloudflare ckan edge-tunnel`.

Jangan menghapus volume PostgreSQL, Solr, Redis, atau filestore saat memperbarui theme. Setelah container sehat, uji login, route `/wajo-admin/`, seluruh menu CKAN/extension, dan akun dengan role berbeda.
