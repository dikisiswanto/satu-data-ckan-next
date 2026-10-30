# Deployment CKAN + Cloudflare Tunnel

Panduan ini untuk Portal Satu Data Kabupaten Wajo: Next.js melayani website publik dan CKAN 2.12.1 mengelola metadata serta data. Bootstrap mengambil source image resmi `ckan/ckan-docker-base` dan menyiapkan stack Compose resmi `ckan/ckan-docker`; kedua checkout generated tidak disertakan di repositori.

## Pratinjau dan visualisasi resource

Konfigurasi CKAN 2.12 menggunakan `datatables_view` untuk tabel DataStore dan
`geo_view`, `geojson_view`, `wmts_view`, serta `shp_view` untuk data geospasial.
`image_view` dan `text_view` menangani berkas gambar, JSON, XML, dan teks.

CKAN 2.12 sudah menghapus seluruh plugin berbasis Recline (`recline_view`,
`recline_grid_view`, dan turunannya). Jangan menambahkan plugin tersebut ke
`CKAN__PLUGINS` atau `CKAN__VIEWS__DEFAULT_VIEWS`. Plugin shapefile dari
`ckanext-geoview` bernama `shp_view`, bukan `esri_shapefile_view`.

## 1. Siapkan konfigurasi

Dari root repo:

```bash
cp .env.ckan.example .env.ckan
```

Edit `.env.ckan` sekurangnya untuk `PUBLIC_HOST`, `CKAN_HOST`, dan `CLOUDFLARE_TUNNEL_TOKEN`. Nilai default hostname adalah `data.wajokab.go.id` dan `ckan.wajokab.go.id`. URL turunan disinkronkan dari dua hostname tersebut. `.env.ckan` harus privat dan tidak boleh dimasukkan ke Git.

Jalankan bootstrap:

```bash
bash ./deploy/ckan/bootstrap-upstream.sh
```

Deployment memakai dua repository resmi yang tidak saling menggantikan:

| Repository                                                          | Peran                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`ckan/ckan-docker-base`](https://github.com/ckan/ckan-docker-base) | Source image runtime CKAN (Dockerfile, Python runtime, dependency, entrypoint). Source branch `main`, folder `ckan-2.12`, dan `VERSION.txt` harus tepat `2.12.1`; runtime Python dibaca dinamis dari `PYTHON_VERSION.txt` (saat audit upstream memakai Python 3.14). |
| [`ckan/ckan-docker`](https://github.com/ckan/ckan-docker)           | Docker Compose stack (CKAN, PostgreSQL, Solr, Redis, Nginx, worker).                                                                                                                                                                                                 |

Bootstrap menyinkronkan source image `ckan/ckan-docker-base` dari branch `main`, memverifikasi versi source base 2.12.1 dan merekam commit upstream. Repository orkestrasi `ckan/ckan-docker` diklon pada persiapan pertama dan checkout generated yang sudah ada digunakan kembali. Karena tag Docker Hub `ckan/ckan-base:2.12.1` belum boleh diasumsikan tersedia, proses tidak bergantung pada pull tag tersebut: saat `compose.sh ... up`, script menjalankan `build.sh build 2.12 base` dari checkout resmi `ckan-docker-base`, lalu memverifikasi tag lokal `ckan/ckan-base:2.12.1`, `CKAN_REF=ckan-2.12.1`, dan OCI source label. Baru setelah itu Compose membangun image CKAN Wajo yang memasang extension terpin dan `wajo_theme`.

Bootstrap hanya mengambil dan memvalidasi source serta menghasilkan `.env.generated` terfilter; image build otomatis dilakukan sebelum `compose up`. Checkout base upstream dan lock build bersifat generated dan tidak dimasukkan ke Git.

## 2. Tunnel untuk dua subdomain

Gunakan hostname admin satu tingkat agar sertifikat Cloudflare Universal SSL standar dapat mencakupnya. Contoh konfigurasi staging:

```ini
PUBLIC_HOST=data.silirdev.com
CKAN_HOST=ckan.silirdev.com
```

Untuk staging `silirdev.com`, konfigurasi yang disarankan adalah `PUBLIC_HOST=data.silirdev.com` dan `CKAN_HOST=ckan.silirdev.com`. Saat memindahkan hostname admin dari `ckan.data.silirdev.com`, cukup ubah satu baris `CKAN_HOST` di `.env.ckan`; `sync-env.py` akan menyelaraskan `NEXT_PUBLIC_CKAN_ADMIN_URL` dan `CKAN_ADMIN_URL`. `PUBLIC_HOST`, `NEXT_PUBLIC_SITE_URL`, `PUBLIC_SITE_ORIGIN`, dan `CKAN_SITE_URL` tetap memakai domain portal publik. Jalankan ulang bootstrap dan Compose dengan `--build` agar Caddy serta tautan admin Next.js menggunakan hostname baru. Cloudflare Public Hostname juga harus diperbarui ke hostname baru; pengaturan DNS/Tunnel tersebut tidak dapat diubah dari `.env.ckan`.

Untuk lingkungan resmi, gunakan hostname yang ditetapkan pengelola domain, misalnya `data.wajokab.go.id` dan `ckan.wajokab.go.id`. Keduanya adalah subdomain tingkat pertama dari `wajokab.go.id`.

**Penting untuk TLS:** gunakan hostname admin satu tingkat, misalnya `ckan.silirdev.com`, jika zona memakai Cloudflare Full DNS Setup. Sertifikat Universal SSL standar mencakup domain utama dan subdomain tingkat pertama, sehingga `data.silirdev.com` dan `ckan.silirdev.com` dapat memakai sertifikat gratis selama DNS keduanya berstatus Proxied dan zona aktif. Hostname bertingkat seperti `ckan.data.silirdev.com` tidak tercakup Universal SSL standar. Untuk hostname bertingkat yang tetap menggunakan Cloudflare Tunnel, jangan mengandalkan Total TLS: Cloudflare menyatakan Total TLS tidak menerbitkan sertifikat untuk hostname yang digunakan dengan Cloudflare Tunnel. Gunakan salah satu dari: (1) beralih ke hostname satu tingkat (direkomendasikan), (2) pesan Advanced Certificate secara manual dengan SAN hostname lengkap, (3) unggah custom certificate dengan SAN yang sesuai, atau (4) gunakan CNAME/Partial Setup yang menyediakan Universal SSL per subdomain. Rujukan: [Universal SSL hostname coverage](https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/limitations/) dan [Total TLS limitations for Cloudflare Tunnel](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/total-tls/).

Untuk hostname bertingkat yang wajib dipertahankan, gunakan Advanced Certificate yang dipesan manual dengan SAN yang tepat, custom certificate, atau ubah zona ke CNAME/Partial Setup yang mendukung Universal SSL per subdomain. Total TLS bukan pilihan untuk hostname yang digunakan dengan Cloudflare Tunnel. Pada semua opsi, record DNS hostname harus **Proxied** (awan oranye) dan route Tunnel tetap menunjuk ke `http://edge-tunnel:80`. Sertifikat browser diterbitkan di sisi Cloudflare; origin HTTP internal `cloudflared` ke Caddy bukan alasan untuk mengganti hostname. Jangan mengaktifkan DNS-only untuk hostname Tunnel.

Setelah sertifikat mencakup hostname, verifikasi:

```bash
openssl s_client -connect ckan.silirdev.com:443 -servername ckan.silirdev.com </dev/null 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates -ext subjectAltName
curl -Iv https://ckan.silirdev.com/
```

Pastikan SAN mencantumkan `ckan.silirdev.com`, masa berlaku aktif, dan request tidak dialihkan ke hostname lama yang lain. `sync-env.py` akan mempertahankan host yang ada dan hanya memberi peringatan cakupan sertifikat. **Biarkan `CKAN_SITE_URL` mengikuti `PUBLIC_HOST`** agar metadata katalog, ekspor, dan tautan unduhan CKAN tetap menunjuk ke portal publik. `CKAN_ADMIN_URL` dan `NEXT_PUBLIC_CKAN_ADMIN_URL` mengikuti `CKAN_HOST` secara terpisah untuk tombol Portal Pengelola dan normalisasi URL resource admin.

Gunakan **satu named/remote-managed Cloudflare Tunnel** untuk kedua hostname. `cloudflared` di Docker menghubungkan Tunnel ke Caddy internal pada `edge-tunnel:80`; Caddy memilih aplikasi berdasarkan hostname. Tidak perlu menerbitkan port 80/443 dari VPS pada mode ini.

1. Pada Cloudflare, pastikan zona domain yang dipakai (`silirdev.com` untuk staging atau `wajokab.go.id` untuk produksi) aktif dan record hostname Tunnel berstatus Proxied. Periksa juga Edge Certificates sebelum menguji HTTPS.
2. Buka **Cloudflare Zero Trust → Networks → Tunnels** lalu buat tunnel bertipe Docker/remote-managed. Salin token tunnel ke `CLOUDFLARE_TUNNEL_TOKEN` pada `.env.ckan`. Jangan masukkan token ke Git, screenshot, atau log.
3. Pada tunnel tersebut, tambahkan dua **Published application routes / Public Hostnames** berikut. Jika UI memisahkan konfigurasi hostname dan service, isi keduanya sesuai tabel ini:

   | Hostname            | Service origin          | Fungsi                                                                 |
   | ------------------- | ----------------------- | ---------------------------------------------------------------------- |
   | `data.silirdev.com` | `http://edge-tunnel:80` | Portal Next.js, API baca, ekspor DCAT, unduhan publik (contoh staging) |
   | `ckan.silirdev.com` | `http://edge-tunnel:80` | Login dan administrasi CKAN (contoh staging)                           |

   Untuk produksi, gunakan nilai `PUBLIC_HOST` dan `CKAN_HOST` yang telah ditentukan di `.env.ckan.example` atau file `.env.ckan` aktif. Jangan menambahkan route yang berbeda dari hostname pada konfigurasi tersebut.

   Keduanya sengaja menuju origin yang sama. Caddy yang memisahkan route; jangan arahkan `ckan` langsung ke service `ckan`, `nginx`, atau port PostgreSQL.

4. Jalankan validasi lalu start:

   ```bash
   bash ./deploy/ckan/compose.sh cloudflare config
   bash ./deploy/ckan/compose.sh cloudflare up -d --build
   bash ./deploy/ckan/compose.sh cloudflare ps
   ```

5. Verifikasi route:

   ```bash
   # Staging
   curl -sSI https://data.silirdev.com/
   curl -sSI https://ckan.silirdev.com/
   curl -sS 'https://data.silirdev.com/api/3/action/status_show'

   # Ganti kedua hostname dengan PUBLIC_HOST dan CKAN_HOST pada .env.ckan bila memakai domain produksi.
   ```

   Homepage pertama harus berasal dari Next.js. Host admin kedua seharusnya mengembalikan redirect ke `/user/login?came_from=%2Fdashboard%2Fdatasets`. Setelah login berhasil, pengguna kembali ke dashboard dataset (bukan layar konfigurasi yang hanya dapat diakses sysadmin). Setelah itu buka URL admin di browser; halaman login harus memakai tema Wajo. Kalau `502` muncul, cek status dan log `cloudflared`, `edge-tunnel`, `nextjs`, `ckan`, dan `nginx` dengan `bash ./deploy/ckan/compose.sh cloudflare logs --tail=150 cloudflared edge-tunnel nextjs ckan nginx`.

**DNS:** untuk remote-managed Tunnel, penambahan hostname pada konfigurasi Tunnel biasanya membuat record DNS tunnel otomatis. Pastikan kedua hostname ditampilkan di daftar routes Tunnel, dan DNS masing-masing mengarah ke target `*.cfargotunnel.com` milik Tunnel tersebut. Jangan membuat record A ke IP VPS untuk kedua hostname pada mode Tunnel.

## Diagnostik CKAN tidak sehat

Jika `compose up` melaporkan `ckan is unhealthy`, ambil log aplikasi dan hasil
healthcheck sebelum mengulang deployment:

```bash
bash ./deploy/ckan/compose.sh cloudflare logs --tail=200 ckan

docker inspect upstream-ckan-1 \
  --format '{{range .State.Health.Log}}{{println .Output}}{{end}}'
```

Periksa juga konfigurasi plugin yang sudah dinormalisasi bootstrap:

```bash
grep '^CKAN__PLUGINS=' .env.ckan
grep '^CKAN__VIEWS__DEFAULT_VIEWS=' .env.ckan
```

CKAN 2.12 tidak mendukung plugin Recline. Daftar plugin tidak boleh memuat
`recline_view` atau `esri_shapefile_view`; gunakan `datatables_view` dan `shp_view`.
Jalankan ulang bootstrap setelah pembaruan source agar ID lama pada `.env.ckan`
dibersihkan. Jangan menghapus volume database atau filestore untuk mengatasi
container yang tidak sehat.

### uWSGI startup environment

Image CKAN Wajo mendefinisikan `EXTRA_UWSGI_OPTS` sebagai string kosong secara default. CKAN 2.12.1 upstream membaca variabel ini saat menyusun argumen uWSGI; tanpa nilai default, shell dengan `nounset` dapat menghentikan startup dengan pesan `EXTRA_UWSGI_OPTS: unbound variable`. Isi variabel hanya bila diperlukan untuk menambahkan opsi uWSGI khusus.

## 3. Akses admin dan keamanan

`CKAN_ADMIN_GATE_MODE=none` adalah default: hostname admin langsung membuka form login CKAN tanpa prompt Basic Auth tambahan. Login dan izin CKAN tetap berlaku. Root redirect tidak menjadikan seluruh UI CKAN privat; jika ingin menambah lapisan perimeter, pilih satu mode di `.env.ckan`:

- `basic_auth`: Basic Auth pada Caddy di profil `manual` atau `cloudflare`.
- `cloudflare_access`: pasang aplikasi Access dan allow-list admin dahulu, lalu jalankan profil `cloudflare-access`.

Jalankan tepat satu profil ingress (`manual`, `cloudflare`, atau `cloudflare-access`). Header `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet, noimageindex` di semua respons hostname admin merupakan instruksi crawler, bukan kontrol keamanan. `robots.txt` sengaja tidak memblokir crawling agar crawler dapat membaca header tersebut; sitemap admin merespons 404.

Jangan membuka port host PostgreSQL, Solr, Redis, CKAN, Nginx CKAN, atau Next.js. Pada mode Tunnel, hanya koneksi Docker privat dari `cloudflared` ke Caddy yang dibutuhkan. Pada mode manual, hanya Caddy yang menerbitkan TCP 80/443.

## 4. Akun sysadmin awal

Pada provisioning pertama, CKAN Docker membuat akun dari `CKAN_SYSADMIN_NAME`, `CKAN_SYSADMIN_PASSWORD`, dan `CKAN_SYSADMIN_EMAIL`. Default username proyek adalah `ckan_admin`. Bootstrap mengganti `GENERATE_ON_BOOTSTRAP` dengan password acak 64 karakter heksadesimal dan menyimpannya di `.env.ckan` (permission `600`).

Tampilkan credential pada terminal server:

```bash
grep -E '^CKAN_SYSADMIN_(NAME|PASSWORD|EMAIL)=' .env.ckan
```

Isi `CKAN_SYSADMIN_EMAIL` dengan mailbox terkelola sebelum provisioning pertama. Jika database sudah terinisialisasi, perubahan nilai environment tidak mereset password di database. Reset melalui CLI:

```bash
bash ./deploy/ckan/compose.sh cloudflare exec ckan ckan user setpass ckan_admin
```

Jangan membagikan `.env.ckan` atau memasukkan credential ke repository.

## 5. Integrasi SDI dan Harvest

Pada pola integrasi SDI, Sekretariat SDI Pusat membuat harvest source di portal pusat untuk mengambil metadata dari Portal Data Instansi. Portal Wajo tidak harus menjalankan `ckanext-harvest` agar dapat dipanen oleh pusat; katalog CKAN/API Wajo harus tersedia sesuai persyaratan integrasi.

`ckanext-harvest` versi `1.6.3` di instalasi Wajo berfungsi untuk arah sebaliknya, yaitu menarik katalog CKAN/DCAT lain ke CKAN Wajo. Worker `harvest-gather` dan `harvest-fetch` menjalankan antrean proses tersebut. Tidak ada katalog yang diimpor sebelum harvest source dibuat dan diaktifkan. Dokumen kebijakan integrasi menjelaskan proses pada Portal SDI Pusat, tetapi tidak mengidentifikasi package dan versi extension pada server pusat.

Untuk integrasi pusat, endpoint baca katalog pada `CKAN_HOST` harus dapat dijangkau tanpa login manusia. Hindari Basic Auth atau Cloudflare Access yang memblokir seluruh hostname CKAN; terapkan pengecualian untuk endpoint baca publik yang diperlukan harvester. CKAN tetap mengatur autentikasi operasi tulis dan halaman administrasi.

## 6. Theme admin Wajo

Bootstrap menyalin `deploy/ckan/theme/` ke build context CKAN dan memasang package `ckanext-wajo-theme`. Plugin `wajo_theme` mendaftarkan template override dan WebAssets CSS, serta mengganti blok logo header dengan identitas Portal Satu Data. CSS ditambahkan ke `base.html` sehingga digunakan oleh login, dashboard, form dataset/resource, organisasi, konfigurasi dan halaman admin lainnya.

Theme dibangun di atas Midnight Blue bawaan CKAN 2.12, sehingga form, navigation, CSRF, autentikasi, dan alur permission CKAN tetap berasal dari CKAN. `ckanext-theming` tidak diaktifkan: extension itu masih berupa prototipe dan tidak ditemukan sebagai dependency dalam source arsip yang diterima. Untuk mengubah warna/layout, edit `deploy/ckan/theme/ckanext/wajo_theme/assets/css/wajo-theme.css`. Untuk mengubah identitas header, edit `templates/header.html`; untuk memelihara versi plugin, edit `setup.py`.

Hostname CKAN Admin hanya menjadi antarmuka autentikasi dan administrasi. Caddy meneruskan allowlist route admin, API, dan static assets; route HTML lain diarahkan ke dashboard sehingga katalog publik tidak menduplikasi Next.js. Pastikan setiap fitur admin/extension baru menambahkan route yang diperlukan ke matcher `@adminActions` pada seluruh varian Caddy yang digunakan. Bundle Wajo tidak memakai filter `cssrewrite`: stylesheet saat ini tidak memiliki referensi `url()` dan filter tersebut menyebabkan WebAssets gagal memetakan URL sumber CSS pada login CKAN.

Setelah mengubah theme, jalankan `bash ./deploy/ckan/bootstrap-upstream.sh` untuk menyalin source theme ke build context, lalu bangun ulang image dan recreate CKAN:

```bash
bash ./deploy/ckan/compose.sh cloudflare up -d --build --force-recreate ckan
```

Ganti `cloudflare` dengan `manual` untuk ingress manual. Jika tampilan lama masih muncul, cek asset bundle CKAN dan cache browser; bila diperlukan jalankan recreate setelah build, bukan mengedit file di `deploy/ckan/upstream` karena folder itu dihasilkan bootstrap.

## 7. Audit theme dan penerimaan UI admin

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

Periksa juga `https://ckan.silirdev.com/logo-kabupaten-wajo.webp` harus merespons `200` dengan `Content-Type: image/webp`, dan asset CSS hasil WebAssets harus merespons `200`. Bila logo 404, pastikan `CKAN__SITE_LOGO=/logo-kabupaten-wajo.webp`; `add_public_directory()` memang mengekspos isi folder `public` pada URL root, bukan di bawah `/base/`.

Validasi source yang tersedia: `bash scripts/check-static.sh` menjalankan guard theme, packaging overlay, route publik, API contract, dan pemeriksaan CSS. `npm run check:static` memakai entry point yang sama; `npm run check` menambahkan ESLint. `npm run test`, `npm run test:e2e`, dan `npm run build` menguji aplikasi publik Next.js. CI smoke image memasang package theme lokal sebelum memeriksa entry point. Pengujian visual semua halaman CKAN tetap wajib dilakukan pada container CKAN yang benar-benar berjalan; pemeriksaan source/CI tidak menggantikan browser acceptance test.

## 8. Persiapan data dan extension

Extension CKAN dipin dalam source dan dipasang oleh bootstrap:

| Extension            | Fungsi                                                                                                                                                                                                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ckanext-scheming`   | Field metadata dataset dan resource, termasuk periode, metodologi, satuan, versi, dan catatan revisi                                                                                                                                                                  |
| `ckanext-pages`      | Halaman informasi yang dikelola melalui CKAN; dibangun dari commit upstream `28eba99ad85d3b9037f5aaddad1f083300c69041` (PR #149). Build melengkapi metadata wheel agar deklarasi konfigurasi dan migrasi Alembic ikut terpasang; lihat `deploy/ckan/install-pages.py` |
| `ckanext-dcat`       | Ekspor katalog DCAT/RDF dan harvesting DCAT                                                                                                                                                                                                                           |
| `ckanext-geoview`    | Viewer resource geospasial pada CKAN Admin                                                                                                                                                                                                                            |
| `ckanext-harvest`    | Impor katalog CKAN/DCAT dari sumber eksternal ke CKAN Wajo                                                                                                                                                                                                            |
| `ckanext-xloader`    | Memuat resource tabular ke DataStore menggunakan worker (2.6.0; chardet 7.6.0)                                                                                                                                                                                        |
| `ckanext-wajo-theme` | Branding dan stylesheet admin Wajo                                                                                                                                                                                                                                    |

**Catatan packaging Pages:** commit upstream yang mendukung CKAN 2.12 masih memiliki masalah wheel yang tidak menyertakan `config_declaration.yaml` dan berkas migrasi Alembic (upstream issue [#150](https://github.com/ckan/ckanext-pages/issues/150)). Saat build, `install-pages.py` melengkapi `pyproject.toml` dan `MANIFEST.in`, membangun wheel, memverifikasi file konfigurasi/migrasi, lalu mengimpor plugin Pages dan Wajo sebelum image dinyatakan siap.

Setelah CKAN dan DB pertama kali sehat, dari root repo jalankan:

```bash
bash ./deploy/ckan/apply-datastore-permissions.sh
bash ./deploy/ckan/enable-xloader.sh cloudflare
```

Buat dataset publik di CKAN Admin. Untuk menampilkan konten khusus portal, gunakan tag yang sesuai: `portal-indikator`, `portal-infografik`, atau `portal-publikasi`. Indikator membutuhkan resource tabular yang telah dimuat ke DataStore; kolom minimum adalah `period`, `region`, dan `value`. Detail format field tersedia pada schema `schemas/dataset.yaml` serta panduan portal di `/api-data`.

## 9. Verifikasi source image CKAN 2.12.1

Bootstrap menyimpan commit source pada `deploy/ckan/.ckan-base-source.lock` dan commit yang sudah dibangun pada `deploy/ckan/.ckan-base-image.lock` (keduanya generated/ignored). Untuk sinkronisasi atau build manual:

```bash
bash ./deploy/ckan/sync-ckan-base-source.sh
bash ./deploy/ckan/prepare-ckan-base.sh
docker image inspect ckan/ckan-base:2.12.1 --format '{{.Id}} {{range .Config.Env}}{{println .}}{{end}}'
```

Image harus memperlihatkan `CKAN_REF=ckan-2.12.1`. Script `compose.sh ... up` menjalankan pemeriksaan dan build ini otomatis; build dilewati hanya bila commit upstream, image ID CKAN, dan ID runtime Python sama dengan lock yang berhasil diverifikasi. Untuk memaksa rebuild dari source terbaru dan Python base yang baru ditarik, jalankan `CKAN_BASE_FORCE_REBUILD=1 bash ./deploy/ckan/compose.sh cloudflare up -d --build`. Jika upstream `main` belum menyetel `ckan-2.12/VERSION.txt` ke `2.12.1`, deployment berhenti dan tidak diam-diam memakai versi lain.

## 10. DNS manual tanpa Tunnel

Jika VPS menerima inbound HTTPS, arahkan A record kedua hostname ke IP VPS, buka TCP 80/443 pada firewall, lalu jalankan:

```bash
bash ./deploy/ckan/compose.sh manual config
bash ./deploy/ckan/compose.sh manual up -d --build
```

Caddy menangani sertifikat TLS. Jangan jalankan profil manual dan Tunnel bersamaan untuk deployment yang sama. Pastikan hanya service Caddy yang memublikasikan port web.

## 11. Pembaruan dan diagnosa

Sebelum deployment, jalankan `npm run check`, `npm run test`, `npm run build`, `python3 scripts/check-build.py`, dan `bash ./deploy/ckan/compose.sh cloudflare config`. Setelah deploy, periksa `bash ./deploy/ckan/compose.sh cloudflare ps` dan log service. Backup PostgreSQL CKAN, volume filestore, serta indeks Solr; uji pemulihan sebelum upgrade. Jangan menghapus volume ketika membangun ulang image.

## 12. CMS konten publik

CKAN Pages digunakan sebagai headless CMS untuk Next.js. Pengelolaan konten, field editorial, content blocks, SEO, media, privasi, dan alur publikasi dijelaskan pada [`docs/CMS.md`](../../docs/CMS.md).

## Healthcheck CKAN

Healthcheck CKAN memakai Python standard library untuk meminta `http://127.0.0.1:5000/api/action/status_show` dan memastikan payload memiliki `success: true`. Pemeriksaan tidak bergantung pada `wget`. `start_period: 90s`, interval 30 detik, timeout 10 detik, dan lima retry memberi waktu untuk proses upgrade/migrasi sebelum service lain bergantung pada status `healthy`.
