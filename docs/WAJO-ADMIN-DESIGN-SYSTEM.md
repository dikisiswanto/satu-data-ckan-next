# Design System — Portal Satu Data Kabupaten Wajo (Admin)

## Tujuan dan prinsip

Wajo Admin menggunakan bahasa visual yang sama dengan portal publik, dengan kepadatan yang sedikit lebih tinggi karena pekerjaan administrasi melibatkan tabel, metadata, dan formulir. Desain harus terasa modern, bersih, tenang, mudah dipindai, dan tidak mengubah alur CKAN.

Prinsip implementasi:

- **Satu sumber token:** nilai visual kanonis berada di `deploy/ckan/theme/ckanext/wajo_theme/assets/css/wajo-admin-design-system.css`.
- **Paritas publik/admin:** warna utama, canvas, permukaan, teks, border, radius, dan font stack mengikuti `src/app/styles/foundation.css`.
- **Native-first:** route, struktur form, `name`, `id`, action, method, CSRF, validasi, permission, upload, widget, dan JavaScript CKAN tetap native.
- **Additive styling:** design layer dimuat setelah `wajo-theme.css` melalui WebAssets; tidak memodifikasi CKAN core.
- **Use-case typography:** ukuran judul, body, label, tabel, metadata, kode, dan angka disesuaikan dengan fungsi masing-masing, bukan dipaksa seragam.
- **Responsive and accessible:** navigasi, form, tabel, dashboard, DataStore wizard, footer, dan login mendukung tablet/mobile; focus-visible dan reduced motion dipertahankan.

## 1. Tema warna

| Token                         | Nilai     | Fungsi                             |
| ----------------------------- | --------- | ---------------------------------- |
| `--wajo-color-primary`        | `#1d5fa7` | Aksi utama, link, navigasi aktif   |
| `--wajo-color-primary-hover`  | `#174f8c` | Hover/focus lanjutan               |
| `--wajo-color-primary-active` | `#123f70` | State ditekan                      |
| `--wajo-color-primary-soft`   | `#eaf2ff` | Highlight lembut dan item aktif    |
| `--wajo-color-primary-tint`   | `#f4f8ff` | Hover permukaan sekunder           |
| `--wajo-color-ink`            | `#1b3440` | Teks utama                         |
| `--wajo-color-muted`          | `#586d76` | Deskripsi dan helper               |
| `--wajo-color-subtle`         | `#7b8b94` | Metadata dan label sekunder        |
| `--wajo-color-canvas`         | `#f5f7f6` | Latar aplikasi, sama dengan publik |
| `--wajo-color-surface`        | `#ffffff` | Kartu, panel, form, tabel          |
| `--wajo-color-border`         | `#d8e2e4` | Border standar, sama dengan publik |
| `--wajo-color-border-strong`  | `#c5d3d9` | Border kontrol dan pemisah penting |
| `--wajo-color-success`        | `#28784f` | Sukses                             |
| `--wajo-color-warning`        | `#95651d` | Peringatan                         |
| `--wajo-color-danger`         | `#b33d46` | Error dan aksi destruktif          |
| `--wajo-color-info`           | `#286b99` | Informasi                          |

Warna status hanya digunakan secara semantik. Status juga harus memiliki teks atau ikon; warna bukan satu-satunya pembeda.

## 2. Font dan tipografi

Font utama adalah **Inter** dari Google Fonts, mengikuti portal publik Next.js. Template CKAN memuat preconnect ke `fonts.googleapis.com` dan `fonts.gstatic.com`, lalu memuat bobot variabel 400–900. CSS tetap memakai fallback `ui-sans-serif → system-ui → Segoe UI → Roboto → Arial` ketika Google Fonts tidak dapat dijangkau.

