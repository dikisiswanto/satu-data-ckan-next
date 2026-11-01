# Dokumentasi API Publik — Portal Satu Data Kabupaten Wajo

Dokumen ini mendeskripsikan **facade API yang benar-benar diekspos oleh aplikasi Next.js**. Facade meneruskan beberapa action baca CKAN 2.12.1 dengan allowlist, validasi parameter, batas ukuran request, penyamaran URL unduhan, dan envelope JSON CKAN. Ini bukan proxy untuk seluruh Action API CKAN.

## Mulai di sini (tanpa harus menjadi developer)

API adalah alamat yang bisa dibuka aplikasi lain untuk meminta data secara otomatis. Contoh request berikut dapat diuji langsung melalui browser:

- **Cari dataset:** <https://data.wajokab.go.id/api/3/action/package_search?q=pendidikan&rows=5>
- **Periksa layanan:** <https://data.wajokab.go.id/api/3/action/status_show>
- **Lihat katalog dengan tampilan biasa:** <https://data.wajokab.go.id/dataset>

Hasil API berupa JSON. Cari `success`: jika bernilai `true`, data utama berada di `result`; jika `false`, pesan masalah biasanya berada di `error.message`. Istilah yang sering dipakai: **dataset** adalah kumpulan informasi, **resource** adalah file/tabel di dalam dataset, **ID** adalah kode unik, dan **DataStore** adalah layanan untuk membaca baris pada resource tabular yang sudah diaktifkan.

