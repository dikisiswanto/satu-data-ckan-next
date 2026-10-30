# Wajo Admin — panduan tema administrasi CKAN

## Tujuan

Wajo Admin adalah lapisan antarmuka administrasi untuk CKAN 2.12.1 yang selaras dengan identitas Portal Satu Data Kabupaten Wajo. CKAN tetap mengelola data, autentikasi, otorisasi, validasi, CSRF, upload, DataStore, dan workflow extension. Next.js tetap menjadi satu-satunya antarmuka katalog publik.

Tema ini tidak membuat backend CRUD paralel dan tidak mengganti endpoint CKAN. Shell dan styling dibuat custom; halaman pengelolaan dataset, resource, organisasi, grup, pengguna, Pages, Harvest, DataStore, Scheming, dan GeoView tetap memakai route serta workflow native masing-masing.

## Komposisi antarmuka

### Application shell

- **Topbar:** logo Kabupaten Wajo, judul resmi “Portal Satu Data Kabupaten Wajo”, tautan portal publik, profil pengguna, akses pengaturan sistem untuk sysadmin, serta logout dengan CSRF.
- **Footer:** memakai logo, nama portal, keterangan layanan, dan versi CKAN yang konsisten dengan topbar.
- **Sidebar:** menu dikelompokkan menjadi Ringkasan, Katalog Data, Publikasi Data, Halaman & Informasi, Integrasi Data, Akun Saya, dan Pengaturan Sistem. Item menu mengikuti permission CKAN.
- **Ikon:** seluruh ikon shell memakai font Font Awesome yang sudah dibundel oleh CKAN 2.12.1 (`fa fa-*`), bukan SVG buatan tangan atau file ikon eksternal. Nama ikon dipetakan pada satu macro agar bentuk, ukuran, baseline, dan warna konsisten.
- **Workspace:** area CKAN asli yang dibungkus dengan shell Wajo; breadcrumb, flash message, form, toolbar, tabel, tab, dan isi halaman tetap dirender oleh template upstream.
- **Responsive:** sidebar menjadi collapse di bawah breakpoint desktop; workspace dan tabel menggunakan aturan responsif.

### Ringkasan Wajo Admin

Route: `/admin/`.

Ringkasan menampilkan:

- Jumlah dataset yang dapat diakses oleh pengguna saat ini (`package_search`).
- Jumlah organisasi yang dapat dilihat (`organization_list`).
- Jumlah grup/kategori yang dapat dilihat (`group_list`).
- Jumlah dataset yang dibuat pengguna (`package_search` dengan filter `creator_user_id`).
- Enam dataset yang terakhir diperbarui.
- Akses cepat tambah dataset/organisasi hanya ketika `package_create`/`organization_create` diizinkan.
- Akses cepat menuju CMS Pages/Blog, publikasi/laporan, indikator/statistik, infografik, dan Harvest.

## Peta menu dan alur pekerjaan admin

| Menu sidebar          | Fungsi                                                          | Alur utama                                                                                                                  |
| --------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Semua dataset         | Mengelola katalog data                                          | Cari/filter → buka detail → tambah/perbarui metadata → kelola resource → cek pratinjau/API                                  |
| Organisasi            | Mengelola perangkat daerah pemilik data                         | Buat/perbarui organisasi → kelola anggota dan peran → hubungkan dataset                                                     |
| Kategori data         | Mengelola kelompok topik                                        | Buat kategori → isi deskripsi → hubungkan dataset yang relevan                                                              |
| Publikasi & laporan   | Dataset bertag `portal-publikasi`                               | Tambah dataset → pilih tipe Publikasi/Laporan → isi penerbit, periode, lisensi → unggah PDF/data → terbitkan                |
| Indikator & statistik | Dataset bertag `portal-indikator`                               | Tambah dataset → pilih tipe Indikator → isi definisi, satuan, metodologi, wilayah, periode, frekuensi → unggah data tabular |
| Infografik            | Dataset bertag `portal-infografik`                              | Tambah dataset → pilih tipe Infografik → unggah gambar utama → cantumkan dataset sumber dan periode                         |
| Halaman portal        | CMS Pages untuk profil, kebijakan, panduan, dan informasi tetap | Buat halaman → susun konten → periksa slug/SEO/gambar → atur visibilitas dan tanggal terbit → periksa portal publik         |
| Berita & blog         | CMS Blog untuk berita, pengumuman, dan artikel berkala          | Tulis artikel → lengkapi ringkasan/gambar/kategori/tanggal → periksa tampilan mobile → terbitkan                            |
| Pengambilan data      | CKAN Harvest                                                    | Buat sumber → pilih harvester → atur jadwal/organisasi → jalankan pekerjaan → periksa laporan dan dataset hasil             |
| DataStore & pratinjau | Wizard operasional untuk sysadmin                               | Periksa konfigurasi → izin PostgreSQL → worker XLoader → antrekan data lama → verifikasi detail dataset dan API             |

