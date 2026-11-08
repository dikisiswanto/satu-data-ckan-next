# Portal Satu Data

Portal ini menyajikan katalog data dan informasi resmi. **CKAN 2.12.1** menjadi sumber utama untuk dataset, berkas, organisasi, pengguna, DataStore, autentikasi, dan CMS. **Next.js** menangani tampilan publik dan membaca data melalui API CKAN. Pengelolaan data tetap dilakukan di Portal Admin CKAN.

## Menyiapkan lingkungan

Jalankan perintah berikut dari root repository:

```bash
cp .env.ckan.example .env.ckan
# Lengkapi hostname, identitas portal, secret, dan pengaturan deployment.
bash ./deploy/ckan/bootstrap-upstream.sh
bash ./deploy/ckan/compose.sh cloudflare up -d --build
```

Profil `cloudflare` menggunakan Cloudflare Tunnel. Gunakan profil `manual` untuk mengakses layanan melalui Caddy tanpa Tunnel. Siapkan Cloudflare Access sebelum menggunakan profil `cloudflare-access`. Jangan menghapus volume PostgreSQL, Solr, Redis, atau FileStore saat memperbarui aplikasi. Panduan lengkap tersedia di [Operasional Deployment](docs/PANDUAN-PORTAL.md#operasional-deployment-ckan).

Simpan secret hanya di `.env.ckan`. Jangan commit file tersebut ke repository. Gunakan `.env.ckan.example` sebagai acuan konfigurasi.

## Mengembangkan dan menguji

```bash
python -m pip install -r requirements-ci.txt
npm ci
npm run format:check
npm run check
npm run test
npm run test:e2e
npm run build
```

`npm run check` menjalankan pemeriksaan statis dan ESLint. `npm run test` menjalankan unit test dengan Vitest. `npm run test:e2e` menjalankan pengujian browser dengan Playwright; browser Playwright harus sudah dipasang. `npm run build` memeriksa build produksi Next.js. Untuk merapikan format dan memperbaiki temuan lint yang dapat diperbaiki otomatis, jalankan `npm run fix`.

## Dokumentasi

Dokumentasi proyek dipusatkan di `docs/`.

- [Panduan portal](docs/PANDUAN-PORTAL.md): API, administrasi, CMS, akses data, frontend, deployment, dan sambutan beranda.
- [Lokalisasi CKAN](docs/LOKALISASI-CKAN.md): cakupan katalog inti dan extension, audit terjemahan, serta alur `.po`, `.mo`, dan JavaScript.
