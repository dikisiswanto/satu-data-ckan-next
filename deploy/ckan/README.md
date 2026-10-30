# Deployment CKAN 2.12 + Next.js

Panduan ini menyiapkan portal publik Next.js dengan CKAN 2.12 sebagai katalog dan antarmuka administrasi. Source lengkap deployment Compose diambil dari repositori resmi `ckan/ckan-docker` saat bootstrap; repositori `ckan/ckan-docker-base` saja hanya berisi image base.

## Domain dan routing

Rekomendasi memakai **satu hostname publik yang diindeks** dan hostname admin terpisah; login/otorisasi CKAN selalu aktif, sementara gerbang perimeter dapat dipilih sesuai kebutuhan:

| Hostname | Tujuan | Akses |
|---|---|---|
| `data.wajokab.go.id` | Next.js, katalog, statistik, infografik, organisasi, dokumentasi API | Publik, bisa diindeks |
| `ckan.data.wajokab.go.id` | Antarmuka pengelolaan CKAN | Root langsung diarahkan ke form login CKAN; gerbang Caddy opsional melalui `basic_auth` atau Cloudflare Access |

API baca CKAN dipublikasikan pada origin yang sama dengan portal: `https://data.wajokab.go.id/api/3/action/*`. Tidak perlu `api.data.wajokab.go.id`. Hanya action baca yang diizinkan; method selain GET/HEAD/OPTIONS serta action mutasi ditolak. PostgreSQL, Solr, Redis, CKAN, dan Next.js tidak memublikasikan host ports.

**UI publik native CKAN tidak diekspos sebagai situs publik kedua.** Pada hostname `data.wajokab.go.id`, Caddy hanya meneruskan endpoint ekspor DCAT dan path unduhan resource publik ke CKAN; semua halaman lain diarahkan ke Next.js. Pada hostname `ckan.data.wajokab.go.id`, permintaan root `/` diarahkan ke `/user/login` dengan tujuan setelah login ke `/ckan-admin/config/`, bukan halaman beranda publik CKAN. Secara default tidak ada prompt Basic Auth Caddy tambahan; autentikasi dan otorisasi CKAN tetap berlaku untuk aksi terlindungi. Jika ingin gerbang perimeter, gunakan `CKAN_ADMIN_GATE_MODE=basic_auth` atau `cloudflare_access`. Redirect root ini hanya mengubah landing page dan tidak memblokir semua URL publik CKAN jika pengguna mengetik jalur lain secara langsung. Unduhan publik hanya lewat hostname publik. Ini menjaga CKAN Admin dapat dipakai untuk mengelola metadata, Scheming, GeoView, Pages dan Harvest tanpa menjadikan CKAN sebagai frontend publik atau mematikan UI yang diperlukan administrator.

Admin memakai hostname terpisah karena CKAN merupakan aplikasi administratif tersendiri. Seluruh respons pada hostname admin diberi `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet, noimageindex`; robots.txt admin tidak memblokir crawling agar crawler bisa membaca instruksi noindex, dan sitemap admin mengembalikan 404. Sitemap untuk konten publik tetap berasal dari Next.js. `noindex` hanya mengatur crawler. Dalam mode default `none`, write/admin actions tetap dilindungi autentikasi/otorisasi CKAN, tetapi CKAN UI dan dataset publik masih dapat dicapai jika URL-nya diketahui. Basic Auth atau Cloudflare Access adalah opsi pertahanan perimeter tambahan, bukan syarat untuk menampilkan form login.

Panduan singkat penerapan redirect login dan pilihan gerbang tersedia di [`docs/CKAN-ADMIN-LOGIN.md`](../../docs/CKAN-ADMIN-LOGIN.md).

## Modernisasi UI CKAN Admin

Deployment mengaktifkan tema **Midnight Blue** bawaan CKAN 2.12 melalui `CKAN__BASE_PUBLIC_FOLDER=public-midnight-blue` dan `CKAN__BASE_TEMPLATES_FOLDER=templates-midnight-blue`. Tema ini memodernisasi UI CKAN termasuk halaman admin; desain portal publik Next.js tidak berubah. Tidak ada dependency tema tambahan. Pertimbangan terhadap `ckanext-theming` dan `ckanext-mlc-theme` dicatat pada [`EXTENSIONS.md`](EXTENSIONS.md).

