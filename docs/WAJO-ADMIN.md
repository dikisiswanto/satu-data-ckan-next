# Wajo Admin — panduan tema administrasi CKAN

## Tujuan

Wajo Admin adalah lapisan antarmuka administrasi untuk CKAN 2.12.1 yang selaras dengan identitas Portal Satu Data Kabupaten Wajo. CKAN tetap mengelola data, autentikasi, otorisasi, validasi, CSRF, upload, DataStore, dan workflow extension. Next.js tetap menjadi satu-satunya antarmuka katalog publik.

Tema ini tidak membuat backend CRUD paralel dan tidak mengganti endpoint CKAN. Shell dan styling dibuat custom; halaman pengelolaan dataset, resource, organisasi, grup, pengguna, Pages, Harvest, DataStore, Scheming, dan GeoView tetap memakai route serta workflow native masing-masing.

## Komposisi antarmuka

### Application shell

- **Topbar:** logo, nama Wajo Admin, identitas portal, tautan portal publik, profil pengguna, akses pengaturan sistem untuk sysadmin, dan logout dengan CSRF.
- **Sidebar:** menu dikelompokkan menjadi Utama, Publikasi & Konten, Akun Saya, dan Sistem.
- **Workspace:** area CKAN asli yang dibungkus dengan shell Wajo; breadcrumb, flash message, form, toolbar, tabel, tab, dan isi halaman tetap dirender oleh template upstream.
- **Responsive:** sidebar menjadi collapse di bawah breakpoint desktop; workspace dan tabel menggunakan aturan responsif.

### Ringkasan Wajo Admin

Route: `/wajo-admin/`.

Ringkasan menampilkan:

- Jumlah dataset yang dapat diakses oleh pengguna saat ini (`package_search`).
- Jumlah organisasi yang dapat dilihat (`organization_list`).
- Jumlah grup/kategori yang dapat dilihat (`group_list`).
- Jumlah dataset yang dibuat pengguna (`package_search` dengan filter `creator_user_id`).
- Enam dataset yang terakhir diperbarui.
- Akses cepat tambah dataset/organisasi hanya ketika `package_create`/`organization_create` diizinkan.
- Tautan menuju CMS Pages dan Harvest.

Setiap Action API dijalankan menggunakan context identitas pengguna yang sedang login. Kegagalan action dicatat ke log dan hanya membuat metrik terkait menjadi `—`; dashboard masih dapat dirender. Nilai metrik tidak di-hardcode.

## Peta file

| File                                                                       | Kegunaan                                             |
| -------------------------------------------------------------------------- | ---------------------------------------------------- |
| `deploy/ckan/theme/ckanext/wajo_theme/templates/header.html`               | Header/topbar aplikasi                               |
| `deploy/ckan/theme/ckanext/wajo_theme/templates/page.html`                 | Wrapper shell untuk seluruh halaman admin yang login |
| `deploy/ckan/theme/ckanext/wajo_theme/templates/wajo_theme/sidebar.html`   | Navigasi dan active state                            |
| `deploy/ckan/theme/ckanext/wajo_theme/templates/wajo_theme/dashboard.html` | Tampilan Ringkasan                                   |
| `deploy/ckan/theme/ckanext/wajo_theme/assets/css/wajo-theme.css`           | Design system dan styling lintas modul               |
| `deploy/ckan/theme/ckanext/wajo_theme/plugin.py`                           | Middleware, blueprint ringkasan, schema Pages        |
| `deploy/ckan/theme/setup.py`                                               | Metadata package dan daftar package-data             |

## Routing dan autentikasi

- `CKAN__AUTH__ROUTE_AFTER_LOGIN=wajo_admin.index` mengarahkan login sukses ke Ringkasan.
- Blueprint `wajo_admin` memakai `url_prefix="/wajo-admin"`; route `/` di dalam blueprint menjadi `/wajo-admin/`. Jangan menghapus prefix ini: tanpa prefix, middleware yang mengarahkan `/` ke ringkasan akan membuat redirect loop.
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

CKAN memakai locale `id` sebagai default, `en` tetap tersedia sebagai pilihan. Lokalisasi dipelihara dalam tiga domain: `ckan` (core dan shell), `ckanext-harvest`, serta `ckanext-pages`. Katalog core digabung dengan katalog upstream agar terjemahan bawaan yang sudah ada tidak hilang; dua domain extension didaftarkan melalui `ITranslation` dan dikompilasi saat Docker build. Cakupan string, placeholder, file `.mo`, serta merge upstream diuji oleh `scripts/check-id-translations.py`.

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
2. Akses `/dataset`, `/organization`, `/pages`, `/harvest`, dan `/wajo-admin/` tanpa login: harus menuju login.
3. Login berhasil: harus tetap pada hostname CKAN dan masuk `/wajo-admin/`, bukan katalog publik.
4. Cek metrik Ringkasan terhadap CKAN Action API, lalu buka satu dataset dari tabel dataset terbaru.
5. Uji pencarian, detail, tambah/edit dataset, resource upload, preview DataStore dan GeoView.
6. Uji organisasi, grup, anggota, pengguna, pengaturan, Pages, dan Harvest sesuai permission role.
7. Uji logout, session expiry, login gagal, dan `came_from`.
8. Uji lebar layar desktop, tablet, dan mobile serta keyboard navigation.

Belum ada klaim hasil visual browser pada server produksi sampai rangkaian acceptance test tersebut benar-benar dilakukan.