| Peran               |                     Ukuran |   Bobot | Penggunaan                                                   |
| ------------------- | -------------------------: | ------: | ------------------------------------------------------------ |
| Judul halaman admin | `clamp(28px, 2.2vw, 32px)` |     700 | Konteks halaman dan tujuan kerja                             |
| Heading section     |                     `20px` |     680 | Kelompok tugas/konten                                        |
| Heading card/module |                     `17px` | 650–680 | Judul panel dan kelompok data                                |
| Body admin          |                     `15px` |     400 | Deskripsi dan konten umum                                    |
| Navigasi sidebar    |                     `14px` | 550–650 | Label menu dan state aktif                                   |
| Label formulir      |                   `13.4px` |     620 | Nama field                                                   |
| Helper text         |                     `12px` | 400–550 | Instruksi tambahan; bukan satu-satunya tempat aturan penting |
| Isi tabel           |                     `14px` | 400–550 | Nilai data yang dipindai                                     |
| Header tabel        |                     `12px` |     650 | Nama kolom dan metadata ringkas                              |
| Angka metrik        |                     `28px` |     720 | Statistik dengan tabular numerals                            |
| Kode/command        |                  monospace | 400–500 | URL, ID, token, perintah terminal                            |
| Judul login         |                     `26px` |     720 | Identitas tugas autentikasi                                  |
| Input login         |                     `16px` |     400 | Input yang mudah dibaca dan diisi                            |

Heading menggunakan line-height rapat dan `letter-spacing` sedikit negatif; body memakai line-height 1.6; catatan/helper memakai 1.5–1.55. Isi tabel tetap kompak tetapi tidak diperkecil berlebihan.

## 3. Grid, lebar konten, dan spacing

| Area                                    |                 Lebar maksimum | Alasan                                                      |
| --------------------------------------- | -----------------------------: | ----------------------------------------------------------- |
| Application shell                       |                       `1800px` | Menampung sidebar dan workspace pada monitor lebar          |
| Sidebar desktop                         |                        `264px` | Label navigasi panjang tetap terbaca                        |
| Sidebar layar menengah                  |                        `248px` | Memberi ruang pada konten utama                             |
| Workspace admin                         |                       `1480px` | Cukup untuk tabel dan toolbar tanpa baris terlalu panjang   |
| Workspace pada viewport di bawah 1200px |                       `1280px` | Menyesuaikan ruang efektif                                  |
| Dashboard                               | `1480px` (mengikuti workspace) | Dashboard memakai lebar yang sama dengan halaman admin lain |
| Form panjang                            |                        `960px` | Menghindari field dan label terlalu melebar                 |
| Login card                              |                        `448px` | Fokus pada satu tugas autentikasi                           |

Gutter halaman memakai `clamp(1rem, 2.1vw, 2rem)`. Spacing mengikuti ritme 4px (`4, 8, 12, 16, 20, 24, 32px`). Tabel lebar harus memakai `.table-responsive`, bukan memperlebar viewport.

Breakpoints:

- Di bawah `1200px`: sidebar 248px dan content max 1280px.
- Di bawah `992px`: sidebar berubah menjadi navigasi collapse dan workspace satu kolom.
- Di bawah `768px`: semua panel menjadi satu kolom, form actions mengalir, kontrol utama minimal 44px, dan footer ditumpuk.
- Di bawah `480px`: brand dan toolbar diringkas tanpa membuat tombol ikon lebih kecil dari 40px.

## 4. Bentuk dan elevation komponen

| Komponen                | Standar                                                 |
| ----------------------- | ------------------------------------------------------- |
| Control radius          | `10px` (`.625rem`), sama dengan publik                  |
| Card radius             | `12px` (`.75rem`)                                       |
| Dialog radius           | `16px` (`1rem`)                                         |
| Button desktop          | tinggi minimum `40px`, padding horizontal 14–16px       |
| Input admin desktop     | tinggi minimum `42px`                                   |
| Input dan tombol login  | tinggi minimum `46px`                                   |
| Target interaksi mobile | minimal `44px` untuk tombol dan navigasi utama          |
| Navigasi sidebar        | tinggi minimum `40px`; 44px di mobile                   |
| Table cell              | padding vertikal 12px dan horizontal 14px               |
| Card/module             | border 1px, shadow subtle, tanpa shadow dekoratif besar |
| Modal/dropdown          | border netral, radius card, shadow medium               |
| Focus ring              | 3px dengan primary transparan dan offset                |

Primary button dipakai untuk satu aksi utama dalam satu area. Secondary untuk aksi pendamping, ghost/link untuk aksi ringan, dan danger hanya untuk tindakan destruktif. Komponen interaktif memakai state hover, focus, disabled, loading, dan invalid yang dapat dibedakan.

## 4A. Bahasa visual kontrol formulir