## Bootstrap sekali

Jalankan dari root repository:

```bash
cp .env.ckan.example .env.ckan
# Ubah PUBLIC_HOST, CKAN_HOST, dan branding di .env.ckan sebelum bootstrap.
./deploy/ckan/bootstrap-upstream.sh
# Setelah bootstrap, sesuaikan CKAN_SYSADMIN_EMAIL di .env.ckan sebelum first up.
```

Bootstrap mengkloning `https://github.com/ckan/ckan-docker.git` ke `deploy/ckan/upstream`, mematok `ckan/ckan-base:2.12.1`, menyesuaikan image Solr untuk CKAN 2.12, mengganti default secret lemah, menyiapkan Caddy Basic Auth hanya jika `CKAN_ADMIN_GATE_MODE=basic_auth` (tidak pada `none` atau `cloudflare_access`), memasang extension yang dipatok (Scheming, Pages, DCAT/Structured Data, GeoView, Harvest, dan XLoader), mengaktifkan plugin `scheming_datasets`, `pages`, `dcat`, `dcat_rdf_harvester`, `structured_data`, GeoView, `harvest`, `ckan_harvester`, DataStore, XLoader, dan viewer bawaan; menghapus service DataPusher legacy; menyiapkan worker XLoader berbasis CKAN Jobs/Redis; lalu menyalin Next.js Compose override. Ia tidak menjalankan container. Setelah stack sehat, jalankan `./deploy/ckan/apply-datastore-permissions.sh`, lalu `./deploy/ckan/enable-xloader.sh manual` (atau `cloudflare` sesuai profil) untuk membuat token API XLoader dan memuatnya ulang hanya pada CKAN serta worker.

`.env.ckan` adalah satu-satunya file konfigurasi deployment. Bootstrap menggabungkan default stack CKAN resmi ke file ini. File `deploy/ckan/upstream/.env.generated` dirender otomatis dari `.env.ckan` sebelum setiap perintah Compose, karena upstream menggunakan `env_file`; file itu hanya output terfilter dan tidak boleh diedit. Token Cloudflare, password/hash Basic Auth Caddy, variabel `NEXT_PUBLIC_*`, dan token/jobs URI khusus XLoader dikecualikan dari env bersama upstream. Token dan jobs URI XLoader dipasok langsung hanya ke service CKAN dan `xloader-worker`; token dibuat oleh `enable-xloader.sh` serta disimpan dalam `.env.ckan` berizin `600`. Semua hostname, branding, email admin CKAN, worker, secrets, dan konfigurasi extension tetap diatur dari `.env.ckan`; jangan commit file tersebut.

## Opsi A — Cloudflare DNS + Cloudflare Tunnel

Pilih opsi ini jika DNS dikelola Cloudflare dan port HTTP/HTTPS VPS tidak perlu terbuka ke Internet. Ada dua varian gerbang admin.

### Varian A1 — Tanpa prompt tambahan (default)

Gunakan `CKAN_ADMIN_GATE_MODE=none` dan profil `cloudflare`. Membuka root `https://ckan.data.wajokab.go.id` langsung diarahkan ke form login CKAN. Ini tidak menyembunyikan semua route publik CKAN; keamanan pengubahan data tetap dikelola CKAN.

### Varian A2 — Basic Auth Caddy (opsional)

Gunakan `CKAN_ADMIN_GATE_MODE=basic_auth` dan profil `cloudflare`. Gerbang tambahan diaktifkan lewat overlay Compose, jadi admin melewati Basic Auth lalu login CKAN.

### Varian A3 — Cloudflare Access menggantikan Basic Auth (opsional)

