# DataStore, Sinkronisasi, dan Akses Data

Dokumen ini menjelaskan pratinjau data tabular, sinkronisasi katalog, serta pemeriksaan akses untuk dataset dan berkas privat.

## Akses dan Unduhan Dataset Privat

Terakhir ditinjau: 8 November 2026.

CKAN adalah otoritas tunggal untuk otorisasi. Browser hanya meneruskan cookie sesi CKAN (Flask) yang dikonfigurasi ke Next.js; Next.js meneruskan cookie itu ke layanan CKAN internal. Keberadaan cookie tidak otomatis memberi izin. CKAN harus mengembalikan hasil `package_show` atau `package_search` yang berhasil untuk sesi tersebut sebelum dataset privat dapat ditampilkan.

### Model otorisasi

Pada CKAN 2.12, otorisasi `resource_show` di core mendelegasikan pemeriksaan ke `package_show` milik dataset induk. Pemeriksaan itu bukan ACL privat terpisah pada setiap resource. Karena itu, marker kustom `resource.private` tidak dapat dianggap sah hanya dengan memanggil `resource_show` sekali lagi.

Portal menerapkan prinsip _fail closed_ untuk marker kustom/lama yang bernilai benar pada `resource.private` dan `file.private`, meskipun cookie sesi tersedia. Normalisasi `isPrivateMarker` menangani bentuk boolean, numerik, dan string (`true`, `1`, `yes`, `on`, `private`) tanpa menganggap string `false` sebagai nilai privat. Marker tersebut disembunyikan dari respons detail/pencarian package.

Jika privasi per-resource benar-benar dibutuhkan, implementasikan field skema resource dan otorisasi eksplisit melalui `IAuthFunctions` untuk `resource_show`, DataStore, view, pratinjau, dan unduhan. Portal baru boleh mengikuti permission tersebut setelah implementasi CKAN tersedia dan diuji.

### Alur unduhan

#### Unduhan resource melalui CKAN

1. Next.js hanya membaca cookie `portal_ckan_session` yang dikonfigurasi dari permintaan masuk.
2. Next.js memanggil CKAN `resource_show` dan memvalidasi ID resource, status aktif, serta `resource.package_id`.
3. Next.js memanggil `package_show` dengan sesi yang sama dan memvalidasi package induk serta slug/ID yang diminta. Dataset privat hanya diterima jika CKAN mengizinkannya untuk sesi tersebut.
4. Path URL resource divalidasi terhadap pola unduhan dataset/resource CKAN. Host dari URL asli tidak pernah di-fetch; path tervalidasi diminta melalui `CKAN_API_INTERNAL_URL`.
5. Endpoint unduhan CKAN melakukan pemeriksaan permission terakhir. Respons 401/403/404 dinormalisasi menjadi 404; kegagalan layanan CKAN yang tidak terduga tetap menjadi 502.

Array `package_show.result.resources` adalah metadata, bukan gerbang otorisasi tambahan. Jika ringkasan resource tidak disertakan, hal itu tidak boleh menghasilkan 404 palsu setelah CKAN mengizinkan resource dan dataset induknya.

#### Unduhan FileStore umum

1. Next.js memanggil `file_show` dan hanya menerima metadata owner eksplisit bertipe `resource` atau `package`.
2. File milik resource harus cocok dengan ID resource yang diminta; file milik package harus cocok dengan ID package induk. Owner yang tidak dikenal, kosong, atau bertipe editorial-media/user/group/organization ditolak pada proxy dataset umum.
3. Pemeriksaan `resource_show`/`package_show` menentukan akses ke dataset pemilik. Konfigurasi penerapan menetapkan `ckan.files.owner.cascade_access` untuk `resource` dan `package`, sehingga otorisasi FileStore mengikuti hak akses entitas CKAN terkait. `file_show` saja tidak pernah dianggap bukti izin unduh.
4. Next.js meminta `/file/download/<id>` dari CKAN dengan cookie sesi yang sama. CKAN melakukan pemeriksaan akhir `permission_download_file`. Respons 401/403/404/410 dinormalisasi menjadi 404.

Proxy media editorial terpisah dan memakai owner tetap, pemeriksaan MIME, batas byte, serta signature gambar. Hook `IFiles` portal hanya memberi akses `show` publik kepada owner `portal_media/public-editorial-media`; hook tersebut tidak memberi izin tulis/hapus dan tidak melonggarkan akses owner resource/package.