Halaman admin CKAN menampilkan panel **Panduan halaman ini**. Panel menjelaskan tujuan halaman, metadata yang harus dilengkapi, risiko umum, dan tautan aksi berikutnya. Publikasi/indikator/infografik adalah klasifikasi dataset menggunakan tag portal; bukan modul CRUD paralel yang memecah sumber data CKAN.

### Pengelolaan halaman dan berita

Pages dan Blog memakai route serta form native `ckanext-pages`. Menu mengarahkan ke `/pages` dan `/blog`; tombol tindakan di panel panduan menuju form tambah yang disediakan extension. Gunakan Pages untuk konten relatif tetap dan Blog untuk artikel berkala. Pastikan visibilitas serta tanggal publikasi sudah sesuai sebelum konten dianggap tampil di portal.

### Alur DataStore dari UI

Buka **Integrasi Data → DataStore & pratinjau** (`/admin/data-preview`). Halaman memeriksa plugin, URL baca/tulis, token/action XLoader, dan konfigurasi antrean. Dari halaman tersebut admin dapat:

1. Menekan **Periksa ulang** untuk menjalankan pemeriksaan konfigurasi terbaru.
2. Menyalin perintah penerapan izin DataStore dari kartu langkah kedua, menjalankannya pada terminal server, lalu kembali ke halaman dan periksa ulang.
3. Menyalin perintah pemeriksaan container/log worker pada kartu langkah ketiga; pastikan `xloader-worker` berjalan/healthy.
4. Menekan **Antrekan hingga 25 resource** untuk mengirim resource tabular lama ke XLoader. Aksi ini hanya tersedia untuk sysadmin dan hanya memilih resource publik yang formatnya didukung.
5. Membuka tautan dataset dari daftar resource siap/menunggu untuk memeriksa hasilnya. Setelah proses selesai, detail dataset menampilkan pratinjau DataStore dan endpoint API.

Worker adalah proses server, sehingga status containernya tidak dijalankan dari browser. UI menyediakan tombol salin perintah yang aman; tidak mengeksekusi shell server secara langsung. Backfill menyeluruh tetap dijalankan dari prosedur deployment bila katalog lebih besar dari batas pemindaian UI.

Setiap Action API dijalankan menggunakan context identitas pengguna yang sedang login. Kegagalan action dicatat ke log dan hanya membuat metrik terkait menjadi `—`; dashboard masih dapat dirender. Nilai metrik tidak di-hardcode.

## Peta file

| File                                                                           | Kegunaan                                                                       |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `deploy/ckan/theme/ckanext/wajo_theme/templates/header.html`                   | Header/topbar aplikasi                                                         |
| `deploy/ckan/theme/ckanext/wajo_theme/templates/page.html`                     | Wrapper shell untuk seluruh halaman admin yang login                           |
| `deploy/ckan/theme/ckanext/wajo_theme/templates/wajo_theme/sidebar.html`       | Navigasi dan active state                                                      |
| `deploy/ckan/theme/ckanext/wajo_theme/templates/wajo_theme/dashboard.html`     | Tampilan Ringkasan                                                             |
| `deploy/ckan/theme/ckanext/wajo_theme/assets/css/wajo-theme.css`               | Compatibility styling dan aturan komponen CKAN                                 |
| `deploy/ckan/theme/ckanext/wajo_theme/assets/css/wajo-admin-design-system.css` | Token dan komponen visual kanonis Wajo Admin                                   |
| `docs/WAJO-ADMIN-DESIGN-SYSTEM.md`                                             | Spesifikasi warna, tipografi, lebar konten, spacing, radius, dan pola komponen |
| `deploy/ckan/theme/ckanext/wajo_theme/plugin.py`                               | Middleware, blueprint ringkasan, schema Pages                                  |
| `deploy/ckan/theme/setup.py`                                                   | Metadata package dan daftar package-data                                       |