Gunakan `CKAN_ADMIN_GATE_MODE=cloudflare_access` dan profil `cloudflare-access`. Ini menghilangkan prompt Basic Auth Caddy; login CKAN tetap ada untuk hak akses akun dan organisasi. Sebelum menjalankan profil ini, wajib buat Cloudflare Access **Self-hosted application** untuk hostname `ckan.data.wajokab.go.id`, gunakan Allow policy yang hanya mencantumkan email/kelompok admin yang diizinkan, dan jangan buat Bypass/Allow publik. Saran session Access 7 hari untuk perangkat admin tepercaya (sesuaikan kebijakan organisasi); Access menyimpan sesi sampai masa aktif habis, sedangkan CKAN mempunyai sesi login terpisah. Jadi ini mengurangi frekuensi autentikasi, tetapi **belum single sign-on**. Jika benar-benar ingin satu login, butuh integrasi OIDC/SSO ke CKAN dengan pemetaan identitas dan role CKAN.

Jangan jalankan profil `cloudflare-access` sebelum policy Access aktif. Jika ingin langsung menampilkan form login CKAN, gunakan mode `none`. Jika ingin gerbang tambahan, pilih `basic_auth` atau Cloudflare Access.

1. Buat **named/remote-managed Tunnel** pada Cloudflare Zero Trust.
2. Masukkan token tunnel di `CLOUDFLARE_TUNNEL_TOKEN` dalam `.env.ckan`.
3. Tambahkan hostname `data.wajokab.go.id` dan `ckan.data.wajokab.go.id` pada tunnel, keduanya dengan service origin `http://edge-tunnel:80`.
4. Jalankan profil Tunnel dari root repo:

```bash
./deploy/ckan/compose.sh cloudflare config
./deploy/ckan/compose.sh cloudflare up -d --build
# Alternatif setelah Cloudflare Access app/policy dibuat:
# Default: CKAN_ADMIN_GATE_MODE=none -> login CKAN langsung tanpa Basic Auth Caddy.
# Optional Basic Auth: set CKAN_ADMIN_GATE_MODE=basic_auth; wrapper memasang overlay auth.
# Optional Cloudflare Access: set CKAN_ADMIN_GATE_MODE=cloudflare_access lalu gunakan cloudflare-access.
```

Cloudflare menangani TLS publik. Koneksi dari `cloudflared` ke Caddy menggunakan HTTP hanya di jaringan privat Docker. Caddy kemudian merutekan portal ke Next.js dan admin ke Nginx bawaan CKAN. Service `cloudflared` hanya bergabung dengan jaringan Tunnel, bukan jaringan database.

## Opsi B — DNS biasa/manual + Caddy HTTPS

Pilih opsi ini jika DNS tidak dikelola Cloudflare atau origin menerima HTTPS langsung.

1. Buat A record untuk `data.wajokab.go.id` dan `ckan.data.wajokab.go.id` menuju IP publik VPS. Tambahkan AAAA hanya bila IPv6 benar-benar dikonfigurasi.
2. Buka TCP 80 dan 443 pada firewall provider dan firewall OS. Pastikan tidak ada reverse proxy lain memakai port tersebut.
3. Jalankan profil manual:

```bash
./deploy/ckan/compose.sh manual config
./deploy/ckan/compose.sh manual up -d --build
```

Caddy mengurus redirect HTTPS, penerbitan sertifikat, dan pembaruan sertifikat. Hanya service Caddy yang memublikasikan port host. Jangan menjalankan kedua profil secara bersamaan pada deployment yang sama.

## Konvensi data publik CKAN

### Dataset biasa

Dataset dan organisasi ditampilkan langsung dari objek native CKAN (`name`, `title`, `notes`, `organization`, `groups`, `tags`, `resources`, `metadata_created`, `metadata_modified`). Resource yang mengaktifkan DataStore dapat dipratinjau; file lainnya diunduh melalui URL resource yang memang public.

### Indikator statistik (`/statistik`)

