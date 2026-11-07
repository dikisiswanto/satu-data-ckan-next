# Sistem Desain Portal

Dokumen ini adalah acuan visual bersama untuk frontend publik, login CKAN, dan Portal Admin. Implementasi token kanonis berada di `src/app/styles/foundation.css` dan `deploy/ckan/theme/ckanext/portal_theme/assets/css/portal-admin-design-system.css`. Jika nilai berubah, perbarui kedua sumber dan regression check terkait.

## Identitas visual

Portal memakai pendekatan **civic data atlas**: peta wilayah menjadi jangkar visual hero, dikelilingi ikon dan angka statistik aktual yang ditempatkan asimetris tanpa panel kartu. Bahasa visualnya editorial, terstruktur, berorientasi data dan wilayah, tetapi tetap ramah untuk masyarakat umum. Karakter yang dituju adalah **standout, modern, clean, dan estetis**—bukan dashboard SaaS generik atau halaman serba putih yang datar.

## Dial visual

- ENERGY: **2 / 3** — cukup kuat untuk punya karakter tanpa menjadi ramai.
- RHYTHM: **2 / 3** — variasikan komposisi antar-section; jangan mengulang pola grid yang sama.
- MOTION: **1 / 3** — interaksi singkat dan reveal seperlunya; tanpa animasi dekoratif terus-menerus.

- **Navy `#123650`:** identitas utama, hero, panel login, dan topbar admin.
- **Blue `#1D5FA7`:** aksi utama, tautan, navigasi aktif, dan fokus.
- **Teal `#23785F`:** wilayah, lingkungan, serta konektivitas data.
- **Ochre `#91621F`:** ekonomi, industri, dan regulasi.
- **Canvas `#F5F7F6`, putih, slate:** permukaan dan teks yang nyaman dibaca.
- Aksen tambahan seperti violet, rose, atau hijau boleh dipakai pada ilustrasi/kategori bila punya konteks. Hindari warna acak atau palet pelangi.

Font utama Inter dengan fallback sistem. Heading tegas dan rapat; isi mudah dibaca. Admin memakai skala lebih kompak daripada publik, tanpa mengecilkan kontrol atau teks penting.

## Bahasa visual per area

### Frontend publik

- Hero desktop memakai komposisi dua kolom, foto relevan, overlay kontras, headline kuat, pencarian yang mudah ditemukan, dan ilustrasi atlas editorial.
- Ilustrasi atlas boleh memakai pembagian area, legenda, dan marker. Tandai sebagai ilustrasi; jangan mengklaim batas atau sebaran resmi bila bukan data geografis tervalidasi.
- Angka metrik harus berasal dari data CKAN. Ilustrasi tidak boleh memuat angka, nama wilayah, atau klaim statistik fiktif.
- Kartu dataset menggunakan panel ilustrasi ringan; kategori memakai warna semantik; panel unggulan dapat memadukan permukaan biru muda dan navy.
- Variasikan ritme section. Jangan mengulang grid kartu untuk semua jenis konten.
- Halaman berita/CMS menempatkan isi editorial sebagai fokus; hindari kartu ber-border dan padding besar yang tidak diperlukan.

### Login

- Menjadi penghubung identitas publik dan admin: panel identitas navy dengan motif atlas halus, dipasangkan dengan form putih yang fokus.
- Form berada di tengah, lebar maksimum sekitar `448px`, input minimum `46px`, dan font input `16px`.
- Jangan menampilkan sidebar/topbar admin pada layar login.

### Portal Admin CKAN

- Gunakan topbar navy, sidebar netral, active state biru, serta aksen teal/ochre pada metrik sesuai konteks.
- Admin lebih padat dan fungsional: navigasi ringkas, metrik kompak, tabel dan form menjadi fokus, gutter lebih kecil, serta informasi mudah dipindai.
- Workspace maksimum `1480px`, form panjang `960px`, shell `1800px`, sidebar desktop `264px`.
- Pertahankan route, template inti, field, validator, CSRF, permission, upload, widget, dan JavaScript native CKAN. Styling harus additive dan ter-scope.

## Token dan komponen

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
| `--portal-color-muted`      | `#586D76` | Deskripsi/helper       |
| `--portal-color-border`     | `#D8E2E4` | Border netral          |

Ukuran dasar admin: body `0.9375rem`, kontrol `42px`, tombol `40px`, target sentuh `44px`, radius kontrol `10px`, card `12px`, dialog `16px`. Gutter halaman memakai `clamp(1rem, 2.1vw, 2rem)` dan spacing mengikuti kelipatan 4px.

Breakpoint admin: di bawah `1200px` workspace dipersempit; di bawah `992px` sidebar menjadi navigasi collapse; di bawah `768px` panel ditumpuk dan kontrol utama tetap memiliki target sentuh `44px`; di bawah `480px` brand/toolbar diringkas tanpa mengecilkan tombol ikon di bawah `40px`. Tabel lebar memakai wrapper responsif.

Status menggunakan warna semantik—success `#28784F`, warning `#95651D`, danger `#B33D46`, info `#286B99`—dan selalu memiliki label atau ikon; warna bukan satu-satunya pembeda.

Kontrol form harus dibedakan menurut tugasnya: input teks, select, multi-select, textarea/editor, tanggal, checkbox/radio, serta upload masing-masing memiliki affordance yang jelas. Tampilkan label, helper, invalid state, pesan error, loading, dan disabled state secara konsisten.

## Ikon dan ilustrasi

- Pilih ikon berdasarkan makna fitur, bukan dekorasi. Ikon kategori memakai aksen warna semantik yang konsisten.
- CKAN Admin memakai macro `portal_icon` dan Font Awesome Free yang dibundel CKAN 2.12.1. Jangan mengandalkan nama alias ikon lama atau sumber ikon eksternal.
- Ilustrasi harus membantu pengguna mengenali data, wilayah, format, atau jenis publikasi. Hindari jaring node generik, kubus 3D, ornamen acak, serta grafik/angka fiktif.
- Gambar dekoratif memakai `aria-hidden="true"`; gambar informatif memiliki alt yang bermakna.

## Motion, aksesibilitas, dan performa

- Tidak memakai animasi route, rotasi 3D, atau gerakan dekoratif terus-menerus.
- Hover/focus singkat sekitar `140–220ms`; reveal publik hanya sekali dan opt-in pada item daftar/kartu yang relevan.
- Hormati `prefers-reduced-motion`; jangan menahan konten utama sampai animasi selesai.
- Jaga focus-visible, kontras, keyboard navigation, zoom, target sentuh minimal `44px`, LCP, dan CLS.

## Batas perubahan

Jangan mengganti alur CRUD atau kontrak CKAN demi tampilan. Periksa publik, login, dashboard, dataset/resource, organisasi, Pages/Blog, Harvest, DataStore, form panjang, dan layar mobile setiap kali mengubah token atau komponen bersama.