## Routing dan autentikasi

- `CKAN__AUTH__ROUTE_AFTER_LOGIN=wajo_admin.index` mengarahkan login sukses ke Ringkasan.
- Blueprint `wajo_admin` memakai `url_prefix="/admin"`; route `/` di dalam blueprint menjadi `/admin/`. Jangan menghapus prefix ini: tanpa prefix, middleware yang mengarahkan `/` ke ringkasan akan membuat redirect loop.
- Root `CKAN_HOST` mengarahkan pengguna anonim ke login dan pengguna yang sudah login ke Ringkasan.
- Halaman lain dan seluruh route extension tetap diteruskan ke CKAN. Middleware meminta login untuk seluruh route pada hostname admin; Action API tanpa sesi mendapat JSON `401`.
- Aset static untuk halaman login dikecualikan dari login guard. File logo Wajo berada di `/logo-kabupaten-wajo.webp`.
- Guard aktif hanya saat request datang ke `CKANEXT__WAJO_THEME__ADMIN_HOST`. Host internal CKAN dan host publik tidak ikut dikunci.
- Login hanya mengautentikasi pengguna. Otorisasi CRUD masih menggunakan permission CKAN berdasarkan role dan keanggotaan.

## Prinsip UI/UX dan konsistensi desain

Wajo Admin menggunakan pola admin-template yang sederhana dan familiar, bukan dashboard visual yang terlalu dekoratif. Prinsip utamanya:

- **Prioritas konten:** ruang kerja, tabel, filter, dan form mendapat perhatian utama; dekorasi, ilustrasi, dan animasi tidak mendominasi.
- **Hierarki konsisten:** satu judul halaman, deskripsi seperlunya, breadcrumb, toolbar tindakan, lalu konten. Hindari kartu di dalam kartu tanpa alasan fungsional.
- **Sistem visual bersama:** warna netral untuk permukaan dan teks, satu warna aksen untuk tindakan utama, status memakai warna semantik, serta token konsisten untuk radius, border, shadow, spacing, dan tipografi.
- **Komponen native dipertahankan:** tombol, form, tabel, modal, tab, alert, dropdown, pagination, flash message, dan validasi CKAN diberi lapisan styling; perilaku serta markup penting upstream tidak diganti tanpa kebutuhan.
- **Tabel dan formulir efisien:** filter berdekatan dengan tabel, label selalu jelas, status mudah dipindai, aksi berbahaya dibedakan, dan tabel dapat scroll horizontal di layar sempit.
- **Aksesibilitas:** fokus keyboard terlihat, kontras cukup, ukuran target interaksi wajar, state tidak hanya dibedakan dengan warna, dan animasi mengikuti `prefers-reduced-motion`.
- **Responsif:** sidebar dapat diciutkan; pada mobile navigasi tetap dapat dijangkau dan tabel tidak memaksa seluruh halaman melebar.
- **Tidak mengubah workflow:** penambahan halaman khusus hanya untuk ringkasan/navigasi yang tidak menggantikan kemampuan CKAN. Flow CRUD tetap memakai form, action, permission, dan validasi upstream.

## Prinsip transisi portal publik

Transisi route/pergantian halaman tidak dianimasikan. Hero, judul, section wrapper, skeleton, dan kontainer utama tampil normal agar tidak menimbulkan kilatan/flicker atau konten yang terlambat terlihat. Reveal ringan hanya opt-in pada item daftar/kartu konten yang diberi atribut `data-public-list-item="true"`; animasi berjalan sekali saat item masuk viewport, tidak diulang saat render ulang, dan dinonaktifkan untuk `prefers-reduced-motion`.