- Buat dataset **public** dan tambahkan tag `portal-indikator`.
- Tambahkan resource tabular dan aktifkan DataStore di CKAN.
- Kolom yang dibaca: `period`, `region`, `value`; `unit` dan `source` opsional. Format contoh tersedia pada `public/templates/data-deret-indikator.csv`.
- Field ekstra opsional: `portal_unit`, `portal_periodicity`, `portal_definition`, `portal_formula`, `portal_source`, `portal_geography`, `portal_reference_period`.
- Bootstrap mengaktifkan plugin CKAN `datastore` dan `xloader`, menghapus service DataPusher, serta menjalankan `xloader-worker` dengan perintah `ckan -c /srv/app/ckan.ini jobs worker`. Setelah CKAN pertama kali sehat, jalankan `./deploy/ckan/apply-datastore-permissions.sh`, lalu `./deploy/ckan/enable-xloader.sh manual` (atau `cloudflare`) untuk membuat token sysadmin dan recreate CKAN/worker. Baris resource DataStore menjadi sumber grafik dan tabel; metadata indikator tetap melekat pada dataset CKAN, bukan database paralel. Pantau `./deploy/ckan/compose.sh manual logs -f ckan xloader-worker`.
- Mode cepat default XLoader memakai PostgreSQL `COPY` dan menyimpan kolom sebagai `text` tanpa menebak tipe. Ini menghindari kegagalan akibat data campuran, tetapi field angka/tanggal yang dipakai untuk filter, agregasi, atau analitik di CKAN perlu disetel lewat Data Dictionary. Pengaturan `ckanext.xloader.use_type_guessing=true` bisa menebak tipe, tetapi lebih lambat dan lebih rentan gagal pada nilai tak konsisten. UI grafik portal sudah menormalkan string numerik yang valid; tetap uji impor CSV nyata dan DataStore API sebelum produksi.

### Infografik (`/infografik`)

- Buat dataset **public** dengan tag `portal-infografik`.
- Tambahkan resource gambar PNG/JPG/WebP/GIF/AVIF untuk cover. File PDF dan resource lain ditampilkan sebagai unduhan.
- Field ekstra opsional: `portal_category`, `portal_period`, `portal_attribution`.
- Judul, deskripsi, organisasi, dan file mengikuti metadata serta izin resource CKAN.

Form metadata admin menggunakan `ckanext-scheming` dan schema versioned pada `deploy/ckan/schemas/dataset.yaml`; detail extension, versi pin, aktivasi dan batas kompatibilitas ada di [`EXTENSIONS.md`](EXTENSIONS.md). `ckanext-geoview` menyediakan viewer GeoJSON/WMS/WFS/WMTS dan format geospasial yang didukung pada CKAN Admin. Next.js menambahkan preview GeoJSON ringan berbasis resource publik dari CKAN, bukan layer atau koordinat contoh. File dibatasi hingga 5 MiB, 2.000 fitur dan 20.000 koordinat untuk menjaga kinerja browser; dataset besar bisa diunduh ke QGIS atau aplikasi GIS. Field dan tag tetap harus diisi dengan konsisten; schema tidak menggantikan proses tata kelola, validasi sumber, atau review statistik.

## API read-only dan kesiapan harvesting

Base URL: `https://data.wajokab.go.id/api/3/action`. Base URL sumber untuk CKAN Harvester adalah `https://data.wajokab.go.id` (tanpa suffix `/api/3/action`); gunakan host publik, bukan host admin. `package_search` mendukung `sort` yang dibatasi (`id asc` diperlukan untuk paginasi harvester) dan `fq` terbatas pada filter organization/groups dan `metadata_modified` untuk proses incremental. Ini menyiapkan interoperabilitas CKAN-native; pendaftaran dan uji penerimaan dengan SDI tetap perlu dilakukan terpisah.

Action yang diizinkan: `status_show`, `package_search`, `package_show`, `package_activity_list`, `organization_list`, `organization_show`, `group_list`, `group_show`, `tag_list`, `resource_show`, `file_show`, `datastore_search`. DCAT export (mis. `/catalog.rdf`, `/catalog.ttl`, `/catalog.jsonld`) dirutekan langsung ke CKAN untuk interoperabilitas; ekspor katalog bukan bagian dari Action API proxy Next.js. Pada `datastore_search` publik hanya `resource_id`, `limit`, dan `offset` yang diteruskan; pencarian `q`, `filters`, dan `sort` tidak diteruskan pada facade publik untuk menjaga permukaan API dan biaya query tetap sempit meski image 2.12.1 digunakan. Pada `package_search`, query kata kunci biasa tetap dibatasi; `sort` dan `fq` hanya mendukung subset untuk CKAN Harvester, sedangkan sintaks Solr bebas ditolak. Parameter lain tetap ditolak. API CKAN pada host admin tetap dibatasi gerbang perimeter sesuai mode yang dipilih. Response mengikuti envelope CKAN (`help`, `success`, `result`); API ditandai `X-Robots-Tag: noindex, nofollow, noarchive`. Endpoint lama `/api/v1/*` tidak disediakan.