### Persyaratan sesi dan domain

Browser dapat mengirim cookie sesi CKAN ke Portal Admin dan portal publik hanya jika `PUBLIC_HOST` serta `CKAN_HOST` merupakan subdomain dalam domain induk yang sama (eTLD+1) dan cookie dikonfigurasi untuk domain induk tersebut. Contoh yang sesuai: `data.example.go.id` dan `ckan.example.go.id`. Contoh yang tidak sesuai: `data.example.go.id` dan `ckan.other-example.net`.

Setelah mengubah domain cookie atau hostname, buat ulang container CKAN dan Next.js, keluar dari Portal Admin CKAN, lalu masuk kembali. Pada Alat Developer browser → Network, pastikan permintaan ke portal menyertakan nama cookie `portal_ckan_session`; jangan menyalin atau membagikan nilainya. `sync-env.py` sengaja menolak domain induk yang tidak cocok.

Cookie domain induk dikirim ke semua subdomain pada domain tersebut. Semua subdomain harus dipercaya dan dikelola dengan kontrol keamanan setara. Portal hanya meneruskan cookie sesi CKAN yang dikonfigurasi ke origin CKAN internal; cookie lain dari browser, API token, dan nilai sesi tidak diteruskan ke origin eksternal.

### Cakupan pengujian regresi

Unit test mencakup:

- Sesi CKAN yang berhak dapat membaca/mengunduh dataset privat saat `package_show` mengizinkannya.
- Sesi anonim atau tidak valid tidak dapat membaca dataset privat.
- Resource tetap dapat diunduh saat `package_show.resources` tidak menyertakan ringkasan resource, selama CKAN telah mengizinkan dataset induk.
- Marker `resource.private` kustom ditolak walaupun cookie tersedia.
- Owner FileStore harus tepat `resource` atau `package` dengan ID owner yang cocok.
- Respons akhir FileStore 401/403/404/410 dinormalisasi menjadi 404.
- Marker privat berbentuk string diproses secara aman; string `false` tidak keliru dianggap privat.
- Respons byte unduhan menggunakan `private, no-store`, termasuk berkas publik, agar cache CDN/browser lama tidak menyajikan salinan setelah visibilitas diubah.

Nilai cookie tidak pernah dicatat ke log.

### Pemeriksaan setelah penerapan

1. Pastikan `PUBLIC_HOST` dan `CKAN_HOST` adalah subdomain dalam domain induk yang sama.
2. Logout lalu login kembali ke Admin CKAN setelah konfigurasi cookie berubah.
3. Di Alat Developer browser → Network, periksa bahwa permintaan unduhan portal membawa **nama** cookie yang dikonfigurasi. Jangan membagikan nilainya.
4. Uji dataset yang boleh dibaca admin, dataset yang tidak boleh dibaca akun tersebut, dan permintaan tanpa sesi.
5. Uji unduhan FileStore secara terpisah karena `permission_download_file` dapat menolak unduhan meskipun `file_show` berhasil.

Jangan mengubah dataset privat menjadi publik sebagai jalan pintas untuk mengatasi masalah sesi atau domain.

## Pratinjau DataStore dan Sinkronisasi

### Masalah yang ditangani

1. Detail dataset dapat gagal dirender ketika konfigurasi Scheming tidak menunjuk ke `dataset.yaml`. Nama environment variable yang benar untuk opsi extension `scheming.dataset_schemas` adalah `CKAN___SCHEMING__DATASET_SCHEMAS` (tiga underscore setelah `CKAN`), bukan `CKAN__SCHEMING__DATASET_SCHEMAS`.
2. `ckanext-dcat` membangun JSON-LD ketika halaman detail dataset dirender. Jika `scheming.dataset_schemas` salah, pemanggilan `schema_show(type=pkg.type)` gagal dan menyebabkan HTTP 500 `Unknown dataset schema: dataset`.
3. `package_activity_list` berasal dari plugin Activity. Plugin harus aktif dan migrasi `db upgrade -p activity` harus selesai.
4. CKAN DataStore menyimpan salinan tabular. Pratinjau baru tersedia setelah resource dimuat ke DataStore. XLoader adalah worker pemroses antrean; mengaktifkan plugin saja belum otomatis mengirim resource, sehingga tema portal kini mengantrekan resource format yang didukung ketika resource dibuat/diperbarui.
5. Cache Next.js tidak boleh bergantung hanya pada TTL. Perubahan CKAN mengirim webhook HMAC ke Next.js untuk menginvalidasi tag `ckan-public`.

