# Panduan Portal Satu Data

Dokumen ini menggabungkan panduan API, administrasi CKAN/CMS, akses data, frontend, deployment, dan konfigurasi sambutan. Katalog terjemahan dibahas terpisah di [Lokalisasi CKAN](LOKALISASI-CKAN.md).

# Dokumentasi API Publik — Portal Satu Data

Dokumen ini menjelaskan **API publik yang disediakan aplikasi Next.js**. API tersebut meneruskan sejumlah action baca CKAN 2.12.1 melalui daftar endpoint yang diizinkan, validasi parameter, pembatasan permintaan, penyelarasan URL unduhan ke domain publik, dan struktur respons JSON CKAN. API publik ini tidak meneruskan seluruh action CKAN Action API.

## Untuk pengembang dan integrator

Dokumentasi ini ditujukan kepada pengembang aplikasi, integrator sistem, dan instansi yang ingin menghubungkan sistemnya dengan katalog data portal. API menyediakan endpoint baca yang dapat dipanggil aplikasi lain melalui HTTP dan mengembalikan data dalam format JSON. Contoh permintaan berikut dapat diuji melalui browser atau terminal:

- **Cari dataset:** <https://data.example.go.id/api/3/action/package_search?q=pendidikan&rows=5>
- **Periksa layanan:** <https://data.example.go.id/api/3/action/status_show>
- **Buka katalog publik:** <https://data.example.go.id/dataset>

Respons API berupa JSON. Periksa `success`: jika bernilai `true`, data utama berada di `result`; jika `false`, pesan masalah biasanya berada di `error.message`. Istilah penting: **dataset** adalah kumpulan informasi; **resource** adalah berkas, tautan, atau tabel di dalam dataset; **ID** adalah pengenal unik; dan **DataStore** adalah fitur CKAN untuk membaca baris data dari resource berbentuk tabel yang sudah diaktifkan.

