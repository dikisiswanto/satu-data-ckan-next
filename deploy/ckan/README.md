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

   Homepage pertama harus berasal dari Next.js. Host admin kedua membuka form `/user/login`; middleware CKAN akan meminta login untuk setiap halaman selain login dan aset statis. Setelah login berhasil, pengguna harus tetap berada di hostname CKAN dan diarahkan ke dashboard dataset (bukan ke hostname publik `data.*` atau layar konfigurasi yang hanya dapat diakses sysadmin). Coba juga buka langsung `/dataset`, `/organization`, `/group`, `/pages`, dan `/harvest`; saat belum login semuanya harus kembali ke form login, sedangkan setelah login seluruh menu/fitur yang diizinkan oleh role pengguna harus tampil dan berfungsi. Kalau `502` muncul, cek status dan log `cloudflared`, `edge-tunnel`, `nextjs`, `ckan`, dan `nginx` dengan `bash ./deploy/ckan/compose.sh cloudflare logs --tail=150 cloudflared edge-tunnel nextjs ckan nginx`.

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

Untuk integrasi pusat, gunakan `PUBLIC_HOST` sebagai origin katalog/API publik. `CKAN_HOST` sengaja menjadi hostname administrasi yang mewajibkan login dan tidak boleh dipakai sebagai endpoint harvesting anonim. Public Action API tetap disediakan oleh facade Next.js read-only; ekspor katalog dan unduhan tertentu diteruskan ke CKAN melalui route publik. Jangan menonaktifkan proteksi login pada `CKAN_HOST`.

## 6. Wajo Admin — custom CKAN administration UI

CKAN 2.12.1 tetap menjadi sumber kebenaran untuk data, route, Action API, autentikasi, authorization, form validation, CSRF, upload, DataStore, dan seluruh extension. `ckanext-wajo-theme` menambahkan **Wajo Admin** sebagai pengalaman UI administrasi khusus tanpa memodifikasi source core CKAN.

### Bagian antarmuka

- **Topbar:** logo Kabupaten Wajo, nama Wajo Admin, tautan ke portal publik Next.js, identitas pengguna, akses pengaturan untuk sysadmin, dan tombol logout dengan token CSRF.
- **Sidebar:** Ringkasan, Dataset, Organisasi, Kategori data, Halaman informasi (Pages), Harvesting, Dataset saya, Organisasi saya, Kategori saya, serta Pengguna/Pengaturan CKAN untuk sysadmin. Menu aktif mengikuti path. Tautan fitur tetap menuju endpoint CKAN/extension asli.
- **Ringkasan `/wajo-admin/`:** kartu jumlah dataset yang dapat diakses pengguna, organisasi, kategori/grup, dan dataset yang dibuat pengguna; tabel dataset terbaru; pintasan tambah dataset/organisasi (hanya jika diizinkan); tautan Pages dan Harvest. Angka diambil saat halaman dibuka melalui Action API CKAN, bukan angka statis. Kegagalan satu action dicatat ke log dan tidak membuat dashboard gagal dirender; metrik yang gagal ditampilkan sebagai `—`.
- **Halaman pengelolaan:** dataset, resource, preview, organisasi, grup, pengguna, DataStore, Pages, Harvest, Scheming, dan GeoView tetap memakai route serta template/fungsi native modul CKAN. Design system Wajo menata shell, tabel, formulir, navigasi, alert, tombol, tabs, dropdown, breadcrumb, pagination, dan responsivitasnya.
- **Bahasa:** `id` menjadi locale default dengan `en` sebagai pilihan. Katalog gettext dikompilasi ke CKAN saat Docker image dibuat; terjemahan extension pihak ketiga bergantung pada katalog mereka sendiri.

### Implementasi dan titik pemeliharaan

| File                                                           | Tanggung jawab                                                   |
| -------------------------------------------------------------- | ---------------------------------------------------------------- |
| `theme/ckanext/wajo_theme/templates/header.html`               | Topbar, logo, profil, logout                                     |
| `theme/ckanext/wajo_theme/templates/page.html`                 | Shell yang membungkus halaman admin native                       |
| `theme/ckanext/wajo_theme/templates/wajo_theme/sidebar.html`   | Navigasi dan status aktif                                        |
| `theme/ckanext/wajo_theme/templates/wajo_theme/dashboard.html` | Ringkasan Wajo Admin                                             |
| `theme/ckanext/wajo_theme/assets/css/wajo-theme.css`           | Design system dan styling lintas modul                           |
| `theme/ckanext/wajo_theme/plugin.py`                           | Plugin, middleware host admin, blueprint dashboard, Pages schema |

`page.html` menggunakan `ckan_extends` dan hanya menambahkan shell di sekitar `super()` untuk pengguna yang telah login. Form CRUD tiap modul tidak ditulis ulang. Template tambahan harus tetap aditif dan mengikuti block CKAN 2.12.1; jangan menyalin seluruh template upstream hanya demi styling karena akan membuat maintenance dan upgrade lebih sulit.

Blueprint Wajo Admin terdaftar dengan `url_prefix="/wajo-admin"`. Prefix ini penting: route ringkasan harus tetap `/wajo-admin/`, bukan `/`, untuk menghindari loop ketika middleware mengarahkan root hostname ke halaman ringkasan. Bootstrap menegakkan `CKAN__AUTH__ROUTE_AFTER_LOGIN=wajo_admin.index`, sehingga login berhasil diarahkan ke dashboard Wajo Admin.

### Pemisahan host publik dan host administrasi