### Format yang dikirim ke XLoader otomatis

Tema portal hanya mengirim format bawaan XLoader 2.6.0:

- `csv`, `application/csv`
- `tsv`
- `xls`, `application/vnd.ms-excel`
- `xlsx`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `ods`, `application/vnd.oasis.opendocument.spreadsheet`

Format lain tetap dapat diunduh sebagai resource biasa, tetapi tidak dijanjikan memiliki pratinjau tabular DataStore.

### Penerapan awal

Setelah source terbaru diterapkan:

```bash
## 1. Sinkronkan konfigurasi, Scheming package path, dan Docker overlay
bash ./deploy/ckan/bootstrap-upstream.sh

## 2. Build dan mulai CKAN terlebih dahulu
bash ./deploy/ckan/compose.sh cloudflare up -d --build ckan

## 3. Periksa status; lanjut hanya setelah ckan berstatus healthy
bash ./deploy/ckan/compose.sh cloudflare ps
bash ./deploy/ckan/compose.sh cloudflare logs --tail=120 ckan

## 4. Setelah CKAN sehat, siapkan DataStore dan XLoader
bash ./deploy/ckan/apply-datastore-permissions.sh
bash ./deploy/ckan/enable-xloader.sh cloudflare

## 5. Mulai Next.js setelah backend dan worker siap
bash ./deploy/ckan/compose.sh cloudflare up -d nextjs
```

`enable-xloader.sh` membuat token internal XLoader bila belum ada, menyimpannya privat di `.env.ckan`, lalu merecreate CKAN dan worker. Kedua skrip DataStore/XLoader menolak berjalan saat CKAN belum `healthy`, sehingga error sekunder tidak menutupi akar startup. Worker harus berstatus berjalan sebelum mengharapkan pratinjau otomatis.

### Pemrosesan ulang resource lama

Resource yang sudah ada sebelum hook otomatis dipasang perlu dikirim sekali ke XLoader:

```bash
bash ./deploy/ckan/backfill-datastore-previews.sh cloudflare all
```

Pantau antrean:

```bash
bash ./deploy/ckan/compose.sh cloudflare exec -T ckan \
  ckan -c /srv/app/ckan.ini xloader status
```

Perintah `all` mengirim resource yang formatnya cocok; XLoader sendiri menolak format yang tidak didukung. `all-existing` hanya memuat ulang resource yang sudah punya tabel DataStore.

### Alur resource baru dan perubahan

1. Editor membuat atau memperbarui resource CKAN.
2. `PortalThemePlugin.after_resource_create/update` mengirim action internal `xloader_submit` untuk format yang didukung. Hook tidak menunggu proses parsing; kegagalan antrean dicatat dan tidak membatalkan penyimpanan metadata.
3. XLoader worker memuat resource ke DataStore. XLoader mengelola status pekerjaan dan membuat tampilan resource bawaan setelah berhasil.
4. `IXloader.after_upload` mengirim event `resource.indexed`; portal membatalkan cache kembali agar status `datastore_active` yang terbaru terbaca.
5. Halaman detail Next.js menampilkan pratinjau jika DataStore aktif. Jika pemrosesan belum selesai, panel status muncul dan memeriksa `resource_show` secara terbatas selama sekitar 84 detik.

### Sinkronisasi cache publik

Hook CKAN mengirim event setelah perubahan dataset, resource, organisasi, grup, halaman CMS, dan setelah resource selesai diindeks. Webhook Next.js:

- hanya menerima `POST` JSON kecil;
- memeriksa timestamp (maksimum selisih 5 menit);
- memverifikasi HMAC-SHA256 dengan `CKAN_REVALIDATE_SECRET` memakai perbandingan konstan;
- hanya menerima event yang diizinkan;
- menginvalidasi tag Next.js `ckan-public` secara langsung.