## Smoke test setelah deploy

1. Pastikan `https://data.wajokab.go.id` memuat portal publik dan canonical URL memakai hostname ini saja.
2. Pastikan `https://data.wajokab.go.id/api/3/action/package_search?q=pendidikan&rows=10` mengembalikan envelope `success/result` dan header `X-Robots-Tag` noindex.
3. Pastikan action mutasi seperti `/api/3/action/package_create` mendapatkan 404.
4. Untuk `CKAN_ADMIN_GATE_MODE=none`, pastikan `https://ckan.data.wajokab.go.id/` mengembalikan redirect ke `/user/login?came_from=...` dan form login CKAN tampil langsung. Untuk mode `basic_auth`, pastikan gerbang Caddy menantang login sebelum form CKAN. Untuk mode `cloudflare_access`, pastikan Cloudflare Access membatasi host sebelum login CKAN.
5. Pastikan resource download publik tetap mengikuti izin CKAN dan file privat tidak terbuka.
6. Dari `deploy/ckan/upstream`, jalankan `../../../deploy/ckan/apply-datastore-permissions.sh` setelah CKAN dan database sehat. CKAN 2.12 mewajibkan pembaruan permission DataStore; jangan melewati langkah ini.
7. Buat dataset contoh bertag `portal-indikator` dengan DataStore aktif dan dataset bertag `portal-infografik`; pastikan keduanya muncul pada halaman publik.
8. Periksa `./deploy/ckan/compose.sh manual config` (atau profil `cloudflare`) sebelum start dan `./deploy/ckan/compose.sh manual ps` sesudah start. Tidak ada port host untuk CKAN Nginx, CKAN, PostgreSQL, Solr, Redis, atau Next.js.

## Extension CKAN dan UI publik

Extension resmi yang dipatok beserta fungsi dan batas aktivasi dijelaskan pada [`EXTENSIONS.md`](EXTENSIONS.md). CKAN menjadi sumber data dan admin; Next.js menyajikan pratinjau DataStore dengan tabel/grafik, viewer gambar/PDF, indikator tren, infografik, serta publikasi dengan periode, versi rilis, dan catatan revisi. Untuk indikator, tag `portal-indikator` wajib; resource yang memiliki peran `portal_resource_role=data` diprioritaskan. Riwayat aktivitas CKAN ditampilkan sebagai jejak perubahan, bukan klaim snapshot atau rollback nilai data.

### Strategi UI dan CSS

Komponen UI sederhana mengikuti pola shadcn: utility Tailwind ditambah `cn()` dan `cva()` agar variant dan konflik classname mudah dikelola. Radix bukan dependency wajib; gunakan primitive Radix terpilih hanya saat benar-benar ada pola interaksi kompleks (misalnya dialog, menu, atau popover aksesibel), bukan sekadar menambah library. Custom CSS yang memberi tampilan khas dipertahankan untuk menghindari perubahan visual mendadak, tetapi stylesheet global telah dibersihkan dari selector admin/widget legacy yang tidak digunakan oleh frontend publik. Hindari mengubah urutan import di `src/app/globals.css` sebelum meninjau visual dan menjalankan E2E. `npm run check` menjalankan guardrail untuk selector mati dan pola `cn`/`cva`.

## Operasional

- Backup database CKAN, filestore, dan Solr; latih proses restore.
- Jangan mengandalkan `noindex` untuk melindungi data sensitif. Dataset dan resources yang tidak boleh publik harus tetap private di CKAN.
- Untuk mode Tunnel, tidak ada port web host yang perlu dibuka. Untuk mode manual, hanya TCP 80/443 yang diperlukan.
- Bootstrap dan konfigurasi statis perlu diikuti build/test penuh pada server deployment sebelum produksi; paket ini tidak menyertakan checkout source upstream CKAN.
