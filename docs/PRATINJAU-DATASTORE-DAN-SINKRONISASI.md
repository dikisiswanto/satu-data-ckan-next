# Pratinjau DataStore dan Sinkronisasi Portal Publik

## Masalah yang ditangani

1. Detail dataset dapat gagal dirender ketika konfigurasi Scheming tidak menunjuk ke `dataset.yaml`. Nama environment variable yang benar untuk opsi extension `scheming.dataset_schemas` adalah `CKAN___SCHEMING__DATASET_SCHEMAS` (tiga underscore setelah `CKAN`), bukan `CKAN__SCHEMING__DATASET_SCHEMAS`.
2. `ckanext-dcat` membangun JSON-LD ketika halaman detail dataset dirender. Jika `scheming.dataset_schemas` salah, pemanggilan `schema_show(type=pkg.type)` gagal dan menyebabkan HTTP 500 `Unknown dataset schema: dataset`.
3. `package_activity_list` berasal dari plugin Activity. Plugin harus aktif dan migrasi `db upgrade -p activity` harus selesai.
4. CKAN DataStore menyimpan salinan tabular. Preview baru tersedia setelah resource dimuat ke DataStore. XLoader adalah worker antrean; mengaktifkan plugin saja belum otomatis mengirim resource, sehingga theme sekarang mengantrekan resource format yang didukung ketika resource dibuat/diperbarui.
5. Cache Next.js tidak boleh bergantung hanya pada TTL. Perubahan CKAN mengirim webhook HMAC ke Next.js untuk menginvalidasi tag `ckan-public`.

## Format yang dikirim ke XLoader otomatis

Theme hanya mengirim format bawaan XLoader 2.6.0:

- `csv`, `application/csv`
- `tsv`
- `xls`, `application/vnd.ms-excel`
- `xlsx`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `ods`, `application/vnd.oasis.opendocument.spreadsheet`

Format lain tetap dapat diunduh sebagai resource biasa, tetapi tidak dijanjikan memiliki pratinjau tabular DataStore.

## Penerapan awal

Setelah source baru dipasang:

```bash
# 1. Sinkronkan konfigurasi, Scheming package path, dan Docker overlay
bash ./deploy/ckan/bootstrap-upstream.sh

# 2. Build dan mulai CKAN terlebih dahulu
bash ./deploy/ckan/compose.sh cloudflare up -d --build ckan

# 3. Periksa status; lanjut hanya setelah ckan berstatus healthy
bash ./deploy/ckan/compose.sh cloudflare ps
bash ./deploy/ckan/compose.sh cloudflare logs --tail=120 ckan

# 4. Setelah CKAN sehat, siapkan DataStore dan XLoader
bash ./deploy/ckan/apply-datastore-hak aksess.sh
bash ./deploy/ckan/enable-xloader.sh cloudflare

# 5. Mulai Next.js setelah backend dan worker siap
bash ./deploy/ckan/compose.sh cloudflare up -d nextjs
```

`enable-xloader.sh` membuat token internal XLoader bila belum ada, menyimpannya privat di `.env.ckan`, lalu merecreate CKAN dan worker. Kedua skrip DataStore/XLoader menolak berjalan saat CKAN belum `healthy`, sehingga error sekunder tidak menutupi akar startup. Worker harus berstatus berjalan sebelum mengharapkan pratinjau otomatis.

## Pemrosesan ulang resource lama

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

## Alur resource baru dan perubahan

1. Editor membuat atau memperbarui resource CKAN.
2. `WajoThemePlugin.after_resource_create/update` mengirim action internal `xloader_submit` untuk format yang didukung. Hook tidak menunggu proses parsing; kegagalan antrean dicatat dan tidak membatalkan penyimpanan metadata.
3. XLoader worker memuat resource ke DataStore. XLoader mengelola status pekerjaan dan membuat resource views bawaan setelah berhasil.
4. `IXloader.after_upload` mengirim event `resource.indexed`; portal menginvalidasi ulang cache agar status `datastore_active` yang terbaru terbaca.
5. Halaman detail Next.js menampilkan preview jika DataStore aktif. Jika pemrosesan belum selesai, panel status muncul dan memeriksa `resource_show` secara terbatas selama sekitar 84 detik.

## Sinkronisasi cache publik

Hook CKAN mengirim event setelah perubahan dataset, resource, organisasi, grup, halaman CMS, dan setelah resource selesai diindeks. Webhook Next.js:

- hanya menerima `POST` JSON kecil;
- memeriksa timestamp (maksimum selisih 5 menit);
- memverifikasi HMAC-SHA256 dengan `CKAN_REVALIDATE_SECRET` memakai perbandingan konstan;
- hanya menerima event yang diizinkan;
- menginvalidasi tag Next.js `ckan-public` secara langsung.

Fetch CKAN server-side anonim yang aman memakai Data Cache Next.js selama 60 detik dengan tag `ckan-public` dan `ckan-action:{action}`. Webhook berhasil menginvalidasi tag portal secara langsung; Jika webhook gagal, masa revalidasi 60 detik menjadi pemicu penyegaran berikutnya. Mekanisme stale-while-revalidate dapat melayani data stale ketika penyegaran berlangsung. Request server-side yang membawa sesi CKAN, meminta `include_private=true`, membaca activity, atau membaca metadata file tetap `no-store`.

Facade API publik adalah lapisan terpisah: metadata umum dapat memakai TTL CDN lima detik, sedangkan pencarian/detail dataset, resource/file, activity, dan DataStore tetap `no-store` untuk menjaga pemeriksaan visibilitas. Lihat [kontrak API publik](API.md) untuk header HTTP yang diterima pemanggil.

### Validasi dan pembersihan cache manual

Untuk memeriksa kesehatan CKAN lalu memaksa invalidasi cache portal:

```bash
bash ./deploy/ckan/revalidate-public-cache.sh cloudflare
```

Skrip memeriksa `status_show` dan `package_search`, lalu menandatangani webhook internal. Rahasia tidak ditampilkan.

## Diagnostik

```bash
bash ./deploy/ckan/compose.sh cloudflare logs --tail=200 ckan xloader-worker nextjs
bash ./deploy/ckan/compose.sh cloudflare exec -T ckan ckan -c /srv/app/ckan.ini xloader status
```

Jika detail dataset tetap HTTP 500, periksa nilai aktif `scheming.dataset_schemas` dan pastikan `dataset.yaml` ikut terpasang sebagai package data di `ckanext.wajo_theme:schemas/dataset.yaml` dan nilai `scheming.dataset_schemas` memakai format `module:file`. Jika preview tetap belum aktif, periksa format resource, akses unduh dari worker, token XLoader, worker Redis/RQ, hak akses DataStore, dan log job XLoader.

## Panduan admin melalui Wajo Admin

Sysadmin dapat memakai menu **Integrasi Data → DataStore & pratinjau** (`/admin/data-preview`) tanpa harus menghafal urutan komponen. Halaman ini menjalankan pemeriksaan konfigurasi saat dibuka atau saat tombol **Periksa ulang** dipilih. Urutannya:

1. Pastikan plugin `datastore` dan `xloader` aktif, `ckan.datastore.read_url` dan `write_url` tersedia, action `xloader_submit` terdaftar, token internal tersedia, serta `ckanext.xloader.jobs_db.uri` terisi. Nilai rahasia tidak pernah dirender ke browser.
2. Bila hak akses DataStore gagal, gunakan tombol **Salin perintah** untuk `apply-datastore-hak aksess.sh`, jalankan pada terminal server, lalu kembali dan klik **Periksa ulang**.
3. Periksa container dengan perintah `docker compose ps xloader-worker`; jika belum berjalan, lihat log worker dari tombol salin perintah di halaman. UI tidak menjalankan shell di server karena itu akan memperbesar permukaan serangan.
4. Setelah konfigurasi dan worker siap, gunakan tombol **Antrekan hingga 25 resource** untuk backfill bertahap dari browser. Form memakai CSRF dan hanya tersedia untuk sysadmin. Resource harus publik serta memiliki format tabular yang didukung.
5. Buka tautan dataset pada daftar status siap/menunggu. Selesai diproses, `datastore_active` menjadi benar dan panel pratinjau DataStore/API tampil. Jika tidak, periksa log XLoader, konektivitas worker ke URL file, izin database, dan kesesuaian format.

UI hanya memindai hingga 100 dataset publik terbaru dan membatasi pengiriman per klik hingga 25 pekerjaan. Untuk katalog besar, jalankan pemrosesan ulang penuh dari terminal penerapan sesuai bagian sebelumnya. Resource XLS/XLSX/ODS memerlukan XLoader; fallback parsing langsung di halaman publik hanya disediakan untuk CSV/TSV berukuran kecil.

## Rujukan terkait

- [Kontrak API publik](API.md)
- [Pratinjau gambar dan katalog](PRATINJAU-MEDIA-DAN-KATALOG.md)
- [Akses unduhan dataset privat](AKSES-UNDUHAN-DATASET-PRIVAT.md)
- [Indeks dokumentasi](INDEX.md)
