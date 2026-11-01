# Runbook CKAN dan Cloudflare

CKAN 2.12.1 adalah backend otoritatif untuk dataset, resource, organisasi, DataStore, autentikasi, dan CMS. Next.js menyajikan portal publik. Source runtime dibangun dari `ckan/ckan-docker-base`; stack service berasal dari `ckan/ckan-docker`.

## Persiapan pertama

```bash
cp .env.ckan.example .env.ckan
# Isi PUBLIC_HOST, CKAN_HOST, CLOUDFLARE_TUNNEL_TOKEN, dan secret lain
bash ./deploy/ckan/bootstrap-upstream.sh
```

`.env.ckan` adalah satu-satunya konfigurasi lingkungan lokal dan tidak boleh dikomit. Bootstrap menyinkronkan source resmi, memverifikasi CKAN 2.12.1, menyusun environment backend, memasang extension terpin, theme Wajo, dan katalog Bahasa Indonesia. Image dasar dibangun dari source upstream sebelum Compose dijalankan.

## Start dan update

Cloudflare Tunnel (profil umum):

```bash
bash ./deploy/ckan/compose.sh cloudflare config
bash ./deploy/ckan/compose.sh cloudflare up -d --build
bash ./deploy/ckan/compose.sh cloudflare ps
```

Ingress manual/Caddy: ganti `cloudflare` dengan `manual`. Profil `cloudflare-basic-auth` dan `manual-basic-auth` tersedia untuk lapisan autentikasi tambahan. Jangan arahkan hostname admin langsung ke container CKAN; semua hostname masuk melalui Caddy sesuai profil.

Hostname publik dan admin idealnya berada pada domain induk yang sama, misalnya `data.silirdev.com` dan `ckan.silirdev.com`, agar sesi CKAN dapat dibagikan secara aman bila konfigurasi cookie mengizinkan. `PUBLIC_HOST` tetap menjadi origin tautan publik; `CKAN_HOST` khusus login/admin. Perbarui hostname pada Cloudflare Tunnel secara terpisah dari `.env.ckan`.

## Rebuild sesuai perubahan

```bash
# CKAN extension, template, translation, schema, atau CSS admin
bash ./deploy/ckan/bootstrap-upstream.sh
bash ./deploy/ckan/compose.sh cloudflare up -d --build --force-recreate ckan

# Next.js saja
bash ./deploy/ckan/compose.sh cloudflare up -d --build --force-recreate nextjs
```

Setelah perubahan frontend dan CKAN bersama, rebuild kedua service. Lakukan hard refresh browser untuk memperbarui WebAssets CKAN.

## Pemeriksaan cepat

```bash
bash ./deploy/ckan/compose.sh cloudflare ps
bash ./deploy/ckan/compose.sh cloudflare logs --tail=150 ckan nextjs nginx edge-tunnel cloudflared
curl -sS https://$PUBLIC_HOST/api/3/action/status_show
curl -sSI https://$CKAN_HOST/user/login
```

Jika CKAN unhealthy, lihat log CKAN dan health history sebelum restart: `docker inspect <ckan-container> --format '{{json .State.Health}}'`. Untuk 502, periksa status `ckan`, `nginx`, `nextjs`, `edge-tunnel`, dan `cloudflared`. Jangan menghapus volume untuk mengatasi kegagalan aplikasi.

## DataStore, resource, dan GeoView

- Plugin view CKAN 2.12 yang digunakan: `datatables_view`, `geo_view`, `geojson_view`, `wmts_view`, `shp_view`, `image_view`, dan `text_view`. Jangan mengaktifkan plugin Recline atau nama plugin shapefile lama.
- Bootstrap menyiapkan permission DataStore dan worker XLoader/Harvest sesuai konfigurasi. Backfill resource lama dan sinkronisasi preview mengikuti [`docs/DATASTORE-PREVIEW-SYNC.md`](../../docs/DATASTORE-PREVIEW-SYNC.md).
- Basemap, batas ukuran GeoJSON, dan ResourceView dikelola konfigurasi aplikasi; periksa resource aktif serta view CKAN saat preview kosong.

## CMS dan unduhan privat

Pages/Blog mendukung Markdown dan media editorial. Upload media harus memakai endpoint bertanda akses; jangan membuka FileStore internal. Dataset private tetap diotorisasi oleh sesi CKAN per pengguna. Host publik/admin yang tidak berbagi registrable domain tidak dapat berbagi cookie browser. Lihat [`docs/CMS.md`](../../docs/CMS.md), [`docs/CKAN-ADMIN-LOKALISASI.md`](../../docs/CKAN-ADMIN-LOKALISASI.md), dan [`docs/PRIVATE-DATASET-DOWNLOAD-AUTH.md`](../../docs/PRIVATE-DATASET-DOWNLOAD-AUTH.md).

## Keamanan operasional

- Jangan memasukkan `.env.ckan`, token Tunnel, API key, atau cookie sesi ke Git/log.
- CKAN tetap satu-satunya otoritas permission. Jangan memakai API key sysadmin di browser.
- Backup PostgreSQL, FileStore, dan Solr sebelum perubahan skema/versi.
- Hindari `docker compose down -v` dan perintah penghapusan volume pada produksi.
- Jalankan `bash scripts/check-static.sh`, `npm run lint`, unit test, dan extended CKAN/browser smoke test sebelum rilis.