Kontrol dibedakan berdasarkan tugasnya, bukan hanya diseragamkan menjadi kotak putih:

| Jenis kontrol                            | Ciri visual/interaksi                                               | Penggunaan                              |
| ---------------------------------------- | ------------------------------------------------------------------- | --------------------------------------- |
| Input teks/email/URL/angka               | Permukaan putih, kursor teks, border netral dan focus ring biru     | Mengetik nilai satu baris               |
| Select satu pilihan                      | Latar biru sangat muda, chevron di kanan, kursor pointer            | Memilih satu nilai dari opsi            |
| Select banyak pilihan / Select2 / Chosen | Permukaan pilihan, chip/daftar, dropdown berbayang lembut           | Tag, anggota, dan pilihan jamak         |
| Textarea/Markdown                        | Area lebih tinggi, resize vertikal, preview/editor terpisah         | Deskripsi dan konten panjang            |
| Tanggal/waktu                            | Kontrol native dengan tinggi konsisten dan color-scheme terang      | Periode dan tanggal rilis               |
| Checkbox/radio                           | Accent color primary dan label satu baris yang dapat diklik         | Boolean atau pilihan eksklusif          |
| Upload berkas                            | Panel dashed dengan latar biru lembut dan tombol file selector      | Resource dataset, dokumen, gambar, logo |
| Upload gambar                            | Panel upload + pratinjau thumbnail, nama file, ukuran, batas format | Logo, sampul, gambar editorial          |

Jangan menyamarkan select sebagai input teks biasa. Jangan menampilkan upload sebagai tautan teks tanpa affordance file. Input file internal yang tersembunyi untuk tombol editor tidak boleh tampil sebagai kontrol kedua. Semua field error harus mempertahankan label normal, border invalid yang jelas, dan pesan dengan teks gelap di atas latar error lembut.

## 4B. Form berbasis konteks

- `portal_type` mengendalikan kelompok metadata yang relevan dan status helper panel.
- `portal_resource_role` mengendalikan metadata resource serta rekomendasi format/ekstensi file.
- Schema organisasi dan Group/kategori tematik terpisah; Group tidak mempunyai selector tipe konten dataset.
- Link quick-create membawa query `portal_type` supaya form langsung terpilih. Tag penemuan statistik/infografik/publikasi harus identik dengan tag yang dipakai modul query frontend publik.
- Field yang disembunyikan tidak dihapus dari record; perubahan tipe tidak boleh menjadi operasi penghapusan metadata.

## 5. Penerapan pada halaman

- **Dasbor:** mengikuti lebar workspace hingga 1480px; angka metrik besar, judul ringkas, panel aktivitas dan quick actions memiliki pola sama.
- **Daftar dataset/organisasi/resource:** toolbar pencarian dan filter berada sebelum tabel; header tabel muted; pagination konsisten; tabel tidak memaksa horizontal overflow halaman.
- **Form dataset dan CMS:** form panjang max-width 960px; label jelas; helper di dekat field; validasi/error dekat kontrol terkait; action utama di akhir form.
- **Pages, Blog, Publikasi, Indikator, Infografik:** memakai shell, heading, card, form controls, alert, dan table yang sama sambil mempertahankan schema/extension native.
- **DataStore wizard:** checklist, status, progress, command panel, dan CTA memakai ukuran komponen yang sama dengan halaman admin lain.
- **Login:** tidak memakai sidebar/topbar; card terpusat max-width 448px; logo dan judul brand; input 46px dan font 16px; pesan error tetap menggunakan validasi CKAN.

## 6. Ikon

Sidebar/topbar memakai satu macro `wajo_icon` dan paket Font Awesome Free bawaan CKAN 2.12.1. Macro memetakan nama semantik ke glyph modern (`building`, `image`, `file-lines`, `newspaper`, `folder`, `chart-line`, dan seterusnya) serta memakai kelas `fa-solid`; hindari alias lama seperti `building-o`, `file-text-o`, `picture-o`, dan `newspaper-o`.

## 7. Batas perubahan

Design system tidak boleh mengganti route/action CKAN, struktur input, CSRF, validator, permission, upload, widget JavaScript, atau alur CRUD. Semua perubahan tampilan harus diuji pada login, dashboard, dataset, resource, organisasi, Pages, Harvest, DataStore, dan konfigurasi sistem.
