# Deployment CKAN + Cloudflare Tunnel

Panduan ini untuk Portal Satu Data Kabupaten Wajo: Next.js melayani website publik dan CKAN 2.12.1 mengelola metadata serta data. Bootstrap mengambil source image resmi `ckan/ckan-docker-base` dan menyiapkan stack Compose resmi `ckan/ckan-docker`; kedua checkout generated tidak disertakan di repositori.

## 1. Siapkan konfigurasi

Dari root repo:

```bash
cp .env.ckan.example .env.ckan
```

Edit `.env.ckan` sekurangnya untuk `PUBLIC_HOST`, `CKAN_HOST`, dan `CLOUDFLARE_TUNNEL_TOKEN`. Nilai default hostname adalah `data.wajokab.go.id` dan `ckan.data.wajokab.go.id`. URL turunan disinkronkan dari dua hostname tersebut. `.env.ckan` harus privat dan tidak boleh dimasukkan ke Git.

Jalankan bootstrap:

```bash
./deploy/ckan/bootstrap-upstream.sh
```

Deployment memakai dua repository resmi yang tidak saling menggantikan:

| Repository                                                          | Peran                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`ckan/ckan-docker-base`](https://github.com/ckan/ckan-docker-base) | Source image runtime CKAN (Dockerfile, Python runtime, dependency, entrypoint). Source branch `main`, folder `ckan-2.12`, dan `VERSION.txt` harus tepat `2.12.1`; runtime Python dibaca dinamis dari `PYTHON_VERSION.txt` (saat audit upstream memakai Python 3.14). |
| [`ckan/ckan-docker`](https://github.com/ckan/ckan-docker)           | Docker Compose stack (CKAN, PostgreSQL, Solr, Redis, Nginx, worker).                                                                                                                                                                                                 |

Bootstrap menyinkronkan source image `ckan/ckan-docker-base` dari branch `main`, memverifikasi versi source base 2.12.1 dan merekam commit upstream. Repository orkestrasi `ckan/ckan-docker` diklon pada persiapan pertama dan checkout generated yang sudah ada digunakan kembali. Karena tag Docker Hub `ckan/ckan-base:2.12.1` belum boleh diasumsikan tersedia, proses tidak bergantung pada pull tag tersebut: saat `compose.sh ... up`, script menjalankan `build.sh build 2.12 base` dari checkout resmi `ckan-docker-base`, lalu memverifikasi tag lokal `ckan/ckan-base:2.12.1`, `CKAN_REF=ckan-2.12.1`, dan OCI source label. Baru setelah itu Compose membangun image CKAN Wajo yang memasang extension terpin dan `wajo_theme`.

Bootstrap hanya mengambil dan memvalidasi source serta menghasilkan `.env.generated` terfilter; image build otomatis dilakukan sebelum `compose up`. Checkout base upstream dan lock build bersifat generated dan tidak dimasukkan ke Git.

## 2. Tunnel untuk dua subdomain

Gunakan **satu named/remote-managed Cloudflare Tunnel** untuk kedua hostname. `cloudflared` di Docker menghubungkan Tunnel ke Caddy internal pada `edge-tunnel:80`; Caddy memilih aplikasi berdasarkan hostname. Tidak perlu menerbitkan port 80/443 dari VPS pada mode ini.

1. Pada Cloudflare, pastikan zona `wajokab.go.id` aktif menggunakan nameserver Cloudflare.
2. Buka **Cloudflare Zero Trust → Networks → Tunnels** lalu buat tunnel bertipe Docker/remote-managed. Salin token tunnel ke `CLOUDFLARE_TUNNEL_TOKEN` pada `.env.ckan`. Jangan masukkan token ke Git, screenshot, atau log.
3. Pada tunnel tersebut, tambahkan dua **Published application routes / Public Hostnames** berikut. Jika UI memisahkan konfigurasi hostname dan service, isi keduanya sesuai tabel ini:

   | Hostname                  | Service origin          | Fungsi                                                |
   | ------------------------- | ----------------------- | ----------------------------------------------------- |
   | `data.wajokab.go.id`      | `http://edge-tunnel:80` | Portal Next.js, API baca, ekspor DCAT, unduhan publik |
   | `ckan.data.wajokab.go.id` | `http://edge-tunnel:80` | Login dan administrasi CKAN                           |

   Keduanya sengaja menuju origin yang sama. Caddy yang memisahkan route; jangan arahkan `ckan.data` langsung ke service `ckan`, `nginx`, atau port PostgreSQL.

4. Jalankan validasi lalu start:

   ```bash
   ./deploy/ckan/compose.sh cloudflare config
   ./deploy/ckan/compose.sh cloudflare up -d --build
   ./deploy/ckan/compose.sh cloudflare ps
   ```

5. Verifikasi route:

   ```bash
   curl -sSI https://data.wajokab.go.id/
   curl -sSI https://ckan.data.wajokab.go.id/
   curl -sS 'https://data.wajokab.go.id/api/3/action/status_show'
   ```

   Homepage pertama harus berasal dari Next.js. Host admin kedua seharusnya mengembalikan redirect ke `/user/login?came_from=%2Fdashboard%2Fdatasets`. Setelah login berhasil, pengguna kembali ke dashboard dataset (bukan layar konfigurasi yang hanya dapat diakses sysadmin). Setelah itu buka URL admin di browser; halaman login harus memakai tema Wajo. Kalau `502` muncul, cek status dan log `cloudflared`, `edge-tunnel`, `nextjs`, `ckan`, dan `nginx` dengan `./deploy/ckan/compose.sh cloudflare logs --tail=150 cloudflared edge-tunnel nextjs ckan nginx`.

**DNS:** untuk remote-managed Tunnel, penambahan hostname pada konfigurasi Tunnel biasanya membuat record DNS tunnel otomatis. Pastikan kedua hostname ditampilkan di daftar routes Tunnel, dan DNS masing-masing mengarah ke target `*.cfargotunnel.com` milik Tunnel tersebut. Jangan membuat record A ke IP VPS untuk kedua hostname pada mode Tunnel.

## 3. Akses admin dan keamanan

`CKAN_ADMIN_GATE_MODE=none` adalah default: hostname admin langsung membuka form login CKAN tanpa prompt Basic Auth tambahan. Login dan izin CKAN tetap berlaku. Root redirect tidak menjadikan seluruh UI CKAN privat; jika ingin menambah lapisan perimeter, pilih satu mode di `.env.ckan`:

- `basic_auth`: Basic Auth pada Caddy di profil `manual` atau `cloudflare`.
- `cloudflare_access`: pasang aplikasi Access dan allow-list admin dahulu, lalu jalankan profil `cloudflare-access`.

Jalankan tepat satu profil ingress (`manual`, `cloudflare`, atau `cloudflare-access`). Header `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet, noimageindex` di semua respons hostname admin merupakan instruksi crawler, bukan kontrol keamanan. `robots.txt` sengaja tidak memblokir crawling agar crawler dapat membaca header tersebut; sitemap admin merespons 404.

Jangan membuka port host PostgreSQL, Solr, Redis, CKAN, Nginx CKAN, atau Next.js. Pada mode Tunnel, hanya koneksi Docker privat dari `cloudflared` ke Caddy yang dibutuhkan. Pada mode manual, hanya Caddy yang menerbitkan TCP 80/443.

## 4. Theme admin Wajo

Bootstrap menyalin `deploy/ckan/theme/` ke build context CKAN dan memasang package `ckanext-wajo-theme`. Plugin `wajo_theme` mendaftarkan template override dan WebAssets CSS, serta mengganti blok logo header dengan identitas Portal Satu Data. CSS ditambahkan ke `base.html` sehingga digunakan oleh login, dashboard, form dataset/resource, organisasi, konfigurasi dan halaman admin lainnya.

Theme dibangun di atas Midnight Blue bawaan CKAN 2.12, sehingga form, navigation, CSRF, autentikasi, dan alur permission CKAN tetap berasal dari CKAN. `ckanext-theming` tidak diaktifkan: extension itu masih berupa prototipe dan tidak ditemukan sebagai dependency dalam source arsip yang diterima. Untuk mengubah warna/layout, edit `deploy/ckan/theme/ckanext/wajo_theme/assets/css/wajo-theme.css`. Untuk mengubah identitas header, edit `templates/header.html`; untuk memelihara versi plugin, edit `setup.py`.

Setelah mengubah theme, jalankan `./deploy/ckan/bootstrap-upstream.sh` untuk menyalin source theme ke build context, lalu bangun ulang image dan recreate CKAN:

```bash
./deploy/ckan/compose.sh cloudflare up -d --build --force-recreate ckan
```

Ganti `cloudflare` dengan `manual` untuk ingress manual. Jika tampilan lama masih muncul, cek asset bundle CKAN dan cache browser; bila diperlukan jalankan recreate setelah build, bukan mengedit file di `deploy/ckan/upstream` karena folder itu dihasilkan bootstrap.

## 5. Audit theme dan penerimaan UI admin

Theme sengaja hanya meng-override `base.html` dan `header.html`; form login, dashboard, dataset, organisasi, resource, preview, DataStore, Harvest, Scheming, Pages, dan halaman konfigurasi tetap memakai template/komponen fitur bawaan CKAN 2.12.1. CSS adalah lapisan tambahan, bukan pengganti JS, form action, token CSRF, endpoint, atau permission CKAN.

Sebelum menyatakan UI admin siap produksi, verifikasi melalui browser desktop dan mobile dengan akun sysadmin serta akun organisasi/editor:

| Area            | Alur yang harus dicoba                                                 | Kriteria lulus                                                                               |
| --------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Shell/login     | `/user/login`, login gagal, login berhasil, logout                     | Logo/CSS tampil; pesan error, CSRF, reset password, dan navigasi tetap bekerja               |
| Dashboard       | `/dashboard/datasets`, `/dashboard/organizations`, `/dashboard/groups` | Menu aktif, tabel, filter, pagination, dan empty state terbaca                               |
| Dataset         | `/dataset`, `/dataset/new`, detail dan edit dataset                    | Scheming field, validasi, select, date, upload, visibility, save/cancel berfungsi            |
| Resource        | Tambah/edit resource, upload file, resource detail                     | Form, progress/error upload, tab, action, dan metadata tetap dapat digunakan                 |
| Data preview    | Table/DataStore, image, text, GeoJSON, peta, WMTS, shapefile           | Viewer tidak tertutup/terpotong; tabel, toolbar, legend, dan pesan error terbaca             |
| Organisasi/Grup | Daftar, detail, create/edit, members                                   | Sidebar, facet, tabel anggota, action dan permission tidak berubah                           |
| Administrasi    | `/ckan-admin/config`, pengguna, revisi                                 | Pengaturan, tabel, form, role, dan pesan sistem tetap berjalan                               |
| Harvest/Pages   | Daftar sumber, job, log, halaman statis                                | Extension UI tetap tampil; worker/job tidak dipengaruhi theme                                |
| Responsif/a11y  | Lebar 1440, 1024, 768, 390, 320 px; keyboard-only                      | Tidak ada overflow horizontal; login menumpuk rapi; focus terlihat; reduced motion dihormati |

Periksa juga `https://ckan.data.wajokab.go.id/logo-kabupaten-wajo.webp` harus merespons `200` dengan `Content-Type: image/webp`, dan asset CSS hasil WebAssets harus merespons `200`. Bila logo 404, pastikan `CKAN__SITE_LOGO=/logo-kabupaten-wajo.webp`; `add_public_directory()` memang mengekspos isi folder `public` pada URL root, bukan di bawah `/base/`.

Validasi source yang tersedia: `npm run check` menjalankan guard theme, packaging overlay, route publik, API contract, dan pemeriksaan CSS. `npm run test`, `npm run lint`, `npm run test:e2e`, dan `npm run build` menguji aplikasi publik Next.js. CI smoke image memasang package theme lokal sebelum memeriksa entry point. Pengujian visual semua halaman CKAN tetap wajib dilakukan pada container CKAN yang benar-benar berjalan; pemeriksaan source/CI tidak menggantikan browser acceptance test.

## 6. Persiapan data dan extension

Extension CKAN dipin dalam source dan dipasang oleh bootstrap:

| Extension            | Fungsi                                                                                               |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| `ckanext-scheming`   | Field metadata dataset dan resource, termasuk periode, metodologi, satuan, versi, dan catatan revisi |
| `ckanext-pages`      | Halaman informasi yang dikelola melalui CKAN                                                         |
| `ckanext-dcat`       | Ekspor katalog DCAT/RDF dan harvesting DCAT                                                          |
| `ckanext-geoview`    | Viewer resource geospasial pada CKAN Admin                                                           |
| `ckanext-harvest`    | Sumber harvest serta antrean worker gather/fetch                                                     |
| `ckanext-xloader`    | Memuat resource tabular ke DataStore menggunakan worker                                              |
| `ckanext-wajo-theme` | Branding dan stylesheet admin Wajo                                                                   |

Setelah CKAN dan DB pertama kali sehat, dari root repo jalankan:

```bash
./deploy/ckan/apply-datastore-permissions.sh
./deploy/ckan/enable-xloader.sh cloudflare
```

Buat dataset publik di CKAN Admin. Untuk menampilkan konten khusus portal, gunakan tag yang sesuai: `portal-indikator`, `portal-infografik`, atau `portal-publikasi`. Indikator membutuhkan resource tabular yang telah dimuat ke DataStore; kolom minimum adalah `period`, `region`, dan `value`. Detail format field tersedia pada schema `schemas/dataset.yaml` serta panduan portal di `/api-data`.

## 7. Verifikasi source image CKAN 2.12.1

Bootstrap menyimpan commit source pada `deploy/ckan/.ckan-base-source.lock` dan commit yang sudah dibangun pada `deploy/ckan/.ckan-base-image.lock` (keduanya generated/ignored). Untuk sinkronisasi atau build manual:

```bash
./deploy/ckan/sync-ckan-base-source.sh
./deploy/ckan/prepare-ckan-base.sh
docker image inspect ckan/ckan-base:2.12.1 --format '{{.Id}} {{range .Config.Env}}{{println .}}{{end}}'
```

Image harus memperlihatkan `CKAN_REF=ckan-2.12.1`. Script `compose.sh ... up` menjalankan pemeriksaan dan build ini otomatis; build dilewati hanya bila commit upstream, image ID CKAN, dan ID runtime Python sama dengan lock yang berhasil diverifikasi. Untuk memaksa rebuild dari source terbaru dan Python base yang baru ditarik, jalankan `CKAN_BASE_FORCE_REBUILD=1 ./deploy/ckan/compose.sh cloudflare up -d --build`. Jika upstream `main` belum menyetel `ckan-2.12/VERSION.txt` ke `2.12.1`, deployment berhenti dan tidak diam-diam memakai versi lain.

## 8. DNS manual tanpa Tunnel

Jika VPS menerima inbound HTTPS, arahkan A record kedua hostname ke IP VPS, buka TCP 80/443 pada firewall, lalu jalankan:

```bash
./deploy/ckan/compose.sh manual config
./deploy/ckan/compose.sh manual up -d --build
```

Caddy menangani sertifikat TLS. Jangan jalankan profil manual dan Tunnel bersamaan untuk deployment yang sama. Pastikan hanya service Caddy yang memublikasikan port web.

## 9. Pembaruan dan diagnosa

Sebelum deployment, jalankan `npm run check`, `npm run test`, `npm run build`, `python3 scripts/check-ckan-build-overlay.py`, dan `./deploy/ckan/compose.sh cloudflare config`. Setelah deploy, periksa `./deploy/ckan/compose.sh cloudflare ps` dan log service. Backup PostgreSQL CKAN, volume filestore, serta indeks Solr; uji pemulihan sebelum upgrade. Jangan menghapus volume ketika membangun ulang image.