Pengambilan data CKAN anonim dari server yang aman memakai Data Cache Next.js selama 60 detik dengan tag `ckan-public` dan `ckan-action:{action}`. Webhook yang berhasil langsung membatalkan cache dengan tag portal terkait. Jika webhook gagal, masa revalidasi 60 detik menjadi pemicu penyegaran berikutnya. Mekanisme stale-while-revalidate dapat menyajikan data lama ketika penyegaran berlangsung. Permintaan server-side yang membawa sesi CKAN, meminta `include_private=true`, membaca riwayat aktivitas, atau metadata berkas tetap `no-store`.

API publik merupakan lapisan terpisah: metadata umum dapat memakai masa cache CDN lima detik, sedangkan pencarian/detail dataset, resource/berkas, riwayat aktivitas, dan DataStore tetap `no-store` untuk menjaga pemeriksaan visibilitas. Lihat [kontrak API publik](API.md) untuk header HTTP yang diterima pemanggil.

#### Validasi dan pembersihan cache manual

Untuk memeriksa kesehatan CKAN lalu memaksa invalidasi cache portal:

```bash
bash ./deploy/ckan/revalidate-public-cache.sh cloudflare
```

Skrip memeriksa `status_show` dan `package_search`, lalu menandatangani webhook internal. Rahasia tidak ditampilkan.

### Diagnostik

```bash
bash ./deploy/ckan/compose.sh cloudflare logs --tail=200 ckan xloader-worker nextjs
bash ./deploy/ckan/compose.sh cloudflare exec -T ckan ckan -c /srv/app/ckan.ini xloader status
```

Jika detail dataset tetap HTTP 500, periksa nilai aktif `scheming.dataset_schemas` dan pastikan `dataset.yaml` ikut terpasang sebagai package data di `ckanext.portal_theme:schemas/dataset.yaml` dan nilai `scheming.dataset_schemas` memakai format `module:file`. Jika pratinjau tetap belum aktif, periksa format resource, akses unduh dari worker, token XLoader, worker Redis/RQ, hak akses DataStore, dan log pekerjaan XLoader.

### Panduan admin melalui Portal Admin

Administrator sistem dapat memakai menu **Integrasi Data → DataStore & pratinjau** (`/admin/data-preview`) tanpa perlu menjalankan langkah konfigurasi secara manual satu per satu. Halaman ini menjalankan pemeriksaan konfigurasi saat dibuka atau saat tombol **Periksa ulang** dipilih. Urutannya:

1. Pastikan plugin `datastore` dan `xloader` aktif, `ckan.datastore.read_url` dan `write_url` tersedia, action `xloader_submit` terdaftar, token internal tersedia, serta `ckanext.xloader.jobs_db.uri` terisi. Nilai rahasia tidak pernah dirender ke browser.
2. Bila hak akses DataStore gagal, gunakan tombol **Salin perintah** untuk `apply-datastore-permissions.sh`, jalankan pada terminal server, lalu kembali dan klik **Periksa ulang**.
3. Periksa container dengan perintah `docker compose ps xloader-worker`; jika belum berjalan, lihat log worker dari tombol salin perintah di halaman. Antarmuka tidak menjalankan perintah shell di server karena itu akan memperbesar permukaan serangan.
4. Setelah konfigurasi dan worker siap, gunakan tombol **Antrekan hingga 25 resource** untuk pemrosesan ulang resource lama bertahap dari browser. Formulir menggunakan CSRF dan hanya tersedia untuk sysadmin. Resource harus publik serta memiliki format tabular yang didukung.
5. Buka tautan dataset pada daftar status siap atau menunggu. Selesai diproses, `datastore_active` menjadi benar dan panel pratinjau DataStore dan API tampil. Jika tidak, periksa log XLoader, konektivitas worker ke URL berkas, izin basis data, dan kesesuaian format.

Antarmuka hanya memindai hingga 100 dataset publik terbaru dan membatasi pengiriman per klik hingga 25 pekerjaan. Untuk katalog besar, jalankan pemrosesan ulang penuh dari terminal penerapan sesuai bagian sebelumnya. Resource XLS/XLSX/ODS memerlukan XLoader; fallback parsing langsung di halaman publik hanya disediakan untuk CSV/TSV berukuran kecil.

### Rujukan terkait

- [Kontrak API publik](API.md)
- [Konten, CMS, dan media](ADMIN-CKAN-DAN-CMS.md)
- [Akses unduhan dataset privat](DATASTORE-DAN-AKSES.md)