Hostname CKAN adalah antarmuka administrasi privat; Next.js tetap menjadi satu-satunya katalog publik. Caddy meneruskan seluruh path `CKAN_HOST` ke CKAN—tanpa allowlist halaman—agar route core dan extension baru tetap terjangkau. Middleware `wajo_theme` mengunci semua halaman dan Action API di hostname admin:

- Pengunjung anonim hanya dapat memuat `/user/login` dan aset statis yang diperlukan untuk halaman login.
- Permintaan halaman lain diarahkan ke login dengan `came_from` agar setelah autentikasi pengguna kembali ke path yang diminta.
- Action API admin tanpa sesi menghasilkan JSON `401`.
- Pengguna yang sudah login dapat membuka route CKAN core maupun extension; izin CRUD tetap tunduk pada permission/role CKAN.
- Middleware hanya berlaku pada `CKANEXT__WAJO_THEME__ADMIN_HOST`; request internal dari Next.js ke service CKAN dan request ke `PUBLIC_HOST` tidak dikunci oleh guard ini.
- Redirect browser dari `CKAN_SITE_URL` dilokalkan kembali ke `CKAN_HOST`. Nilai `CKAN_SITE_URL` tetap menunjuk host publik untuk metadata/ekspor.

Filter `cssrewrite` tidak digunakan pada bundle WebAssets Wajo karena stylesheet tidak menggunakan URL relatif dan filter tersebut pernah gagal memetakan asset ke URL pada halaman login.

### Rebuild setelah perubahan

Bootstrap menyalin source extension ke build context dan menurunkan `CKANEXT__WAJO_THEME__ADMIN_HOST` dari `CKAN_HOST`. Setelah mengubah plugin, template, CSS, atau konfigurasi route-after-login, rebuild CKAN:

```bash
bash ./deploy/ckan/bootstrap-upstream.sh

# Cloudflare Tunnel
bash ./deploy/ckan/compose.sh cloudflare up -d --build --force-recreate ckan edge-tunnel

# Manual ingress (gunakan ini sebagai pengganti perintah di atas)
bash ./deploy/ckan/compose.sh manual up -d --build --force-recreate ckan caddy
```

Jangan menghapus volume database, Solr, Redis, atau filestore untuk menerapkan perubahan theme. Folder `deploy/ckan/upstream` merupakan hasil bootstrap dan tidak diedit manual.

## 7. Audit theme dan penerimaan UI admin

Static guard `scripts/check-theme.py` mem-parsing template Jinja, memeriksa route `/wajo-admin`, locale, kontrak shell, role-aware quick actions, dan scope template. `scripts/check-auth-middleware.py` menguji login guard, redirect, API `401`, dan view dashboard dengan stub Action API. `scripts/check-build.py` membuat wheel `ckanext-wajo-theme` pada direktori sementara lalu memverifikasi bahwa plugin, header/page/sidebar/dashboard, logo, WebAssets/CSS, dan katalog `.po` benar-benar ikut terkemas. `bash scripts/check-static.sh` menjalankan seluruh pemeriksaan tersebut.

Browser acceptance test tetap diperlukan pada container CKAN yang berjalan. Gunakan akun sysadmin dan akun editor/organisasi:

| Area                 | Alur yang harus dicoba                             | Kriteria lulus                                                                                             |
| -------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Login dan shell      | `/`, `/user/login`, login gagal/berhasil, logout   | Anonim hanya melihat login; logo/CSS tampil; login berhasil menuju `/wajo-admin/`; logout kembali ke login |
| Ringkasan            | `/wajo-admin/`                                     | Angka sesuai Action API; kegagalan API tidak merusak dashboard; quick actions mengikuti permission         |
| Dataset              | pencarian, detail, create/edit, resource, preview  | Filter, pagination, Scheming, validasi, upload, visibility, save/cancel dan unduhan berfungsi              |
| Resource & DataStore | add/edit/upload resource, table preview, DataStore | Form, progress/error upload, tabel, toolbar, DataStore query dan pesan error berfungsi                     |
| Organisasi & grup    | index, detail, create/edit, anggota                | Navigasi, facet, tabel anggota, action dan hak akses tetap mengikuti CKAN                                  |
| Pengguna & sistem    | daftar/detail pengguna, konfigurasi, revisi        | Khusus sysadmin sesuai permission; tidak ada akses tambahan yang diberikan oleh theme                      |
| Pages & Harvest      | daftar, form, halaman, harvest source/job/log      | Route extension tetap terbuka setelah login dan worker tidak dipengaruhi oleh CSS/template                 |
| GeoView              | GeoJSON, WMTS, shapefile, peta                     | Viewer tidak tertutup/terpotong oleh shell/sidebar; legenda dan toolbar tetap dapat digunakan              |
| Responsif/a11y       | lebar 1440, 1024, 768, 390, 320 px; keyboard-only  | Tidak ada overflow horizontal; sidebar dapat dibuka/tutup; focus terlihat; reduced motion dihormati        |

Periksa `https://CKAN_HOST/logo-kabupaten-wajo.webp` mengembalikan `200` dengan `Content-Type: image/webp`, dan stylesheet WebAssets merespons `200`. `bash ./deploy/ckan/diagnose-admin.sh` memeriksa pola status yang diharapkan: login `200/302`, dashboard anonim `302`, API admin anonim `401`.

Status source check tidak menggantikan tes browser. Production build CKAN, visual acceptance, upload, DataStore, dan workflow extension harus dijalankan pada VPS/container target sebelum deployment dinyatakan tuntas.

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