Untuk panduan interaktif dan contoh endpoint yang dapat diuji, buka halaman **[/api-data](https://data.example.go.id/api-data)**. Dokumen ini melengkapi laman tersebut dengan kontrak teknis yang lebih rinci.

## 1. URL dasar dan akses

```text
https://data.example.go.id/api/3/action
```

Permintaan anonim untuk membaca data publik tidak memerlukan API key. Jika permintaan browser membawa cookie sesi CKAN yang valid, API dapat meneruskan cookie tersebut dan CKAN tetap memeriksa izin akun tersebut pada dataset terkait. API ini hanya menyediakan operasi baca. Pengelolaan data tetap dilakukan melalui Portal Admin CKAN yang dilindungi autentikasi dan izin pengguna.

| Aspek                                                            | Perilaku                                                                                                                                                                                  |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Protokol                                                         | HTTPS untuk penerapan publik                                                                                                                                                              |
| Metode                                                           | `GET`, `HEAD`, `OPTIONS` untuk action yang diizinkan                                                                                                                                      |
| Format                                                           | JSON; struktur objek `result` mengikuti respons CKAN                                                                                                                                      |
| Autentikasi                                                      | API key tidak diperlukan untuk data publik; cookie sesi CKAN yang valid dapat diteruskan dan izinnya tetap diperiksa oleh CKAN                                                            |
| CORS                                                             | Jika `PUBLIC_API_CORS_ORIGINS` diisi, hanya origin pada daftar itu yang diizinkan. Jika kosong, API publik menggunakan `PUBLIC_SITE_ORIGIN`, lalu `NEXT_PUBLIC_SITE_URL` sebagai fallback |
| Cache metadata umum (`status_show`, organisasi, grup/topik, tag) | `s-maxage=5`, `stale-while-revalidate=5`                                                                                                                                                  |
| Cache hasil pencarian dan data yang bergantung pada visibilitas  | `Cache-Control: no-store` untuk `package_search`, `package_show`, riwayat aktivitas, resource, berkas, dan DataStore                                                                      |
| Cache respons error                                              | `no-store`                                                                                                                                                                                |
| Pengindeksan                                                     | `X-Robots-Tag: noindex, nofollow, noarchive`                                                                                                                                              |
| Keamanan header                                                  | `X-Content-Type-Options: nosniff`                                                                                                                                                         |

`HEAD` mengikuti pemrosesan `GET`, tetapi tidak mengembalikan isi respons. `OPTIONS` hanya mengembalikan `204` untuk action yang masuk daftar izin; action yang tidak dikenal menghasilkan `404`. Header CORS hanya diberikan kepada origin yang tercantum pada `PUBLIC_API_CORS_ORIGINS`; bila kosong, API publik memakai `PUBLIC_SITE_ORIGIN` atau `NEXT_PUBLIC_SITE_URL` sebagai fallback. Jika diisi, `PUBLIC_API_CORS_ORIGINS` menjadi daftar yang berlaku dan menggantikan origin fallback; daftar tersebut tidak digabungkan dengan fallback. Jangan gunakan wildcard untuk mengizinkan origin Portal Admin. Permintaan mutasi (`POST`, `PUT`, `PATCH`, `DELETE`) serta action yang tidak di-allowlist ditolak. Jalur action harus terdiri dari satu segmen, misalnya `/package_show`, bukan path bertingkat.

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

Properti di dalam `result` bergantung pada action. Contoh objek di atas hanya ilustrasi bentuk objek `Package`; daftar properti yang tersedia mengikuti metadata di CKAN.

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

| HTTP         | Arti pada API publik                                                                                |
| ------------ | --------------------------------------------------------------------------------------------------- |
| `400`        | Parameter tidak dikenal/duplikat, nilai tidak valid, atau parameter wajib hilang                    |
| `403`        | CKAN menolak akses ke action atau objek berdasarkan izin                                            |
| `404`        | Action publik atau objek tidak ditemukan                                                            |
| `409`, `422` | Konflik/validasi layanan CKAN yang dikenali dan diteruskan                                          |
| `502`        | Layanan CKAN tidak dapat diakses atau menghasilkan kegagalan yang tidak dipetakan ke status di atas |

Untuk respons error, respons tidak disimpan di cache bersama. Hasil pencarian dataset, detail dataset, resource/berkas, riwayat aktivitas, dan baris DataStore memakai `Cache-Control: no-store` pada **API HTTP publik** agar reverse proxy/CDN tidak menyimpan respons yang bergantung pada visibilitas objek. Jangan menambahkan caching di reverse proxy/CDN untuk action yang ditandai no-store.

**Catatan tentang cache internal Next.js:** tabel di atas hanya menjelaskan respons `/api/3/action` yang dilihat browser/aplikasi luar. Pembacaan CKAN langsung dari Server Components/Server Actions Next.js memakai cache data terpisah selama 60 detik untuk permintaan anonim yang aman, dengan tag `ckan-public` dan `ckan-action:{nama-action}`. Perubahan CKAN mengirim webhook internal bertanda tangan HMAC untuk menginvalidasi tag `ckan-public`; TTL 60 detik menjadi batas pemulihan jika webhook tidak berhasil. Permintaan dengan sesi CKAN, `include_private=true`, `package_activity_list`, dan `file_show` tetap `no-store`. Jangan menurunkan aturan no-store pada API publik atau permintaan privat hanya demi performa.

## 3. Action yang tersedia

Jalur dasar setiap contoh di bawah adalah `/api/3/action`. Semua nama parameter bersifat peka terhadap huruf besar-kecil. Parameter yang tidak tercantum ditolak untuk action yang memakai whitelist, dan nama parameter tidak boleh dikirim lebih dari sekali.

| Action                  | Parameter yang diterima                        | Deskripsi dan aturan                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `status_show`           | Tidak ada                                      | Status dasar CKAN. Query parameter apa pun ditolak.                                                                                                                                                                                                                                                                                                                                             |
| `package_search`        | `q`, `rows`, `start`, `facets`, `sort`, `fq`   | Mencari dataset yang dapat diakses pemanggil. Untuk permintaan tanpa sesi CKAN, API publik memaksa `include_private=false`. Bila sesi CKAN yang valid diteruskan, CKAN menerapkan izin akun tersebut. `sort` hanya menerima daftar urutan yang diizinkan dan `fq` hanya mendukung filter organisasi/grup serta rentang metadata_modified untuk kompatibilitas pengambilan katalog (harvesting). |
| `package_show`          | `id` **wajib**                                 | Objek dataset/package CKAN berdasarkan nama atau ID. Resource privat atau nonaktif dihapus dari daftar resource tertanam.                                                                                                                                                                                                                                                                       |
| `package_activity_list` | `id` **wajib**, `limit`, `offset`              | Riwayat aktivitas dataset yang dapat diakses pemanggil; API publik memeriksa visibilitas dataset terlebih dahulu, membatasi jumlah hasil, selalu memaksa `include_hidden_activity=false`, dan menghapus identitas pengguna internal. `limit` nilai bawaan 8 (maksimum 31), `offset` nilai bawaan 0. `include_data` dan `include_hidden_activity` tidak diterima dari pemanggil publik.          |
| `organization_list`     | `all_fields`, `include_dataset_count`, `limit` | Daftar organisasi. `include_users` dan `include_extras` selalu dipaksa `false`.                                                                                                                                                                                                                                                                                                                 |
| `organization_show`     | `id` **wajib**                                 | Detail organisasi; dataset tertanam, kolom pengguna, dan extras tidak disertakan.                                                                                                                                                                                                                                                                                                               |
| `group_list`            | `all_fields`                                   | Daftar grup/topik CKAN, default `all_fields=true`.                                                                                                                                                                                                                                                                                                                                              |
| `group_show`            | `id` **wajib**                                 | Detail satu grup/topik.                                                                                                                                                                                                                                                                                                                                                                         |
| `tag_list`              | `query`, `all_fields`                          | Daftar tag, dengan query opsional dan default `all_fields=false`.                                                                                                                                                                                                                                                                                                                               |
| `resource_show`         | `id` **wajib**                                 | Metadata satu Resource CKAN.                                                                                                                                                                                                                                                                                                                                                                    |
| `file_show`             | `id` **wajib**                                 | Metadata entitas File CKAN 2.12, bukan unduhan isi file.                                                                                                                                                                                                                                                                                                                                        |
| `datastore_search`      | `resource_id` **wajib**, `limit`, `offset`     | Membaca baris resource aktif yang dapat diakses pemanggil; query lanjutan sengaja tidak diteruskan.                                                                                                                                                                                                                                                                                             |

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
curl -sS 'https://data.example.go.id/api/3/action/package_search?q=pendidikan&rows=20&start=0'
```

`q` menerima teks/frasa sederhana hingga 160 karakter: huruf Unicode, angka, spasi, `_`, `.`, `,`, apostrof, dan tanda hubung. API publik mengubah teks tersebut menjadi literal frasa yang di-quote sebelum meneruskannya ke CKAN. Nilai khusus `*:*` didukung untuk pencarian seluruh katalog. Sintaks Lucene/Solr lainnya—termasuk kueri pada kolom seperti `title:*`, operator, colon, wildcard bebas, dan sintaks lanjutan—ditolak.

`facets=true` menambahkan facet untuk grup, organisasi, format resource, dan periode acuan (`extras_portal_reference_period`). Tanpa sesi CKAN, API publik memaksa `include_private=false`; dengan sesi CKAN valid, pencarian mengikuti izin akun yang diverifikasi CKAN. `sort` hanya menerima `id asc`, `id desc`, `name asc`, `name desc`, `metadata_modified asc`, atau `metadata_modified desc`. `fq` hanya menerima filter `organization:<slug>`, `groups:<slug>` (dengan negasi atau OR pada kolom yang sama), dan rentang `metadata_modified:[tanggal TO *]`. Sintaks Solr bebas, kolom lain, wildcard, local params, parentesis, dan boosting ditolak.

**Catatan perbedaan pencarian:** pencarian UI di `/dataset` memiliki normalisasi kata kunci portal yang memungkinkan token bermakna dicocokkan secara OR di indeks title, notes, tags, organisasi, grup, dan metadata resource. Action API eksternal `package_search` di atas sengaja hanya menerima query literal sederhana; perilakunya tidak identik dengan pencarian UI.

### 3.3 DataStore

Contoh:

```bash
curl -sS 'https://data.example.go.id/api/3/action/datastore_search?resource_id=RESOURCE_ID&limit=10&offset=0'
```

Untuk halaman berikutnya, naikkan `offset` sebesar jumlah baris yang telah diminta. API publik membatasi satu permintaan hingga 100 baris dan offset 100.000. Parameter `q`, `filters`, `sort`, `fields`, dan kueri DataStore lanjutan lainnya tidak diterima agar endpoint publik tetap dibatasi. Kolom, baris data, dan jumlah total yang dikembalikan mengikuti keadaan tabel DataStore di CKAN.

## 4. Contoh tambahan

```bash
# Metadata dataset
curl -sS 'https://data.example.go.id/api/3/action/package_show?id=nama-dataset'

# Daftar organisasi
curl -sS 'https://data.example.go.id/api/3/action/organization_list?all_fields=true&limit=1000'

# Facet katalog, tanpa mengunduh baris dataset
curl -sS 'https://data.example.go.id/api/3/action/package_search?q=%2A%3A%2A&rows=0&facets=true'

# Riwayat perubahan dataset
curl -sS 'https://data.example.go.id/api/3/action/package_activity_list?id=nama-dataset&limit=8&offset=0'

# Metadata resource
curl -sS 'https://data.example.go.id/api/3/action/resource_show?id=RESOURCE_ID'
```

ID resource biasanya tersedia pada array `resources` dalam hasil `package_show`; gunakan ID tersebut sebagai `resource_id` saat membaca DataStore. Resource yang ditandai privat atau berstatus nonaktif dihilangkan dari daftar resource tertanam pada hasil `package_show` dan `package_search`, termasuk ketika dataset induk dapat diakses melalui sesi CKAN. API riwayat aktivitas juga tidak mengembalikan kolom `user`, `user_id`, atau `activity_user_id` agar endpoint publik tidak menjadi jalur untuk menemukan identitas staf internal.

## 5. Integrasi pengambilan katalog eksternal (harvesting)

Portal disiapkan untuk kemungkinan diambil oleh harvester CKAN lain, tanpa membuka hostname administrasi. Alamat sumber yang perlu didaftarkan pada harvester adalah:

```text
https://data.example.go.id
```

Jangan menggunakan `CKAN_HOST` (misalnya `https://ckan.example.go.id`); hostname tersebut khusus administrasi. Gunakan `PUBLIC_HOST` (misalnya `https://data.example.go.id`) sebagai alamat publik untuk pengambilan katalog. Harvester CKAN standar memanggil `package_search` dengan `rows`, `start`, `sort=id asc`, lalu memakai filter `fq` untuk membatasi organisasi/grup atau mengambil metadata yang berubah sejak proses sebelumnya. API publik kini mendukung subset parameter tersebut secara terbatas. Action untuk membaca data seperti `package_show`, `organization_show`, dan `group_show` tetap tersedia untuk metadata yang bersifat publik.

Contoh permintaan awal:

```bash
curl -sS 'https://data.example.go.id/api/3/action/package_search?rows=100&start=0&sort=id%20asc'
```

Contoh permintaan perubahan sejak 1 Januari 2026 (tanggal ini hanya contoh pengujian; untuk pengambilan data bertahap, gunakan titik pemeriksaan (checkpoint) UTC dari sinkronisasi terakhir yang berhasil):

```bash
curl -sS 'https://data.example.go.id/api/3/action/package_search?rows=100&start=0&sort=id%20asc&fq=metadata_modified%3A%5B2026-01-01T00%3A00%3A00Z%20TO%20*%5D'
```

Permintaan anonim untuk metadata publik tidak memerlukan API key. Sinkronisasi katalog antarsistem tidak memerlukan CORS browser. Untuk aplikasi browser dari origin lain, CORS harus dibuka eksplisit melalui `PUBLIC_API_CORS_ORIGINS`, yaitu daftar origin lengkap (termasuk skema dan port bila ada) yang dipisahkan koma. Gunakan HTTPS untuk lingkungan produksi. Daftar ini menggantikan fallback origin portal, jadi sertakan juga domain portal bila masih diperlukan. Jangan mengaktifkan wildcard secara default. Dataset privat hanya dapat dibaca melalui sesi CKAN yang sah dan tetap mengikuti izin CKAN; action mutasi tetap tidak tersedia. Bila pihak SDI memilih metode DCAT/RDF, gunakan endpoint ekspor DCAT publik (`/catalog.rdf`, `/catalog.ttl`, atau `/catalog.jsonld`) dan cocokkan profil metadata yang diwajibkan oleh harvester tujuan. Dukungan teknis ini menyiapkan jalur koneksi; **belum berarti sumber instansi telah didaftarkan atau lulus uji penerimaan SDI**.

## 6. Bentuk data utama

- **Package / dataset:** lazimnya berisi `id`, `name`, `title`, `notes`, `metadata_created`, `metadata_modified`, `license_id`, `license_title`, `organization`, `groups`, `tags`, `extras`, `resources`, dan `state`.
- **Resource:** dapat berisi `id`, `package_id`, `name`, `description`, `format`, `mimetype`, `url`, `size`, `datastore_active`, serta status dan metadata terkait.
- **Organization:** dapat berisi `id`, `name`, `title`, `description`, `image_url`, `state`, serta jumlah dataset bila tersedia.
- **DataStore:** memuat data baris dan definisi kolom sesuai tabel resource yang telah diaktifkan. Bentuk metadata tambahan bergantung pada konfigurasi CKAN dan resource.

Properti opsional dapat tidak tersedia atau bernilai `null`. Jangan mengasumsikan seluruh paket menyediakan lisensi, organisasi, tanggal, resource, atau DataStore aktif.

URL unduhan pada hasil CKAN diproses agar menggunakan hostname publik yang dikonfigurasi; host admin/internal tidak boleh disebarkan melalui URL resource yang ditampilkan. Izin file tetap mengikuti CKAN.

## 7. Data khusus portal dan proses penerbitan

API CKAN bawaan tidak mendefinisikan entitas khusus portal untuk indikator, infografik, publikasi, observasi, atau GeoPortal. Halaman khusus portal merakit konten tersebut dari record dataset CKAN, tag, kolom ekstra skema, dan resource DataStore. `portal_type` adalah metadata tambahan portal; tipe package internal tetap `dataset`. Ini sengaja mempertahankan satu sumber metadata, organisasi, lisensi, izin, resource, versi, dan riwayat. Pada antarmuka publik, katalog `/dataset` mengecualikan record bertipe `indikator`, `infografik`, dan `publikasi`; ketiganya muncul pada laman khusus masing-masing, sehingga tidak tercampur atau dihitung ganda sebagai dataset umum.

- **Indikator statistik:** Record CKAN bertipe portal `indikator` dengan tag `portal-indikator` yang ditambahkan otomatis saat tipe konten dipilih pada formulir admin, serta resource tabular yang mengaktifkan DataStore. Ini tetap merupakan data terstruktur dan observasinya tetap bersumber dari DataStore, tetapi ditampilkan pada katalog Statistik, bukan daftar Dataset umum. Properti `period` dan `value` diperlukan; `region`, `unit`, dan `source` disarankan. Metadata dapat meliputi `portal_unit`, `portal_periodicity`, `portal_definition`, `portal_formula`, `portal_source`, `portal_geography`, dan `portal_reference_period`.
- **Infografik:** Record CKAN bertipe portal `infografik`; tag `portal-infografik` ditambahkan otomatis oleh formulir admin, dengan resource gambar/PDF. Jadikan record terpisah bila visual memiliki judul, periode, atribusi, dan metadata sendiri; bila hanya visual pendamping sebuah dataset, lebih baik simpan sebagai resource pada dataset sumber. Metadata dapat meliputi `portal_category`, `portal_period`, `portal_attribution`, dan `portal_reference_period`.
- **Publikasi/laporan:** Record CKAN bertipe portal `publikasi`; tag `portal-publikasi` ditambahkan otomatis oleh formulir admin, dengan resource dokumen publik. Untuk laporan resmi yang memiliki penerbit, periode, versi, lisensi, dan berkas rilis, pertahankan sebagai record khusus. Untuk artikel berita atau narasi web yang bukan rilis data, gunakan CKAN Pages/Blog (CMS), bukan memaksakannya menjadi dataset. Metadata dapat meliputi `portal_reference_period`, `portal_publication_date`, `portal_version`, `portal_revision_note`, `portal_methodology`, serta atribusi penerbit.

Nama tipe, tag, dan kolom harus mengikuti skema CKAN pada penerapan yang digunakan. Properti tambahan dapat dikembalikan di `extras` atau sebagai properti tingkat pertama, bergantung pada skema dan versi extension.

## 8. Batas keamanan dan operasi

1. Jangan mengekspos port PostgreSQL, Solr, Redis, maupun port internal CKAN ke internet.
2. Host admin CKAN harus terpisah dari host publik dan dilindungi oleh satu gerbang perimeter (Basic Auth Caddy atau Cloudflare Access) serta autentikasi/otorisasi CKAN. Hindari menambahkan Basic Auth di depan Cloudflare Access bila ingin mengurangi prompt login.
3. Jangan meneruskan kredensial admin, token API, atau URL internal ke browser publik.
4. Permintaan anonim `package_search` tidak menyertakan dataset privat. Jika cookie sesi CKAN yang valid diteruskan, pencarian dan endpoint detail tertentu mengikuti izin akun yang diverifikasi CKAN; CKAN tetap menjadi sumber otoritatif hak akses objek.
5. Respons error tidak dicache. Cache HTTP API publik mengikuti tabel di atas. Cache server-side Next.js adalah lapisan terpisah: pembacaan anonim yang aman memakai TTL 60 detik dengan invalidasi webhook bertanda tangan; pembacaan login/privat tetap `no-store`.
6. Endpoint API tidak ditujukan untuk pengindeksan mesin pencari (`X-Robots-Tag: noindex, nofollow, noarchive`).

Referensi protokol umum: [CKAN 2.12 Action API](https://docs.ckan.org/en/2.12/api/index.html). Jika dokumentasi resmi CKAN berbeda dengan aturan yang dijelaskan di sini, batasan API publik portal pada dokumen ini yang berlaku untuk endpoint Next.js.

## API pada detail dataset dan pratinjau publik

Setiap detail dataset pada portal publik menampilkan bagian **Akses API dataset**. Endpoint yang tersedia mengikuti API publik portal yang hanya menyediakan operasi baca:

- `GET /api/3/action/package_show?id={dataset-name}` untuk metadata dataset.
- `GET /api/3/action/resource_show?id={resource-id}` untuk metadata resource publik.
- `GET /api/3/action/datastore_search?resource_id={resource-id}&limit={n}&offset={n}` untuk isi tabel yang sudah dimuat ke DataStore.

Semua endpoint detail memeriksa ulang visibilitas dataset dan resource di CKAN sebelum mengembalikan data. API tidak menerima token admin. Permintaan tanpa sesi hanya memperoleh objek publik; permintaan dengan sesi CKAN yang valid tetap dibatasi oleh izin akun tersebut. Batas parameter dan paginasi mengikuti kontrak API publik.

### Pratinjau berkas sebelum DataStore siap

Untuk berkas CSV/TSV yang belum selesai diproses XLoader, halaman detail dapat menampilkan pratinjau sementara melalui `/api/public/resource-preview?resource_id={id}&limit={n}`. Mekanisme cadangan membaca paling banyak 1 MiB dan 25 baris secara default, memvalidasi dataset/resource sebagai publik, dan hanya mengambil jalur unduhan CKAN yang tervalidasi dari alamat internal. Endpoint ini bukan pengganti DataStore dan tidak memberi paginasi penuh. Pratinjau lengkap dan API tabel tetap memakai `datastore_search` setelah XLoader selesai. XLS/XLSX/ODS memerlukan pemrosesan XLoader/DataStore.

## Rujukan terkait

- [Pratinjau DataStore dan Sinkronisasi](PANDUAN-PORTAL.md#datastore-sinkronisasi-dan-akses-data) — pemrosesan resource tabular.
- [Konten, CMS, dan Media](PANDUAN-PORTAL.md#administrasi-ckan-cms-dan-identitas-portal) — Pages/Blog, gambar, lightbox, dan klasifikasi katalog.
- [Akses Unduhan Dataset Privat](PANDUAN-PORTAL.md#datastore-dan-akses) — sesi dan otorisasi CKAN.
- [Kualitas Frontend Publik](PANDUAN-PORTAL.md#desain-dan-kualitas-frontend) — paginasi, aksesibilitas, PWA, dan performa.

---

# Administrasi CKAN, CMS, dan Identitas Portal

Dokumen ini mencakup pengelolaan CKAN, penerbitan konten, media editorial, serta konfigurasi identitas portal. CKAN tetap menjadi sumber utama data dan pengelolaan; Next.js menyajikan portal publik.

## Administrasi CKAN

Portal Admin adalah antarmuka pengelolaan CKAN 2.12.1. CKAN tetap menjadi sumber utama data sekaligus menangani autentikasi, otorisasi, validasi, CSRF, unggahan, DataStore, dan alur kerja extension. Next.js menyajikan katalog publik; proyek ini tidak membuat backend CRUD kedua.

### Shell dan dashboard

- **Topbar:** identitas instansi dari konfigurasi, tautan portal publik, profil, pengaturan sysadmin, dan logout yang dilindungi token CSRF.
- **Sidebar:** Ringkasan, Katalog Data, Publikasi Data, Halaman & Informasi, Integrasi Data, Akun Saya, dan Pengaturan Sistem. Menu mengikuti izin CKAN.
- **Area kerja:** konten bawaan CKAN—navigasi lokasi, notifikasi, formulir, toolbar, tabel, tab, dan widget—tetap dirender oleh template CKAN.
- **Footer:** identitas dan versi CKAN selaras dengan topbar. Sidebar dapat diringkas pada layar menengah dan kecil; tabel harus tetap berada dalam area gulirnya agar tidak melebarkan halaman.

Rute dashboard: `/admin/`. Metrik memakai Action API berdasarkan hak akses pengguna: dataset (`package_search`), organisasi (`organization_list`), kategori (`group_list`), dataset milik pengguna, enam dataset terakhir diperbarui, dan tindakan cepat yang hanya muncul bila izin mengizinkan. Kegagalan satu query tidak boleh merusak render dashboard; metrik terkait menampilkan `—`, bukan angka nol palsu.

### Menu dan alur kerja

| Menu                    | Fungsi dan alur utama                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Semua dataset           | Cari/filter → detail → metadata → resource → pratinjau/API                                                       |
| Organisasi              | Kelola organisasi, anggota/peran, dan dataset pemilik                                                            |
| Kategori data           | Kelola kelompok tematik dan hubungkan dataset relevan                                                            |
| Publikasi & laporan     | Dataset `portal-publikasi`; lengkapi penerbit, periode, lisensi, berkas, lalu terbitkan                          |
| Indikator & statistik   | Dataset `portal-indikator`; lengkapi definisi, satuan, metodologi, wilayah, periode, frekuensi, dan data tabular |
| Infografik              | Dataset `portal-infografik`; unggah visual dan cantumkan sumber/periode                                          |
| Halaman portal          | Pages untuk profil, kebijakan, panduan, dan informasi tetap                                                      |
| Berita & blog           | Blog Article untuk berita, pengumuman, dan artikel berkala                                                       |
| Pengambilan data        | CKAN Harvest: sumber → harvester → jadwal/organisasi → pekerjaan → laporan                                       |
| DataStore dan pratinjau | Pemeriksaan plugin/izin, worker XLoader, antrean resource lama, dan verifikasi API                               |

Publikasi, indikator, dan infografik adalah klasifikasi dataset CKAN melalui `portal_type`/tag, bukan modul CRUD terpisah. Pages dan Blog menggunakan rute serta formulir bawaan `ckanext-pages`; tetapkan visibilitas dan tanggal terbit sebelum memeriksa hasilnya di portal.

### Formulir kontekstual dan metadata

Formulir menampilkan kolom sesuai entitas dan `portal_type`, tanpa membuat package type baru:

- Dataset baru default ke `portal_type=dataset`; tautan pintas dapat meneruskan `?portal_type=indikator|infografik|publikasi|geospasial`.
- Kolom lanjutan mengikuti tipe dataset. Resource tetap menggunakan `resource_fields`; `portal_resource_role` menentukan metadata dan saran format.
- Organisasi memakai `organization.yaml`; kategori tematik memakai `group.yaml`. Kelompok tidak memiliki pemilih `portal_type`.
- Kolom yang tidak relevan disembunyikan di browser, bukan dihapus dari schema/record. Tag portal diselaraskan saat tipe berubah, sedangkan tag lain dipertahankan.
- Formulir untuk mengedit data lama menyimpulkan tipe dari tag penemuan bila metadata `portal_type` belum tersedia.

| Tipe       | Metadata tambahan utama                                                            |
| ---------- | ---------------------------------------------------------------------------------- |
| Dataset    | Periode, tanggal, frekuensi, pembaruan, versi, revisi, metodologi, sumber, wilayah |
| Indikator  | Metadata dataset + definisi, satuan, rumus                                         |
| Infografik | Periode acuan, sumber, wilayah, kategori, periode tampil, atribusi                 |
| Publikasi  | Periode acuan, tanggal rilis, versi, revisi, kategori, lisensi/atribusi            |
| Geospasial | Periode, tanggal, frekuensi, versi, metodologi, sumber, wilayah                    |

`dataset_type` CKAN tetap `dataset`; `portal_type` hanyalah metadata portal. Skema Scheming tetap menjadi sumber validasi/penyimpanan, sehingga perubahan ini tidak membutuhkan migrasi database.

### DataStore dari UI

Buka **Integrasi Data → DataStore dan pratinjau** (`/admin/data-preview`). Admin dapat memeriksa konfigurasi, menyalin perintah izin DataStore, memeriksa status dan log worker, lalu mengantrekan hingga 25 resource tabular lama yang publik dan didukung. Antrean melalui antarmuka hanya tersedia untuk sysadmin. Worker berjalan di server; browser hanya menyalin perintah dan tidak menjalankan perintah shell. Pemrosesan ulang resource lama penuh mengikuti [panduan DataStore](PANDUAN-PORTAL.md#datastore-sinkronisasi-dan-akses-data).

### Rute, host, dan autentikasi

- `CKAN__AUTH__ROUTE_AFTER_LOGIN=portal_admin.index` mengarahkan login sukses ke dashboard.
- Blueprint `portal_admin` memakai prefix `/admin`; jangan menghapus prefix karena middleware root dapat membentuk redirect loop.
- Root `CKAN_HOST` mengarahkan pengguna anonim ke login dan pengguna terautentikasi ke dashboard.
- Host admin meminta login pada seluruh rute admin; Action API tanpa sesi mendapat JSON `401`. Host publik dan host internal tidak ikut dikunci.
- Login hanya mengautentikasi. Permission CRUD tetap ditegakkan CKAN menurut peran dan keanggotaan.

### Lokalisasi

Bahasa Indonesia (`id`) adalah default; English (`en`) tetap tersedia. Bootstrap menegakkan konfigurasi berikut:

```dotenv
CKAN__LOCALE_DEFAULT=id
CKAN__LOCALES_OFFERED="id en"
CKAN__LOCALE_ORDER="id en"
```

Katalog project dipisah menurut domain gettext:

| Domain            | Cakupan                                                      |
| ----------------- | ------------------------------------------------------------ |
| `ckan`            | CKAN core, shell portal, label umum, formulir, dan validasi  |
| `ckanext-harvest` | Sumber, pekerjaan, status, jadwal, dan tindakan Harvest      |
| `ckanext-pages`   | Pages/CMS, formulir, status publikasi, dan tindakan Pages    |
| `ckanext-dcat`    | Metadata DCAT/RDF, penerbit, kontak, lisensi, dan distribusi |

Plugin `ITranslation` mendaftarkan domain extension. Katalog `ckan.po` digabung dengan terjemahan upstream sehingga pesan bawaan yang tidak dimiliki portal tetap ada; katalog extension dikompilasi ke `.mo` saat build. Setelah plugin aktif, `ckan translation js` membangun katalog JavaScript. File `.mo` dan bundle hasil kompilasi adalah artefak build, bukan berkas sumber untuk disimpan di repository.

Aturan pemeliharaan: `msgid` harus sama dengan sumber; `msgstr` tidak boleh kosong/fuzzy; placeholder harus identik; string harus masuk ke domain yang benar; istilah teknis lazim boleh dipertahankan. Setelah upgrade CKAN/extension, ekstrak ulang string dan periksa katalog.

Validasi `python3 scripts/check-id-translations.py` (juga bagian `check-static.sh`) memeriksa empat domain, placeholder, string wajib, merge upstream `.po`/`.mo`, dan hasil kompilasi. Cakupan ini menjamin katalog yang dipelihara project, bukan seluruh teks hard-coded extension pihak ketiga.

### Peta berkas utama

| Lokasi                                                                             | Fungsi                                          |
| ---------------------------------------------------------------------------------- | ----------------------------------------------- |
| `deploy/ckan/theme/ckanext/portal_theme/templates/`                                | Shell, navigasi, dashboard, dan template portal |
| `deploy/ckan/theme/ckanext/portal_theme/assets/css/portal-theme.css`               | Compatibility styling CKAN                      |
| `deploy/ckan/theme/ckanext/portal_theme/assets/css/portal-admin-design-system.css` | Token dan komponen visual admin                 |
| `deploy/ckan/theme/ckanext/portal_theme/plugin.py`                                 | Middleware, blueprint, helper, dan schema Pages |
| `deploy/ckan/theme/setup.py`                                                       | Metadata package dan package-data               |

Template portal didaftarkan satu kali melalui `plugin_template_paths`. Bootstrap menempatkan `portal_theme` sebelum `pages` dan `activity`; urutan ini diperlukan untuk prioritas helper/template CKAN 2.12. Jangan menduplikasi direktori template pada `extra_template_paths`.

### Batas perubahan dan validasi

Jangan mengganti rute/action dataset, resource, organisasi, grup, pengguna, revisi, DataStore, validasi NAVL/Scheming, CSRF, izin, unggah, pesan notifikasi dan kesalahan, atau extension Pages, Harvest, GeoView, DCAT, dan XLoader demi styling. Detail token, layout, dan paritas publik/login/admin ada di [Sistem Desain Portal](PANDUAN-PORTAL.md#desain-dan-kualitas-frontend).

```bash
bash scripts/check-static.sh
python3 scripts/check-auth-middleware.py
node scripts/check-admin-forms.mjs
python3 scripts/check-id-translations.py
```

Uji penerimaan melalui browser mencakup login, dashboard, dataset dan resource, organisasi, Pages/Blog, Harvest, DataStore, formulir panjang, izin, filter, menu pilihan, dialog, dan unggahan, serta keyboard dan ukuran layar desktop/tablet/mobile. Rebuild dan diagnostik ada di [Panduan Operasional](PANDUAN-PORTAL.md#operasional-deployment-ckan).

## CMS, Berita, dan Media

CKAN adalah sumber tunggal konten, metadata, resource, dan hak akses. Next.js mengambil konten melalui Action API secara server-side; tidak ada database CMS kedua.

### Pages dan Blog

1. Buka menu **Pages** di CKAN Admin.
2. Gunakan **Page** untuk profil, kebijakan, panduan, dan informasi tetap.
3. Gunakan **Blog Article** untuk berita, pengumuman, dan artikel berkala.
4. Isi judul, slug, tanggal terbit, kategori, ringkasan, dan konten Markdown.
5. Atur `Visibility = Public`, simpan, lalu periksa halaman publik.

Konten private dan artikel bertanggal di masa depan tidak masuk ke portal, daftar, atau sitemap. Zona tanggal mengikuti `NEXT_PUBLIC_TIME_ZONE` (default `Asia/Makassar`).

### Kolom metadata CMS

| Kolom                                      | Fungsi                                                                      |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| `excerpt`                                  | Ringkasan kartu dan fallback deskripsi SEO                                  |
| `category`, `template_type`                | Kategori dan template (`standard`, `landing`, `policy`, `guide`, `article`) |
| `featured`                                 | Prioritas konten pilihan                                                    |
| `show_in_menu`, `menu_label`, `menu_order` | Visibilitas, label, dan urutan navigasi                                     |
| `seo_title`, `seo_description`, `og_image` | Metadata pencarian dan pratinjau tautan di media sosial                     |
| `content_blocks`                           | Komponen terstruktur JSON, maksimum 16 blok/80 KB                           |

### Markdown dan gambar editorial

Renderer Markdown mendukung heading, paragraf, format teks, tautan, gambar, daftar bertingkat/tugas, blockquote, tabel, fenced code, dan pemisah. Elemen blok harus dipisahkan baris baru. Contoh:

````markdown
**Tebal** dan _miring_. [Tautan](https://example.com)

- Butir pertama
- Butir kedua

| Kolom 1 | Kolom 2 |
| ------- | ------- |
| Isi A   | Isi B   |

```text
Contoh kode
```

![Contoh kegiatan](/unggahs/page_images/kegiatan.webp)
````

Gunakan tombol **Unggah gambar** pada editor. Hanya PNG, JPEG, GIF, dan WebP hingga 8 MiB yang diterima; SVG/HTML tidak disajikan sebagai gambar. File disimpan sebagai entitas File CKAN dengan owner `portal_media/public-editorial-media`. URL harus HTTPS atau path media CKAN yang didukung. Next.js memeriksa referensi konten publik, owner, MIME, signature, dan ukuran; pembacaan `owner_info` menerima bentuk CKAN 2.12 (`owner_type` + `id`) maupun representasi ORM (`owner_type` + `owner_id`). FileStore internal tidak boleh dibuka langsung untuk akses anonim.

Kartu berita menggunakan gambar Markdown pertama yang valid. `og_image` tetap menjadi gambar Open Graph; gambar Markdown menjadi fallback metadata sosial dan gambar kartu.

### Blok konten terstruktur

`content_blocks` menerima array JSON dengan tipe `hero`, `rich_text`, `image`, `gallery`, `stats`, `dataset_links`, `publication_list`, `cta`, dan `divider`. Blok `stats` adalah ringkasan editorial, bukan query statistik live; `dataset_links` hanya menampilkan dataset yang diverifikasi masih publik.

Contoh:

```json
[
  {
    "type": "hero",
    "title": "Satu Data",
    "description": "Data resmi instansi."
  },
  {
    "type": "dataset_links",
    "title": "Dataset pilihan",
    "items": [{ "slug": "data-sekolah-sample" }]
  }
]
```

### Rute publik

| URL                 | Isi                                          |
| ------------------- | -------------------------------------------- |
| `/informasi`        | Daftar laman dan berita pilihan              |
| `/informasi/[slug]` | Detail laman                                 |
| `/berita`           | Daftar berita dan artikel                    |
| `/berita/[slug]`    | Detail artikel dengan metadata `NewsArticle` |

Footer menampilkan laman bertanda **Tampilkan di menu**, tautan informasi, dan daftar berita.

### Pratinjau gambar (lightbox)

Komponen `src/components/ui/image-lightbox.jsx` membuka gambar pada dialog yang dirender ke `body` agar tidak terpotong `overflow` atau stacking context.

- Pilih gambar untuk membuka; pilih area latar atau tekan `Escape` untuk menutup.
- Zoom `100–500%`, roda mouse, klik ganda, pan, pinch zoom, dan swipe didukung.
- Galeri menyediakan navigasi sebelumnya/berikutnya, thumbnail, dan memuat gambar lebih awal sekitar posisi aktif.
- `+`/`=` dan `-` mengatur zoom; `0` reset; panah kiri/kanan berpindah gambar saat tidak diperbesar.
- Status loading/error terlihat; kegagalan menyediakan tautan sumber asli.
- Dialog mengelola fokus, mengunci scroll, mengembalikan fokus saat ditutup, dan mengumumkan judul/posisi galeri.

Integrasi mencakup resource gambar detail dataset, katalog/detail infografik, blok gambar/galeri CMS, Markdown Pages dan Blog, dan sampul informasi/berita. Pratinjau menggunakan URL media publik yang telah divalidasi; tidak membentuk URL penyimpanan langsung atau melewati otorisasi CKAN.

### Pemisahan katalog publik

Tipe package CKAN tetap `dataset`. `portal_type` hanya mengatur klasifikasi dan penyajian portal; bukan tipe package baru atau penyimpanan terpisah.

Katalog `/dataset` mengecualikan indikator (`portal-indikator`), infografik (`portal-infografik`), dan publikasi (`portal-publikasi`) berdasarkan tag/`extras_portal_type`. Tag mendukung record lama yang belum mempunyai extra. Katalog khusus mengambil sumber berikut:

- `/statistik`: dataset indikator dan resource tabular DataStore.
- `/infografik`: dataset infografik dan resource gambar atau PDF.
- `/publikasi`: dataset publikasi/laporan dan resource dokumen.

Tidak ada record yang dihapus, dipindahkan, atau digandakan; permission CKAN dan API native tetap sama.

### Pedoman pemodelan

1. **Indikator/statistik:** gunakan `portal_type=indikator`, tag `portal-indikator`, metadata definisi/satuan/rumus/wilayah/periode, dan resource tabular DataStore.
2. **Infografik:** gunakan `portal_type=infografik` bila visual mempunyai judul, periode, penerbit/atribusi, dan siklus publikasi sendiri. Sertakan sumber dataset. Jika hanya lampiran dataset, simpan sebagai resource dataset.
3. **Publikasi/laporan:** gunakan `portal_type=publikasi` untuk laporan resmi yang memiliki penerbit, tanggal rilis, periode, lisensi, versi, metodologi, dan berkas unduhan. Berita/narasi tetap di Pages dan Blog.
4. **Geospasial:** gunakan dataset `portal_type=geospasial`; pratinjau spasial ditampilkan pada detail dataset atau GeoPortal.

### Penerapan dan pemeriksaan

`portal_pages` dan `portal_theme` harus terdaftar sebelum `pages` dan `activity` pada `CKAN__PLUGINS`. Bootstrap mengatur urutan ini agar helper `render_content` portal menggantikan helper `ckanext-pages` tanpa rekursi. Jalankan bootstrap sebelum rebuild CKAN bila memperbarui deployment lama, lalu migrasikan Pages:

```bash
ckan db upgrade -p pages
```

Simpan `.env.ckan` secara privat. Jangan mengaktifkan `ckanext.pages.allow_html` untuk konten editorial publik. Pemeriksaan terkait ada pada `scripts/check-markdown-render.mjs`, `scripts/check-editorial-media.mjs`, `scripts/check-public-media.mjs`, `scripts/check-image-lightbox.mjs`, dan unit/E2E test yang terkait.

## Identitas dan Konfigurasi Instansi

### Prinsip

Kode sumber, package CKAN, plugin, blueprint, helper, nama komponen, CSS class, properti CSS kustom, aset admin, serta header internal memakai namespace generik `portal_*` atau `portal-*`. Nama institusi hanya menjadi data konfigurasi. Prefix extension lama yang perlu dibersihkan saat upgrade diatur melalui `PORTAL_LEGACY_EXTENSION_PREFIXES` di file contoh environment, bukan ditanam pada kode sumber. Satu portal dapat dipakai oleh kabupaten, kota, provinsi, kementerian, atau organisasi lain tanpa mengganti nama modul maupun membuat fork extension.

Identitas instansi dipusatkan pada blok `PORTAL_*` di `.env.ckan`. Nilai bawaan deployment disediakan hanya melalui `.env.ckan.example`. Script `deploy/ckan/sync-env.py` menurunkan nilai Next.js dan CKAN dari blok ini agar label, logo, deskripsi, dan identitas admin/publik tidak berbeda.

### Mengganti instansi

1. Salin `.env.ckan.example` menjadi `.env.ckan`.
2. Ubah `PUBLIC_HOST` dan `CKAN_HOST` menjadi dua hostname berbeda pada zona DNS yang sama. Contoh: `data.instansi.go.id` dan `ckan.instansi.go.id`.
3. Ubah `PORTAL_INSTITUTION_NAME` sesuai instansi tujuan. Kode sumber tidak mengenali nama tenant tertentu dan tidak melakukan penggantian otomatis berdasarkan nama. Karena itu, tinjau seluruh nilai identitas lain pada blok `PORTAL_*` pada file `.env.ckan` salinan Anda.
4. Untuk identitas final, isi atau tinjau nilai berikut sesuai kebutuhan: `PORTAL_INSTITUTION_SHORT_NAME`, `PORTAL_BRAND_NAME`, `PORTAL_SHORT_NAME`, `PORTAL_ORGANIZATION_NAME`, `PORTAL_SITE_DESCRIPTION`, `PORTAL_PUBLIC_SUBTITLE`, `PORTAL_BRAND_PROFILE`, `PORTAL_LOGO_PATH`, `PORTAL_LOGO_ALT`, `PORTAL_HERO_IMAGE`, `PORTAL_HERO_MAP_IMAGE`, `PORTAL_ICON_PATH`, `PORTAL_PWA_ICON_192`, dan `PORTAL_PWA_ICON_512`.
5. Tempatkan file logo/gambar pada direktori aset publik Next.js dan/atau aset publik extension CKAN sesuai pemakaiannya. Pastikan path `PORTAL_LOGO_PATH`, `PORTAL_HERO_IMAGE`, dan `PORTAL_HERO_MAP_IMAGE` menunjuk ke aset yang benar.
6. Isi kontak dan alamat layanan PPID milik instansi pada `PORTAL_PPID_NAME`, `PORTAL_PPID_URL`, `PORTAL_PPID_CONTACT_URL`, `PORTAL_PPID_ADDRESS`, `PORTAL_PPID_EMAIL`, dan `PORTAL_PPID_PHONE`. Nilai di `.env.ckan.example` adalah contoh konfigurasi deployment; ganti semua kontak sebelum deployment ke instansi lain.
7. Sesuaikan `CKAN_SYSADMIN_EMAIL`, locale/timezone, map tile, dan kredensial integrasi bila diperlukan.
8. Jalankan bootstrap/build ulang sesuai [Panduan Operasional CKAN](PANDUAN-PORTAL.md#operasional-deployment-ckan). `sync-env.py` dijalankan oleh bootstrap dan wrapper Compose; tidak perlu mengedit nilai turunan `NEXT_PUBLIC_*` atau `CKAN__SITE_*` secara manual.

### Konfigurasi visual dan komponen

`PORTAL_THEME_COLOR` dan `PORTAL_PWA_BACKGROUND_COLOR` mengatur warna tema browser/PWA dengan format heksadesimal enam digit, misalnya `#174566` dan `#f4f6f8`. Komponen dan token CSS tetap generik. Penyesuaian lebih jauh terhadap design system admin dilakukan melalui token `--portal-*` pada `deploy/ckan/theme/ckanext/portal_theme/assets/css/portal-admin-design-system.css` dan `portal-theme.css`, bukan dengan menambahkan class bernama institusi.

Nama CSS/JS, helper Jinja, cookie preferensi, owner media, dan plugin CKAN juga generik. `PORTAL_MEDIA_OWNER_TYPE` (default `portal_media`) serta `PORTAL_MEDIA_OWNER_ID` (default `public-editorial-media`) mengatur pemilik file editorial tanpa menyematkan nama kabupaten/instansi. `PORTAL_LEGACY_EXTENSION_PREFIXES` hanya dipakai saat upgrade untuk menghapus entry point extension lama; kosongkan setelah migrasi selesai.

### Nama extension dan plugin CKAN

Package extension yang dipasang adalah `ckanext-portal-theme`, namespace Python `ckanext.portal_theme`, dan entry point:

- `portal_theme`
- `portal_pages`
- `portal_harvest_i18n`
- `portal_pages_i18n`
- `portal_dcat_i18n`

Konfigurasi extension menggunakan namespace `CKANEXT__PORTAL_THEME__*` / `ckanext.portal_theme.*`. ID teknis tersebut tidak perlu diubah ketika identitas atau nama instansi berubah. Bootstrap memasang ID plugin generik yang ditentukan oleh konfigurasi. Kode sumber tidak membawa alias nama institusi.

### Default yang dipertahankan

`.env.ckan.example` menyediakan konfigurasi awal deployment, termasuk hostname, logo, profil identitas portal, kontak PPID, dan identitas portal. Nilai tersebut hanya berada di file contoh environment. Kode sumber, komponen, konten statis, dan pemeriksaan regresi tidak mengunci nama instansi.

---

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

API publik merupakan lapisan terpisah: metadata umum dapat memakai masa cache CDN lima detik, sedangkan pencarian/detail dataset, resource/berkas, riwayat aktivitas, dan DataStore tetap `no-store` untuk menjaga pemeriksaan visibilitas. Lihat [kontrak API publik](PANDUAN-PORTAL.md#dokumentasi-api-publik-portal-satu-data) untuk header HTTP yang diterima pemanggil.

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

- [Kontrak API publik](PANDUAN-PORTAL.md#dokumentasi-api-publik-portal-satu-data)
- [Konten, CMS, dan media](PANDUAN-PORTAL.md#administrasi-ckan-cms-dan-identitas-portal)
- [Akses unduhan dataset privat](PANDUAN-PORTAL.md#datastore-dan-akses)

---

# Desain dan Kualitas Frontend

Dokumen ini menjadi acuan tampilan portal publik, halaman login, Portal Admin, aksesibilitas, PWA, dan performa.

## Sistem Desain

Dokumen ini adalah acuan visual bersama untuk frontend publik, login CKAN, dan Portal Admin. Implementasi token kanonis berada di `src/app/styles/foundation.css` dan `deploy/ckan/theme/ckanext/portal_theme/assets/css/portal-admin-design-system.css`. Jika nilai berubah, perbarui kedua sumber dan regression check terkait.

### Identitas visual

Portal memakai pendekatan **civic data atlas**: peta wilayah menjadi jangkar visual hero, dikelilingi empat kartu statistik aktual yang ditempatkan asimetris. Setiap kartu memakai warna pekat yang berbeda, ikon yang relevan, dan garis penghubung tipis menuju peta. Bahasa visualnya editorial, terstruktur, berorientasi data dan wilayah, tetapi tetap ramah untuk masyarakat umum. Karakter yang dituju adalah **standout, modern, clean, dan estetis**—bukan dashboard SaaS generik atau halaman serba putih yang datar.

### Arah visual

- **Energi visual: 2 / 3** — cukup kuat untuk membangun karakter tanpa membuat halaman terasa ramai.
- **Ritme: 2 / 3** — variasikan komposisi antarbagian; jangan mengulang pola grid yang sama.
- **Gerak: 1 / 3** — gunakan transisi singkat dan animasi kemunculan seperlunya; hindari gerak dekoratif terus-menerus.

- **Navy `#123650`:** identitas utama, hero, panel login, dan topbar admin.
- **Blue `#1D5FA7`:** aksi utama, tautan, navigasi aktif, dan fokus.
- **Teal `#23785F`:** wilayah, lingkungan, serta konektivitas data.
- **Ochre `#91621F`:** ekonomi, industri, dan regulasi.
- **Canvas `#F5F7F6`, putih, slate:** permukaan dan teks yang nyaman dibaca.
- Aksen tambahan seperti violet, rose, atau hijau boleh dipakai pada ilustrasi/kategori bila punya konteks. Hindari warna acak atau palet pelangi.

Jenis huruf utama Inter dengan fallback sistem. Heading tegas dan rapat; isi mudah dibaca. Admin memakai skala lebih kompak daripada publik, tanpa mengecilkan kontrol atau teks penting.

### Bahasa visual per area

#### Frontend publik

- Hero desktop memakai komposisi dua kolom, foto relevan, overlay kontras, headline kuat, pencarian yang mudah ditemukan, serta peta wilayah outline transparan di sisi kanan.
- Aset `public/illustrations/region-map-outline.webp` berisi garis batas putih dengan latar transparan dan tanpa label. Aset dipilih melalui `PORTAL_HERO_MAP_IMAGE` dan dipetakan ke `NEXT_PUBLIC_HERO_MAP_IMAGE`; ganti melalui konfigurasi dengan batas wilayah yang sesuai saat portal diterapkan pada instansi lain, bukan dengan menanam nama wilayah ke komponen.
- Angka metrik harus berasal dari data CKAN. Ilustrasi tidak boleh memuat angka, nama wilayah, atau klaim statistik fiktif.
- Kartu dataset menggunakan panel ilustrasi ringan; kategori memakai warna semantik; panel unggulan dapat memadukan permukaan biru muda dan navy.
- Variasikan ritme section. Jangan mengulang grid kartu untuk semua jenis konten.
- Halaman berita/CMS menempatkan isi editorial sebagai fokus; hindari kartu ber-border dan padding besar yang tidak diperlukan.

#### Login

- Menjadi penghubung identitas publik dan admin: panel identitas navy dengan ilustrasi peta wilayah yang selaras dengan hero, dipasangkan dengan formulir putih yang menjadi fokus.
- Formulir berada di tengah, lebar maksimum sekitar `448px`, input minimum `46px`, dan font input `16px`.
- Jangan menampilkan sidebar/topbar admin pada layar login.

#### Portal Admin CKAN

- Gunakan topbar navy, sidebar netral, status aktif biru, serta aksen teal/ochre pada metrik sesuai konteks.
- Admin lebih padat dan fungsional: navigasi ringkas, metrik kompak, tabel dan formulir menjadi fokus, jarak tepi lebih kecil, serta informasi mudah dipindai.
- Area kerja maksimum `1480px`, formulir panjang `960px`, kerangka admin `1800px`, sidebar desktop `264px`.
- Pertahankan rute, template inti, kolom, validator, CSRF, izin, unggah, widget, dan JavaScript bawaan CKAN. Styling harus additive dan dibatasi pada area portal.

### Token dan komponen

Token admin menggunakan prefix `--portal-*`. Warna, font, ukuran teks, lebar shell/form, spacing, radius, shadow, dan tinggi kontrol didefinisikan pada CSS kanonis. Nilai utama:

| Token                       |     Nilai | Peran                  |
| --------------------------- | --------: | ---------------------- |
| `--portal-color-navy`       | `#123650` | Identitas utama        |
| `--portal-color-blue`       | `#1D5FA7` | Aksi dan navigasi      |
| `--portal-color-blue-hover` | `#174F8C` | Hover/focus lanjutan   |
| `--portal-color-teal`       | `#23785F` | Aksen wilayah/data     |
| `--portal-color-ochre`      | `#91621F` | Aksen ekonomi/regulasi |
| `--portal-color-canvas`     | `#F5F7F6` | Latar aplikasi         |
| `--portal-color-surface`    | `#FFFFFF` | Kartu, panel, form     |
| `--portal-color-ink`        | `#1B3440` | Teks utama             |
| `--portal-color-muted`      | `#586D76` | Deskripsi/teks bantuan |
| `--portal-color-border`     | `#D8E2E4` | Border netral          |

Ukuran dasar admin: body `0.9375rem`, kontrol `42px`, tombol `40px`, area sentuh `44px`, radius kontrol `10px`, kartu `12px`, dialog `16px`. Gutter halaman memakai `clamp(1rem, 2.1vw, 2rem)` dan jarak mengikuti kelipatan 4px.

Breakpoint admin: di bawah `1200px` ruang kerja dipersempit; di bawah `992px` sidebar menjadi navigasi collapse; di bawah `768px` panel ditumpuk dan kontrol utama tetap memiliki area sentuh `44px`; di bawah `480px` brand/toolbar diringkas tanpa mengecilkan tombol ikon di bawah `40px`. Tabel lebar memakai wrapper responsif.

Status menggunakan warna semantik—success `#28784F`, warning `#95651D`, danger `#B33D46`, info `#286B99`—dan selalu memiliki label atau ikon; warna bukan satu-satunya pembeda.

Kontrol formulir harus dibedakan menurut tugasnya: input teks, pilihan, pilihan ganda, editor teks, tanggal, kotak centang/radio, serta unggah masing-masing memiliki petunjuk penggunaan yang jelas. Tampilkan label, teks bantuan, status tidak valid, pesan error, pemuatan, dan status nonaktif secara konsisten.

### Ikon dan ilustrasi

- Pilih ikon berdasarkan makna fitur, bukan dekorasi. Ikon kategori memakai aksen warna semantik yang konsisten.
- CKAN Admin memakai macro `portal_icon` dan Font Awesome Free yang dibundel CKAN 2.12.1. Jangan mengandalkan nama alias ikon lama atau sumber ikon eksternal.
- Ilustrasi harus membantu pengguna mengenali data, wilayah, format, atau jenis publikasi. Hindari jaring node generik, kubus 3D, ornamen acak, serta grafik/angka fiktif.
- Gambar dekoratif memakai `aria-hidden="true"`; gambar informatif memiliki alt yang bermakna.

### Transisi, aksesibilitas, dan performa

- Tidak memakai animasi route, rotasi 3D, atau gerakan dekoratif terus-menerus.
- Efek keadaan hover dan fokus singkat sekitar `140–220ms`; animasi kemunculan pada halaman publik hanya sekali dan hanya aktif pada elemen daftar atau kartu yang dipilih yang relevan.
- Hormati `prefers-reduced-motion`; jangan menahan konten utama sampai animasi selesai.
- Jaga focus-visible, kontras, navigasi papan ketik, zoom, area sentuh minimal `44px`, LCP, dan CLS.

### Batas perubahan

Jangan mengganti alur CRUD atau kontrak CKAN demi tampilan. Periksa publik, login, dashboard, dataset/resource, organisasi, Pages/Blog, Harvest, DataStore, formulir panjang, dan layar mobile setiap kali mengubah token atau komponen bersama.

### Hero peta dan statistik

Peta batas wilayah menjadi ilustrasi utama hero. Empat kartu metrik yang menampilkan jumlah dataset, organisasi, kategori, dan indikator ditempatkan asimetris di sekelilingnya. Gunakan warna pekat yang berbeda, teks dan ikon berkontras tinggi, serta garis penghubung tipis dengan titik kecil menuju peta. Kartu boleh bergerak vertikal secara halus sekitar 5 px, tetapi tidak boleh saling menutupi atau keluar dari area visual. Nonaktifkan gerak saat `prefers-reduced-motion` aktif. Pertahankan rasio kontras teks minimal 4.5:1.

## Kualitas Frontend Publik

Dokumen ini adalah panduan kanonis untuk menjaga pengalaman portal publik Next.js. Untuk perubahan katalog dan sumber data, gunakan [kontrak API publik](PANDUAN-PORTAL.md#dokumentasi-api-publik-portal-satu-data), [pratinjau DataStore](PANDUAN-PORTAL.md#datastore-dan-akses), dan [konten dan media](PANDUAN-PORTAL.md#administrasi-ckan-cms-dan-identitas-portal). Untuk proses penerapan, lihat [panduan deployment](PANDUAN-PORTAL.md#operasional-deployment-ckan).

### Paginasi katalog

Katalog Dataset, Statistik/Indikator, Infografik, dan Publikasi memakai `PublicPagination` bersama. Parameter halaman dinormalisasi ke bilangan bulat positif. Permintaan halaman yang melewati batas diarahkan ke halaman terakhir yang valid setelah jumlah hasil diketahui. UI menampilkan rentang hasil, halaman aktif dengan `aria-current="page"`, tautan `rel="prev"`/`rel="next"`, dan kontrol batas yang dinonaktifkan. Saat halaman berubah, fokus dan posisi pembaca diarahkan ke daftar hasil, bukan dibiarkan di bagian atas halaman.

### Catatan dan pratinjau dokumen

Keterangan metodologis atau batasan di bagian bawah halaman harus menggunakan `PublicNote` agar tampil sebagai catatan sekunder. Komponen `PdfResourcePreview` dipakai bersama pada detail Dataset, Publikasi, dan Infografik. Pratinjau memuat PDF secara lazy, memiliki judul frame yang aksesibel, dan menyediakan tautan buka dokumen pada tab baru jika embed tidak didukung browser.

### Artikel unggulan pada layar kecil

Urutan visual artikel unggulan menggunakan kelas utility `order`: gambar tampil sebelum teks pada layar kecil, sementara urutan desktop tetap seperti desain editorial sebelumnya. Pertahankan hook class `public-news-feature-media` dan `public-news-feature-copy`; uji regresi memeriksa geometri pada mobile dan desktop.

### Aksesibilitas

Pemeriksaan dasar E2E browser ada di `tests/e2e/public-accessibility.spec.js`. Audit memeriksa landmark `main`, satu `h1`, label kontrol, nama aksesibel link/button, teks alternatif gambar, ID unik, dan skip-link melalui keyboard. Perubahan komponen interaktif wajib mempertahankan label, focus-visible, urutan tab, dan state yang dapat dipahami pembaca layar.

Untuk audit WCAG yang lebih lengkap, jalankan axe pada seluruh rute utama (termasuk detail konten) dan lakukan pemeriksaan manual keyboard-only, zoom 200%, kontras, reflow, serta screen reader. Pemeriksaan E2E dasar bukan sertifikasi WCAG.

### Performa dan Core Web Vitals

Smoke browser awal mengumpulkan LCP dan CLS serta menghitung resource JavaScript dari portal. Test ini adalah alarm regresi ringan, bukan pengganti pengukuran lapangan. Untuk rilis, jalankan Lighthouse pada build produksi dan catat LCP, INP, CLS, TTFB, ukuran JS, dan waterfall pada simulasi perangkat seluler dengan jaringan terbatas. Periksa pula cache API, paginasi backend, lazy loading gambar/PDF, dan layout shift dari font/media.

Target Core Web Vitals pada persentil ke-75:

| Metrik | Target baik | Makna                 |
| ------ | ----------: | --------------------- |
| LCP    | ≤ 2,5 detik | Konten utama terlihat |
| INP    |    ≤ 200 ms | Respons interaksi     |
| CLS    |       ≤ 0,1 | Stabilitas tata letak |

### Hasil audit performa FE, portal, dan CKAN

#### Perbaikan yang sudah diterapkan

- **Cache data di server:** pembacaan CKAN anonim yang aman memakai Next.js cache data selama 60 detik dengan tag `ckan-public` dan tag per action. Hook CKAN mengirim webhook HMAC setelah perubahan dataset, resource, organisasi, grup, Pages, atau proses pengindeksan; Next.js menginvalidasi tag sebelum pembacaan berikutnya. Jika webhook gagal, masa revalidasi 60 detik menjadi pemicu penyegaran berikutnya; sesuai mekanisme stale-while-revalidate Next.js, satu permintaan dapat menerima data lama ketika penyegaran berlangsung.
- **Batas keamanan cache:** permintaan yang membawa cookie CKAN, `include_private=true`, activity, dan metadata file tetap `no-store`. Kebijakan ini berlaku juga untuk action organisasi/grup apabila pemanggil meminta data privat. API HTTP publik tetap menerapkan kebijakan `no-store` tersendiri untuk action yang memerlukan pemeriksaan visibilitas.
- **Ringkasan beranda:** `organization_list` hanya meminta nama organisasi (`all_fields=false`) karena beranda hanya membutuhkan jumlahnya. Properti `package_count` tidak digunakan sebagai jumlah dataset umum. Metrik kedua beranda adalah **Kategori**, dihitung dari jumlah kelompok CKAN yang memiliki setidaknya satu dataset umum publik. Penghitung beranda tidak lagi menjalankan `resource_search` yang tidak relevan dengan label atau tujuan tautan.
- **Direktori kategori:** kartu metrik Kategori membuka `/kategori`, bukan katalog dataset umum secara langsung. Halaman ini menampilkan daftar kategori, jumlah dataset umum publik di setiap kategori, pencarian, pengurutan, dan paginasi. Setiap kategori mengarah ke `/dataset?kategori=<id>`. Halaman tersedia melalui kartu beranda dan tautan bagian kategori, tetapi sengaja tidak dimasukkan ke menu header utama. URL pencarian/pengurutan/paginasi diberi `noindex,follow` dan direktori kanonis masuk sitemap serta robots.
- **Facet OPD:** empat kategori dihitung melalui query terpisah dan setiap query hanya meminta facet organisasi. Ini menjaga ketepatan definisi dataset umum, indikator, infografik, dan publikasi; hasil facet dapat digunakan kembali dari cache. Daftar direktori tetap meminta properti organisasi karena kartu OPD membutuhkan nama, deskripsi, dan logo; pantau batas `ckan.group_and_organization_list_all_fields_max` (default CKAN 25) bila jumlah OPD bertambah.
- **Katalog indikator:** daftar tidak lagi membaca DataStore untuk setiap kartu. Nilai terbaru hanya diambil pada sorotan beranda yang dibatasi dan pada halaman detail indikator. Ini menghilangkan pola permintaan N+1 DataStore dari halaman daftar.
- **Pencarian:** jumlah token unik dibatasi 12, kolom pencarian memakai allowlist, dan parameter pengurutan menggunakan kontrak tetap. Token memang muncul berulang pada query Solr karena masing-masing dicoba pada beberapa field; batas 12 berlaku pada token unik, bukan jumlah kemunculan teks token pada query.
- **Build FE:** Docker memakai multi-stage build Next.js standalone, image runner terpisah, user non-root, kompresi respons, dan source map browser produksi dinonaktifkan.
- **LCP beranda:** foto hero dirender melalui `next/image` di HTML server, memakai `preload` native Next.js, ukuran responsif `100vw`, dan titik fokus terpisah untuk layar kecil. URL eksternal tetap melewati jalur `unoptimized` agar tidak membuka Image Optimizer ke host yang belum dimasukkan ke daftar izin.
- **PWA dan cache browser:** manifest, warna tema, dan ikon instalasi mengikuti satu konfigurasi situs. Service worker hanya didaftarkan di produksi; halaman navigasi selalu mengambil HTML terbaru dari jaringan, dengan `/offline.html` sebagai fallback saat offline. Cache v5 dibatasi pada ikon, chunk Next.js ber-hash yang ditandai `immutable`, dan daftar gambar publik berukuran kecil. Cache dibatasi 140 aset dan 2 MiB per aset; respons `private`/`no-store`, API, HTML, endpoint unduhan CKAN, serta unggahan editorial tidak pernah disimpan.
- **Pembaruan service worker:** pemanggilan `register()` dibiarkan memakai mekanisme pembaruan browser dan `updateViaCache: "none"`; aplikasi tidak memaksa pemanggilan `registration.update()` pada setiap kunjungan agar tidak menambah permintaan jaringan yang tidak perlu.

#### Area yang masih perlu dipantau

- **Hitungan resource:** metrik resource tidak ditampilkan pada ringkasan beranda karena tujuannya sebelumnya mengarah ke katalog dataset umum dan membingungkan pengunjung. Jangan menghidupkan kembali penghitung `resource_search` pada beranda tanpa label serta halaman tujuan yang secara khusus menjelaskan bahwa angka tersebut adalah jumlah berkas/resource, bukan jumlah dataset atau kategori.
- **Sitemap:** generator saat ini membaca katalog secara bertahap sampai batas 50.000 URL dan berjalan dinamis. Pada katalog besar, regenerasi sitemap dapat menjadi beban tersendiri. Langkah skala berikutnya adalah memecah sitemap per keluarga konten atau memakai `generateSitemaps()` dan mengukur waktu respons tiap bagian.
- **Gambar CMS/CKAN:** beberapa gambar dinamis menggunakan `unoptimized` untuk menghindari pengambilan gambar dari domain yang belum masuk daftar izin oleh Image Optimizer. Konsekuensinya, Next.js tidak membuat varian ukuran/format otomatis; gambar besar dapat meningkatkan transfer bytes dan LCP. Solusi yang aman adalah normalisasi ukuran/WebP saat unggah atau proxy gambar origin yang sama dengan allowlist, bukan membuka optimizer ke semua host.
- **DataStore:** detail indikator membatasi pembacaan hingga 1.000 observasi terbaru/terurut. Ini cukup untuk grafik ringkasan, tetapi bukan mekanisme ekspor seluruh data. Untuk tabel yang tumbuh sangat besar, gunakan paginasi/keyset di backend daripada terus memperbesar `limit` atau `offset`.
- **Invalidasi CKAN:** webhook invalidasi dipanggil sinkron dari hook CKAN dengan timeout 1,5 detik dan kegagalannya tidak membatalkan penyimpanan. Bila waktu simpan CKAN menjadi lambat, ukur durasi hook dan pertimbangkan antrean asynchronous yang tetap memiliki retry serta TTL fallback.
- **Kapasitas backend:** berkas Compose override mendefinisikan healthcheck dan restart policy untuk Next.js/worker, tetapi belum menetapkan batas CPU, memori, atau PID. Batas kapasitas yang tepat tidak dapat ditentukan dari source saja; ukur pemakaian VPS, PostgreSQL, Solr, Redis/RQ, XLoader, dan CKAN pada beban nyata sebelum menetapkan limit.

#### Cara mengukur sebelum dan sesudah rilis

1. Buat build produksi, lalu jalankan Lighthouse pada beranda, katalog Dataset, katalog Statistik, detail Dataset, detail OPD, dan detail Publikasi menggunakan profil perangkat seluler. Simpan LCP, INP, CLS, TTFB, ukuran transfer, dan jumlah permintaan.
2. Jalankan pengukuran dengan cache dingin dan hangat. Catat p50/p95 TTFB dan durasi action CKAN (`package_search`, `resource_search`, `organization_list`, `datastore_search`) secara terpisah.
3. Pada VPS, catat CPU/RAM per container, restart/OOM, latensi PostgreSQL, durasi/slow query Solr, antrean Redis/RQ, serta waktu XLoader. Uji dengan trafik yang mendekati jam sibuk.
4. Bandingkan hasil sebelum dan sesudah dengan dataset dan kondisi jaringan yang sama. Jangan menyimpulkan peningkatan Core Web Vitals hanya dari pemeriksaan source atau unit test.

Target Core Web Vitals pada persentil ke-75: LCP ≤ 2,5 detik, INP ≤ 200 ms, dan CLS ≤ 0,1. Ini adalah ambang kategori “baik” menurut Google, bukan hasil pengukuran portal. Belum ada hasil Lighthouse produksi atau metrik lapangan pada audit source ini; angka aktual harus diisi setelah pengukuran runtime. Rujukan: [Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals), [Next.js revalidateTag](https://nextjs.org/docs/app/api-reference/functions/revalidateTag), [Next.js Image](https://nextjs.org/docs/app/api-reference/components/image), dan [CKAN DataStore paginasi](https://docs.ckan.org/en/2.12/maintaining/datastore.html).

### Analitik penerbitan OPD pada Admin CKAN

Dashboard Portal Admin menampilkan peringkat penerbitan organisasi dari empat facet (dimensi agregasi) CKAN yang terpisah: dataset umum, indikator, infografik, dan publikasi. Data tidak memakai `organization.package_count`, karena field tersebut menghitung paket lintas tipe. Panel ini hanya tersedia bila keempat query facet berhasil; kegagalan satu sumber tidak disamarkan sebagai nol. Query mengatur `include_private=false`, sehingga angka merepresentasikan konten publik saja dan dapat dibandingkan dengan katalog publik. Filter per tipe dibuat saling eksklusif; entri dengan penanda kategori yang saling bertentangan tidak dihitung ganda.

Perhitungan murni diuji di `scripts/test-publisher-analytics.py`, dengan fixture OPD yang memiliki satu infografik tetapi nol dataset umum.

### Perintah perapian dan pemeriksaan

```bash
npm ci
npm run format:write
npm run lint:fix
npm run check
npm run test
npm run test:e2e
npm run build
```

`npm run fix` menjalankan perapian format lalu perbaikan otomatis ESLint. `npm run check` tetap menjadi quality gate utama (static checks dan ESLint). `npm run test:e2e` memerlukan browser Playwright yang sudah dipasang. Jalankan `npm run format:check` pada CI bila ingin memastikan file sudah diformat tanpa mengubah source.

### Promosi pemasangan PWA

Promosi PWA berada di `PublicLayout`, bukan root layout, sehingga tidak tampil pada CKAN Admin atau shell autentikasi. Bentuknya kartu kecil yang dapat ditutup; tidak ada dialog otomatis.

- Baru memenuhi syarat setelah kunjungan kedua pada sesi yang berbeda dan tiga path publik unik dibuka. Maksimum satu tawaran per sesi.
- Tutup manual menyembunyikan promosi 14 hari; penolakan prompt native 30 hari. Mode standalone atau event `appinstalled` menghentikan promosi. Status interaksi hanya disimpan di penyimpanan browser.
- Chromium memakai `beforeinstallprompt` setelah klik pengguna. iOS mengarahkan ke Add to Home Screen melalui Safari; Android dan desktop mendapat panduan menu browser yang sesuai. Browser tanpa jalur instalasi yang andal tidak diberi janji instalasi.
- Komponen tidak mengambil fokus otomatis, memiliki nama aksesibel, menghormati area aman layar/reduced gerak, dan disembunyikan saat pengguna mengisi form, membuka dialog, mengunduh, atau membuka tab baru.
- Tidak ada API web universal untuk mendeteksi status instalasi pada semua browser; deteksi memakai `display-mode`, `navigator.standalone`, dan `appinstalled` bila tersedia.

Pemeriksaan regresi: `node scripts/check-pwa.mjs`, `node scripts/test-service-worker.mjs`, unit test `tests/unit/pwa-install-promotion.test.js`, dan E2E `tests/e2e/public-performance.spec.js`.

---

# Operasional Deployment CKAN

CKAN 2.12.1 adalah backend otoritatif untuk dataset, resource, organisasi, DataStore, autentikasi, dan CMS. Next.js menyajikan portal publik. Source untuk image runtime dibangun dari `ckan/ckan-docker-base`; stack service berasal dari `ckan/ckan-docker`.

## Persiapan pertama

```bash
cp .env.ckan.example .env.ckan
# Isi PUBLIC_HOST, CKAN_HOST, CLOUDFLARE_TUNNEL_TOKEN, dan secret lain
bash ./deploy/ckan/bootstrap-upstream.sh
```

`.env.ckan` adalah satu-satunya konfigurasi lingkungan lokal dan tidak boleh dikomit. Bootstrap menyinkronkan kode sumber resmi CKAN, memverifikasi CKAN 2.12.1, menyusun environment backend, memasang extension dengan versi yang dikunci, ekstensi tema portal, dan katalog Bahasa Indonesia. Image dasar dibangun dari kode sumber resmi CKAN sebelum Compose dijalankan.

## Menjalankan dan memperbarui layanan

Cloudflare Tunnel (profil standar):

```bash
bash ./deploy/ckan/compose.sh cloudflare config
bash ./deploy/ckan/compose.sh cloudflare up -d --build
bash ./deploy/ckan/compose.sh cloudflare ps
```

Akses melalui Caddy tanpa Tunnel: ganti `cloudflare` dengan `manual`. Profil `cloudflare-basic-auth` dan `manual-basic-auth` tersedia untuk lapisan autentikasi tambahan. Jangan arahkan hostname admin langsung ke container CKAN; semua hostname masuk melalui Caddy sesuai profil.

Hostname publik dan admin idealnya berada pada domain induk yang sama, misalnya `data.example.go.id` dan `ckan.example.go.id`, agar sesi CKAN dapat dibagikan secara aman bila konfigurasi cookie mengizinkan. `PUBLIC_HOST` tetap menjadi origin tautan publik; `CKAN_HOST` khusus login/admin. Perbarui hostname pada Cloudflare Tunnel secara terpisah dari `.env.ckan`.

## Build ulang sesuai perubahan

```bash
# CKAN extension, template, terjemahan, skema, atau CSS admin
bash ./deploy/ckan/bootstrap-upstream.sh
bash ./deploy/ckan/compose.sh cloudflare up -d --build --force-recreate ckan

# Next.js saja
bash ./deploy/ckan/compose.sh cloudflare up -d --build --force-recreate nextjs
```

Setelah perubahan frontend dan CKAN bersama, bangun ulang kedua layanan. Lakukan muat ulang paksa halaman di browser untuk memperbarui WebAssets CKAN.

## Pemeriksaan cepat

```bash
bash ./deploy/ckan/compose.sh cloudflare ps
bash ./deploy/ckan/compose.sh cloudflare logs --tail=150 ckan nextjs nginx edge-tunnel cloudflared
curl -sS https://$PUBLIC_HOST/api/3/action/status_show
curl -sSI https://$CKAN_HOST/user/login
```

Jika CKAN unhealthy, lihat log CKAN dan riwayat pemeriksaan kesehatan sebelum restart: `docker inspect <ckan-container> --format '{{json .State.Health}}'`. Untuk 502, periksa status `ckan`, `nginx`, `nextjs`, `edge-tunnel`, dan `cloudflared`. Jangan menghapus volume untuk mengatasi kegagalan aplikasi.

## DataStore, resource, dan GeoView

- Plugin view CKAN 2.12 yang digunakan: `datatables_view`, `geo_view`, `geojson_view`, `wmts_view`, `shp_view`, `image_view`, dan `text_view`. Jangan mengaktifkan plugin Recline atau nama plugin shapefile lama.
- Bootstrap menyiapkan hak akses DataStore dan worker XLoader/Harvest sesuai konfigurasi. Pemrosesan ulang resource lama dan sinkronisasi pratinjau mengikuti [panduan DataStore](PANDUAN-PORTAL.md#datastore-dan-akses).
- Basemap, batas ukuran GeoJSON, dan ResourceView dikelola konfigurasi aplikasi; periksa resource yang aktif serta view CKAN saat pratinjau kosong.
- `ckan.site_url` tetap menunjuk `PUBLIC_HOST` agar URL media publik dan ResourceView lama tetap konsisten. Karena hostname publik dilayani Next.js, Caddy meneruskan endpoint CKAN `/api/i18n/*`, `resource_proxy`, aset umum, dan `/js/vendor/leaflet/*` ke CKAN. Jalur Leaflet diperlukan untuk `marker-icon.png` pada GeoJSON. CORS hanya mengizinkan origin `https://CKAN_HOST`; jangan menggantinya dengan wildcard atau membuka seluruh `/api/*`.

### Diagnostik GeoJSON dan Map Viewer

Jika konsol browser menampilkan `https://PUBLIC_HOST/api/i18n/id` atau `https://PUBLIC_HOST/js/vendor/leaflet/images/marker-icon.png` sebagai 404, atau pesan CORS dari `https://CKAN_HOST`, periksa konfigurasi Caddy yang sedang aktif. Endpoint dan aset tersebut harus diarahkan ke CKAN, bukan jatuh ke Next.js. Setelah memperbarui Caddyfile, buat ulang hanya service ingress:

```bash
# Cloudflare Tunnel
bash ./deploy/ckan/compose.sh cloudflare up -d --force-recreate edge-tunnel

# Cloudflare Tunnel + Access (jika profil ini yang aktif)
bash ./deploy/ckan/compose.sh cloudflare-access up -d --force-recreate edge-tunnel

# Ingress manual
bash ./deploy/ckan/compose.sh manual up -d --force-recreate caddy
```

Gunakan profil yang sama dengan deployment aktif. Uji endpoint terjemahan dari origin admin:

```bash
curl -i \
  -H 'Origin: https://ckan.example.go.id' \
  'https://data.example.go.id/api/i18n/id'

curl -i -X OPTIONS \
  -H 'Origin: https://ckan.example.go.id' \
  -H 'Access-Control-Request-Method: GET' \
  -H 'Access-Control-Request-Headers: x-requested-with' \
  'https://data.example.go.id/api/i18n/id'
```

Respons GET seharusnya bukan 404 Next.js dan harus memiliki `Access-Control-Allow-Origin: https://ckan.example.go.id`. Respons preflight seharusnya `204` dengan origin yang sama. Setelah itu, periksa tab Network pada Alat Developer browser: `/api/3/action/resource_proxy`, `/webassets/*`, ubin peta OpenStreetMap, dan permintaan berkas GeoJSON juga harus berhasil. Jika i18n sudah 200 tetapi peta tetap kosong, kegagalannya berada pada permintaan sumber data atau penampil peta berikutnya—catat URL, status, dan responsnya sebelum mengubah konfigurasi CORS lagi.

## CMS dan unduhan dataset privat

Pages dan Blog mendukung Markdown dan media editorial. Pengunggahan media harus memakai endpoint bertanda akses; jangan membuka FileStore internal. Dataset privat tetap diotorisasi oleh sesi CKAN per pengguna. Host publik/admin yang tidak berbagi domain induk yang sama (eTLD+1) tidak dapat berbagi cookie browser. Lihat [panduan konten dan CMS](PANDUAN-PORTAL.md#administrasi-ckan-cms-dan-identitas-portal), [panduan admin CKAN](PANDUAN-PORTAL.md#administrasi-ckan-cms-dan-identitas-portal), dan [panduan akses dataset privat](PANDUAN-PORTAL.md#datastore-dan-akses).

## Keamanan operasional

- Jangan memasukkan `.env.ckan`, token Tunnel, API key, atau cookie sesi ke Git/log.
- CKAN tetap satu-satunya otoritas hak akses. Jangan memakai API key sysadmin di browser.
- Cadangkan PostgreSQL, FileStore, dan Solr sebelum perubahan skema/versi.
- Hindari `docker compose down -v` dan perintah penghapusan volume pada produksi.
- Jalankan `bash scripts/check-static.sh`, `npm run lint`, pengujian unit dan uji integrasi CKAN dan browser sebelum rilis.

---

# Sambutan di beranda

Konten sambutan dan profil pimpinan diatur dari `.env.ckan`, lalu diteruskan oleh `deploy/ckan/sync-env.py` ke build portal.

```dotenv
PORTAL_WELCOME_MESSAGE=Selamat datang. Data terbuka membantu kita memahami daerah dan menyusun kebijakan dengan lebih baik.
PORTAL_REGENT_NAME=Nama Bupati
PORTAL_REGENT_PHOTO=/images/bupati.jpg
PORTAL_DEPUTY_REGENT_NAME=Nama Wakil Bupati
PORTAL_DEPUTY_REGENT_PHOTO=/images/wakil-bupati.jpg
```

Simpan foto di `public/images/` dan gunakan path publik yang diawali `/`. Nama dan foto bisa diisi terpisah. Beranda menampilkan foto yang sudah dikonfigurasi dan pesan sambutan jika isi profil atau pesannya tersedia. Perubahan `.env.ckan` perlu disinkronkan dan image Next.js dibangun ulang agar nilainya masuk ke bundle publik.