Untuk dokumentasi yang disusun bertahap dengan tombol contoh yang bisa dibuka, gunakan laman publik **[/api-data](https://data.wajokab.go.id/api-data)**. Dokumen ini melengkapi laman tersebut dengan kontrak teknis yang lebih rinci.

## 1. Alamat dasar (Base URL) dan akses

```text
https://data.wajokab.go.id/api/3/action
```

Semua action publik tidak memerlukan API key. Gunakan hanya untuk membaca metadata atau data yang memang tersedia bagi publik. Admin CKAN adalah antarmuka terpisah dan harus tetap dilindungi autentikasi.

| Item                                                             | Perilaku                                                                                                                                                     |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Transportasi                                                     | HTTPS untuk penerapan publik                                                                                                                                 |
| Method                                                           | `GET`, `HEAD`, `OPTIONS` untuk action yang diizinkan                                                                                                         |
| Format                                                           | JSON; skema objek `result` mengikuti CKAN native                                                                                                             |
| Auth                                                             | Tidak dibutuhkan untuk facade publik; permission CKAN tetap berlaku                                                                                          |
| CORS                                                             | Default hanya origin `PUBLIC_SITE_ORIGIN`; origin browser tambahan dapat diizinkan eksplisit lewat `PUBLIC_API_CORS_ORIGINS` (daftar origin dipisahkan koma) |
| Cache metadata umum (`status_show`, organisasi, grup/topik, tag) | `s-maxage=5`, `stale-while-revalidate=5`                                                                                                                     |
| Cache hasil pencarian dan data yang bergantung pada visibilitas  | `Cache-Control: no-store` untuk `package_search`, `package_show`, activity, resource, file, dan DataStore                                                    |
| Cache error                                                      | `no-store`                                                                                                                                                   |
| Indexing                                                         | `X-Robots-Tag: noindex, nofollow, noarchive`                                                                                                                 |
| Keamanan header                                                  | `X-Content-Type-Options: nosniff`                                                                                                                            |

`HEAD` menjalankan logika GET tanpa body respons. `OPTIONS` hanya mengembalikan `204` untuk action yang di-allowlist; action yang tidak dikenal menghasilkan `404`. Header CORS hanya diberikan kepada origin pada `PUBLIC_API_CORS_ORIGINS` atau, bila kosong, `PUBLIC_SITE_ORIGIN`. Jangan memakai wildcard untuk kebutuhan admin. Request mutasi (`POST`, `PUT`, `PATCH`, `DELETE`) serta action yang tidak di-allowlist ditolak. Path action harus satu segmen, misalnya `/package_show`, bukan path bertingkat.

## 2. Struktur respons (envelope)

### Sukses

HTTP `200`:

```json
{
  "help": "https://docs.ckan.org/en/2.12/api/index.html#ckan.logic.action.get.package_show",
  "success": true,
  "result": {
    "id": "...",
    "name": "...",
    "title": "..."
  }
}
```

Field di dalam `result` bergantung pada action. Contoh objek di atas hanya ilustrasi bentuk `Package`; daftar field aktual mengikuti metadata di CKAN.

### Gagal

```json
{
  "help": "https://docs.ckan.org/en/2.12/api/index.html#ckan.logic.action.get.package_show",
  "success": false,
  "error": {
    "message": "Parameter 'id' wajib diisi.",
    "__type": "Validation Error"
  }
}
```

| HTTP         | Arti pada facade                                                                                     |
| ------------ | ---------------------------------------------------------------------------------------------------- |
| `400`        | Parameter tidak dikenal/duplikat, nilai tidak valid, atau parameter wajib hilang                     |
| `403`        | CKAN menolak akses ke action atau objek berdasarkan izin                                             |
| `404`        | Action publik atau objek tidak ditemukan                                                             |
| `409`, `422` | Konflik/validasi upstream yang dikenali dan diteruskan                                               |
| `502`        | Upstream CKAN tidak dapat diakses atau menghasilkan kegagalan yang tidak dipetakan ke status di atas |

Pada error, respons tidak disimpan di shared cache. Hasil pencarian dataset, detail dataset, resource/file, riwayat aktivitas, dan baris DataStore memakai `Cache-Control: no-store` pada **facade HTTP** agar reverse proxy/CDN tidak menyimpan respons yang bergantung pada visibilitas objek. Jangan menambahkan caching di reverse proxy/CDN untuk action yang ditandai no-store.

**Catatan tentang cache internal Next.js:** tabel di atas hanya menjelaskan respons `/api/3/action` yang dilihat browser/aplikasi luar. Pembacaan CKAN langsung dari Server Components/Server Actions Next.js memakai Data Cache terpisah selama 60 detik untuk request anonim yang aman, dengan tag `ckan-public` dan `ckan-action:{nama-action}`. Perubahan CKAN mengirim webhook internal bertanda tangan HMAC untuk menginvalidasi tag `ckan-public`; TTL 60 detik menjadi batas pemulihan jika webhook tidak berhasil. Request dengan sesi CKAN, `include_private=true`, `package_activity_list`, dan `file_show` tetap `no-store`. Jangan menurunkan aturan no-store pada facade atau request privat hanya demi performa.

## 3. Action yang tersedia

Base path setiap contoh di bawah adalah `/api/3/action`. Semua nama parameter bersifat case-sensitive. Parameter yang tidak tercantum ditolak untuk action yang memakai whitelist, dan nama parameter tidak boleh dikirim lebih dari sekali.

| Action                  | Parameter yang diterima                        | Deskripsi dan aturan                                                                                                                                                                                                                                                                                                                               |
| ----------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `status_show`           | Tidak ada                                      | Status dasar CKAN. Query parameter apa pun ditolak.                                                                                                                                                                                                                                                                                                |
| `package_search`        | `q`, `rows`, `start`, `facets`, `sort`, `fq`   | Mencari dataset publik. `include_private=false`; `sort` hanya menerima daftar urutan yang diizinkan dan `fq` hanya mendukung filter organization/groups serta rentang metadata_modified untuk kompatibilitas harvesting.                                                                                                                           |
| `package_show`          | `id` **wajib**                                 | Objek dataset/package CKAN berdasarkan nama atau ID. Resource privat atau nonaktif dihapus dari daftar resource tertanam.                                                                                                                                                                                                                          |
| `package_activity_list` | `id` **wajib**, `limit`, `offset`              | Riwayat aktivitas dataset publik; facade memeriksa visibilitas dataset terlebih dahulu, membatasi jumlah hasil, selalu memaksa `include_hidden_activity=false`, dan menghapus identitas pengguna internal. `limit` default 8 (maksimum 31), `offset` default 0. `include_data` dan `include_hidden_activity` tidak diterima dari pemanggil publik. |
| `organization_list`     | `all_fields`, `include_dataset_count`, `limit` | Daftar organisasi. `include_users` dan `include_extras` selalu dipaksa `false`.                                                                                                                                                                                                                                                                    |
| `organization_show`     | `id` **wajib**                                 | Detail organisasi; dataset tertanam, field pengguna, dan extras tidak disertakan.                                                                                                                                                                                                                                                                  |
| `group_list`            | `all_fields`                                   | Daftar grup/topik CKAN, default `all_fields=true`.                                                                                                                                                                                                                                                                                                 |
| `group_show`            | `id` **wajib**                                 | Detail satu grup/topik.                                                                                                                                                                                                                                                                                                                            |
| `tag_list`              | `query`, `all_fields`                          | Daftar tag, dengan query opsional dan default `all_fields=false`.                                                                                                                                                                                                                                                                                  |
| `resource_show`         | `id` **wajib**                                 | Metadata satu Resource CKAN.                                                                                                                                                                                                                                                                                                                       |
| `file_show`             | `id` **wajib**                                 | Metadata entitas File CKAN 2.12, bukan unduhan isi file.                                                                                                                                                                                                                                                                                           |
| `datastore_search`      | `resource_id` **wajib**, `limit`, `offset`     | Membaca baris hanya untuk resource aktif milik dataset publik; query lanjutan sengaja tidak diteruskan.                                                                                                                                                                                                                                            |

### 3.1 Parameter numerik dan boolean

Nilai numerik harus berupa bilangan bulat non-negatif. Nilai di atas batas akan dipotong ke batas maksimum; angka negatif, pecahan, atau teks tidak valid menghasilkan `400`.

| Action/parameter          | Default |  Maksimum |
| ------------------------- | ------: | --------: |
| `package_search.rows`     |    `20` |     `100` |
| `package_search.start`    |     `0` | `1000000` |
| `organization_list.limit` |  `1000` |    `1000` |
| `datastore_search.limit`  |    `10` |     `100` |
| `datastore_search.offset` |     `0` |  `100000` |

`facets`, `all_fields`, dan `include_dataset_count` menerima `true`/`false`, `1`/`0`, atau `yes`/`no` (tidak peka huruf besar-kecil). Nilai lain menghasilkan `400`. `package_activity_list` menerima `limit` dan `offset` berupa bilangan bulat non-negatif; pemanggil publik tidak dapat mengubah flag `include_hidden_activity` yang selalu dipaksa `false`.

### 3.2 Pencarian `package_search`

Contoh:

```bash
curl -sS 'https://data.wajokab.go.id/api/3/action/package_search?q=pendidikan&rows=20&start=0'
```

`q` menerima teks/frasa sederhana hingga 160 karakter: huruf Unicode, angka, spasi, `_`, `.`, `,`, apostrof, dan tanda hubung. Facade mengubah teks tersebut menjadi literal frasa yang di-quote sebelum meneruskannya ke CKAN. `*:*` didukung untuk pencarian seluruh katalog. Sintaks Lucene/Solr, field query seperti `title:*`, operator, colon, wildcard bebas, dan sintaks lanjutan lain ditolak.

`facets=true` menambahkan facet untuk grup, organisasi, format resource, dan periode acuan (`extras_portal_reference_period`). Facade memaksa `include_private=false`. `sort` hanya menerima `id asc`, `id desc`, `name asc`, `name desc`, `metadata_modified asc`, atau `metadata_modified desc`. `fq` hanya menerima filter `organization:<slug>`, `groups:<slug>` (dengan negasi atau OR pada field yang sama), dan rentang `metadata_modified:[tanggal TO *]`. Sintaks Solr bebas, field lain, wildcard, local params, parentesis, dan boosting ditolak.

**Catatan perbedaan pencarian:** pencarian UI di `/dataset` memiliki normalisasi kata kunci portal yang memungkinkan token bermakna dicocokkan secara OR di indeks title, notes, tags, organisasi, grup, dan metadata resource. Action API eksternal `package_search` di atas sengaja hanya menerima query literal sederhana; perilakunya tidak identik dengan pencarian UI.

### 3.3 DataStore

Contoh:

```bash
curl -sS 'https://data.wajokab.go.id/api/3/action/datastore_search?resource_id=RESOURCE_ID&limit=10&offset=0'
```

Untuk halaman berikutnya, tingkatkan `offset` sebesar jumlah baris yang telah diminta. Facade membatasi satu permintaan hingga 100 baris dan offset 100.000. Parameter `q`, `filters`, `sort`, `fields`, dan query DataStore lanjutan lainnya tidak diterima agar endpoint publik tetap terbatas. Field, records, dan total yang dikembalikan mengikuti keadaan tabel DataStore di CKAN.

## 4. Contoh tambahan

```bash
# Metadata dataset
curl -sS 'https://data.wajokab.go.id/api/3/action/package_show?id=nama-dataset'

# Daftar organisasi
curl -sS 'https://data.wajokab.go.id/api/3/action/organization_list?all_fields=true&limit=1000'

# Facet katalog, tanpa mengunduh baris dataset
curl -sS 'https://data.wajokab.go.id/api/3/action/package_search?q=%2A%3A%2A&rows=0&facets=true'

# Riwayat perubahan dataset
curl -sS 'https://data.wajokab.go.id/api/3/action/package_activity_list?id=nama-dataset&limit=8&offset=0'

# Metadata resource
curl -sS 'https://data.wajokab.go.id/api/3/action/resource_show?id=RESOURCE_ID'
```

ID resource biasanya tersedia pada array `resources` dalam hasil `package_show`; gunakan ID tersebut sebagai `resource_id` saat membaca DataStore. Resource yang berstatus privat/nonaktif dihilangkan dari daftar resource tertanam pada hasil `package_show` dan `package_search`. Activity API juga tidak mengembalikan field `user`, `user_id`, atau `activity_user_id` agar endpoint publik tidak menjadi jalur untuk menemukan identitas staf internal.

## 5. Kesiapan pengambilan katalog eksternal (harvesting)

Portal disiapkan untuk kemungkinan diambil oleh harvester CKAN lain, tanpa membuka hostname administrasi. Alamat sumber yang perlu didaftarkan pada harvester adalah:

```text
https://data.wajokab.go.id
```

Jangan menggunakan `CKAN_HOST` (misalnya `https://ckan.silirdev.com`); hostname tersebut khusus administrasi. Gunakan `PUBLIC_HOST` (misalnya `https://data.silirdev.com`) sebagai alamat harvesting publik. Harvester CKAN standar memanggil `package_search` dengan `rows`, `start`, `sort=id asc`, lalu memakai filter `fq` untuk membatasi organisasi/grup atau mengambil metadata yang berubah sejak proses sebelumnya. Facade publik kini mendukung subset parameter tersebut secara terbatas. Action baca seperti `package_show`, `organization_show`, dan `group_show` tetap tersedia untuk metadata yang bersifat publik.

Contoh request awal:

```bash
curl -sS 'https://data.wajokab.go.id/api/3/action/package_search?rows=100&start=0&sort=id%20asc'
```

Contoh request perubahan sejak 1 Januari 2026 (tanggal ini hanya contoh pengujian; untuk sinkronisasi inkremental, gunakan checkpoint UTC dari sinkronisasi terakhir yang berhasil):

```bash
curl -sS 'https://data.wajokab.go.id/api/3/action/package_search?rows=100&start=0&sort=id%20asc&fq=metadata_modified%3A%5B2026-01-01T00%3A00%3A00Z%20TO%20*%5D'
```

API publik tidak memerlukan API key untuk metadata publik. Server-to-server harvesting tidak memerlukan CORS browser. Untuk aplikasi browser dari origin lain, CORS harus dibuka eksplisit melalui `PUBLIC_API_CORS_ORIGINS`, daftar origin HTTPS dipisahkan koma; jangan mengaktifkan wildcard secara default. Dataset privat dan action mutasi tetap tidak tersedia. Bila pihak SDI memilih metode DCAT/RDF, gunakan endpoint ekspor DCAT publik (`/catalog.rdf`, `/catalog.ttl`, atau `/catalog.jsonld`) dan cocokkan profil metadata yang diwajibkan oleh harvester tujuan. Dukungan teknis ini menyiapkan jalur koneksi; **belum berarti sumber Wajo telah didaftarkan atau lulus uji penerimaan SDI**.

## 6. Bentuk data utama

- **Package / dataset:** lazimnya berisi `id`, `name`, `title`, `notes`, `metadata_created`, `metadata_modified`, `license_id`, `license_title`, `organization`, `groups`, `tags`, `extras`, `resources`, dan `state`.
- **Resource:** dapat berisi `id`, `package_id`, `name`, `description`, `format`, `mimetype`, `url`, `size`, `datastore_active`, serta status dan metadata terkait.
- **Organization:** dapat berisi `id`, `name`, `title`, `description`, `image_url`, `state`, serta jumlah dataset bila tersedia.
- **DataStore:** memuat data baris dan definisi field sesuai tabel resource yang telah diaktifkan. Bentuk metadata tambahan bergantung pada konfigurasi CKAN dan resource.

Field opsional boleh tidak ada atau berisi `null`. Jangan mengasumsikan seluruh paket menyediakan lisensi, organisasi, tanggal, resource, atau DataStore aktif.

URL unduhan pada hasil CKAN diproses agar menggunakan host publik yang dikonfigurasi; host admin/internal tidak boleh disebarkan melalui URL resource yang ditampilkan. Izin file tetap mengikuti CKAN.

## 7. Data khusus portal dan proses penerbitan

API CKAN native tidak mendefinisikan entitas khusus portal untuk indikator, infografik, publikasi, observasi, atau GeoPortal. Halaman khusus portal merakit konten tersebut dari Package/Dataset CKAN, tag, field ekstra skema, dan resource DataStore. `portal_type` adalah metadata tambahan portal; tipe package internal tetap `dataset`. Ini sengaja mempertahankan satu sumber metadata, organisasi, lisensi, permission, resource, versi, dan riwayat. Pada antarmuka publik, katalog `/dataset` mengecualikan record bertipe `indikator`, `infografik`, dan `publikasi`; ketiganya muncul pada laman khusus masing-masing, sehingga tidak tercampur atau dihitung ganda sebagai dataset umum.

- **Indikator statistik:** Package CKAN bertipe portal `indikator` dengan tag `portal-indikator`, serta resource tabular yang mengaktifkan DataStore. Ini tetap merupakan data terstruktur dan observasinya tetap bersumber dari DataStore, tetapi ditampilkan pada katalog Statistik, bukan daftar Dataset umum. Kolom `period` dan `value` diperlukan; `region`, `unit`, dan `source` disarankan. Metadata dapat meliputi `portal_unit`, `portal_periodicity`, `portal_definition`, `portal_formula`, `portal_source`, `portal_geography`, dan `portal_reference_period`.
- **Infografik:** Package CKAN bertipe portal `infografik`, tag `portal-infografik`, dan resource gambar/PDF. Jadikan record terpisah bila visual memiliki judul, periode, atribusi, dan metadata sendiri; bila hanya visual pendamping sebuah dataset, lebih baik simpan sebagai resource pada dataset sumber. Metadata dapat meliputi `portal_category`, `portal_period`, `portal_attribution`, dan `portal_reference_period`.
- **Publikasi/laporan:** Package CKAN bertipe portal `publikasi`, tag `portal-publikasi`, dan resource dokumen publik. Untuk laporan resmi yang memiliki penerbit, periode, versi, lisensi, dan berkas rilis, pertahankan sebagai record khusus. Untuk artikel berita atau narasi web yang bukan rilis data, gunakan CKAN Pages/Blog (CMS), bukan memaksakannya menjadi dataset. Metadata dapat meliputi `portal_reference_period`, `portal_publication_date`, `portal_version`, `portal_revision_note`, `portal_methodology`, serta atribusi penerbit.

Nama tipe/tag/field harus mengikuti schema CKAN yang dipasang pada deployment. Field ekstra dapat dikembalikan di `extras` atau sebagai properti tingkat pertama sesuai skema/versi extension.

## 8. Batas keamanan dan operasi

1. Jangan mengekspos port PostgreSQL, Solr, Redis, maupun port internal CKAN ke internet.
2. Host admin CKAN harus terpisah dari host publik dan dilindungi oleh satu gerbang perimeter (Basic Auth Caddy atau Cloudflare Access) serta autentikasi/otorisasi CKAN. Hindari menambahkan Basic Auth di depan Cloudflare Access bila ingin mengurangi prompt login.
3. Jangan meneruskan kredensial admin, token API, atau URL internal ke browser publik.
4. `package_search` tidak dapat memilih dataset privat melalui facade; CKAN tetap menjadi sumber otoritatif hak akses objek.
5. Respons error tidak dicache. Cache HTTP facade mengikuti tabel di atas. Cache server-side Next.js adalah lapisan terpisah: pembacaan anonim yang aman memakai TTL 60 detik dengan invalidasi webhook bertanda tangan; pembacaan login/privat tetap `no-store`.
6. Endpoint API tidak ditujukan untuk indexing mesin pencari (`X-Robots-Tag: noindex, nofollow, noarchive`).

Referensi protokol umum: [CKAN 2.12 Action API](https://docs.ckan.org/en/2.12/api/index.html). Bila ada perbedaan antara dokumentasi CKAN upstream dan facade ini, batas facade yang dijelaskan dalam dokumen ini yang berlaku untuk API publik portal.

## API pada detail dataset dan pratinjau publik

Setiap detail dataset pada portal publik menampilkan bagian **Akses API dataset**. Endpoint yang tersedia mengikuti facade read-only portal:

- `GET /api/3/action/package_show?id={dataset-name}` untuk metadata dataset.
- `GET /api/3/action/resource_show?id={resource-id}` untuk metadata resource publik.
- `GET /api/3/action/datastore_search?resource_id={resource-id}&limit={n}&offset={n}` untuk isi tabel yang sudah dimuat ke DataStore.

Semua endpoint detail memeriksa ulang visibilitas dataset dan resource di CKAN sebelum mengembalikan data. API tidak menerima token admin dan tidak membuka record privat. Batas parameter serta pagination mengikuti kontrak facade publik.

### Pratinjau berkas sebelum DataStore siap

Untuk CSV/TSV lokal yang belum selesai diproses XLoader, halaman detail dapat menampilkan pratinjau sementara melalui `/api/public/resource-preview?resource_id={id}&limit={n}`. Fallback membaca paling banyak 1 MiB dan 25 baris secara default, memvalidasi dataset/resource sebagai publik, dan hanya mengambil path unduhan CKAN yang tervalidasi dari origin internal. Endpoint ini bukan pengganti DataStore dan tidak memberi pagination penuh. Pratinjau penuh serta API tabel tetap memakai `datastore_search` setelah XLoader selesai. XLS/XLSX/ODS memerlukan pemrosesan XLoader/DataStore.

## Rujukan terkait

- [Pratinjau DataStore dan Sinkronisasi](PRATINJAU-DATASTORE-DAN-SINKRONISASI.md) — pemrosesan resource tabular.
- [Pratinjau Media dan Katalog](PRATINJAU-MEDIA-DAN-KATALOG.md) — pratinjau gambar dan pemisahan katalog.
- [Akses Unduhan Dataset Privat](AKSES-UNDUHAN-DATASET-PRIVAT.md) — sesi dan otorisasi CKAN.
- [Kualitas FE Publik](KUALITAS-FE-PUBLIK.md) — pagination, aksesibilitas, pratinjau PDF, dan performa.
- [Indeks Dokumentasi](INDEX.md) — daftar seluruh panduan kanonis.