## Perilaku yang tidak diubah

Tema tidak mengganti atau mem-bypass:

- CKAN route/action untuk dataset, resource, organisasi, grup, user, package revision, dan DataStore.
- Validasi NAVL/Scheming, upload file, token CSRF, dan flash/error messages.
- Permission CKAN seperti `package_create`, `package_update`, `organization_update`, `sysadmin`, dan akses per organisasi.
- Extension Pages, Harvest, GeoView, DCAT, dan XLoader.
- API facade publik Next.js.

Jangan membuat ulang form CRUD hanya untuk mengejar visual. Styling generik lebih mudah dirawat dan mengurangi risiko template tidak kompatibel ketika CKAN minor update.

## Bahasa

CKAN memakai locale `id` sebagai default, `en` tetap tersedia sebagai pilihan. Lokalisasi yang dipelihara di project mencakup empat domain: `ckan` (core dan shell), `ckanext-harvest`, `ckanext-pages`, dan `ckanext-dcat`. Katalog core digabung dengan katalog upstream agar terjemahan bawaan yang sudah ada tidak hilang; domain extension didaftarkan melalui `ITranslation` dan dikompilasi saat Docker build. Cakupan string, placeholder, file `.mo`, serta merge upstream diuji oleh `scripts/check-id-translations.py`.

Katalog project menjamin semua entri yang dipelihara terisi, tetapi bukan klaim bahwa setiap string dari semua extension pihak ketiga sudah diterjemahkan. Teks hard-coded, domain extension lain, nama kolom schema, dan konten yang dimasukkan administrator perlu diaudit pada halaman runtime dan ditambahkan ke domain yang sesuai.

## Proses rebuild

Dari root repository:

```bash
bash ./deploy/ckan/bootstrap-upstream.sh
bash ./deploy/ckan/compose.sh cloudflare up -d --build --force-recreate ckan edge-tunnel
```

Untuk ingress Caddy manual, gunakan profil `manual` dan recreate service `ckan caddy`. Jangan menghapus volume database atau filestore untuk menerapkan theme.

## Validasi source

```bash
bash scripts/check-static.sh
python3 scripts/check-auth-middleware.py
```

Static suite memeriksa sintaks/template, CSS contract, route/authentication, dashboard Action API, konfigurasi, serta benar-benar membangun wheel Wajo Theme dan memeriksa file di dalamnya.

## Browser acceptance sebelum produksi

Lakukan uji pada instance CKAN yang benar-benar berjalan menggunakan sedikitnya akun sysadmin dan akun editor/organisasi:

1. Akses root CKAN tanpa login: harus menuju login.
2. Akses `/dataset`, `/organization`, `/pages`, `/harvest`, dan `/admin/` tanpa login: harus menuju login.
3. Login berhasil: harus tetap pada hostname CKAN dan masuk `/admin/`, bukan katalog publik.
4. Pastikan logo Kabupaten Wajo tampil pada topbar, login, dan footer; uji tombol navigasi collapse pada lebar tablet dan mobile.
5. Cek metrik Ringkasan terhadap CKAN Action API, lalu buka satu dataset dari tabel dataset terbaru.
6. Uji pencarian, detail, tambah/edit dataset, resource upload, preview DataStore dan GeoView.
7. Pada halaman detail dataset publik, pastikan panel Akses API menampilkan endpoint `package_show`, `resource_show`, serta `datastore_search` untuk resource tabular.
8. Untuk CSV/TSV yang belum selesai diindeks, pastikan preview fallback menampilkan status/isi terbatas tanpa mengakali permission dataset/resource. Untuk XLS/XLSX/ODS, pastikan worker XLoader mengisi DataStore sebelum preview penuh tersedia.
9. Uji organisasi, grup, anggota, pengguna, pengaturan, Pages, dan Harvest sesuai permission role.
10. Uji logout, session expiry, login gagal, dan `came_from`.
11. Uji lebar layar desktop, tablet, dan mobile serta keyboard navigation.

Belum ada klaim hasil visual browser pada server produksi sampai rangkaian acceptance test tersebut benar-benar dilakukan.
