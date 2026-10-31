# Pengembangan Wajo Admin dan integrasi frontend — 31 Oktober 2026

## Ringkasan

Pembaruan ini melanjutkan baseline Full Audit Fixes. Fokusnya adalah alur kerja pengelola, sinkronisasi metadata dengan frontend Next.js, pemisahan kontrol design system, dan navigasi publik yang lebih bersih. CKAN tetap menjadi sumber utama untuk dataset, resource, organisasi, kategori, permission, dan CMS.

## Dasbor dan navigasi admin

- Pintasan **Buat konten berdasarkan jenis** tersedia untuk Dataset umum, Indikator, Infografik, Publikasi, dan Data geospasial.
- Setiap pintasan membawa `portal_type` ke `/dataset/new`, sehingga form tidak selalu mulai dari Dataset umum.
- Pintasan Kategori tematik tetap mengarah ke `/group/new` (Group CKAN), dan tidak disamakan dengan tipe konten dataset.
- Sidebar menyediakan akses tambah dataset umum, indikator, infografik, publikasi, geospasial, dan kategori tematik sesuai permission.
- Label baru pada sidebar/dasbor memakai gettext dan diterjemahkan pada katalog Indonesia.
- Dashboard tetap memakai lebar workspace yang sama (hingga 1480px) dan panel quick-create dibedakan secara visual dari tautan navigasi biasa.

## Form dan design system

- Input teks, select, multi-select/Select2/Chosen, textarea, tanggal/waktu, checkbox/radio, dan file input memiliki gaya visual berbeda.
- File upload tampil sebagai kontrol berkas, bukan teks link biasa; upload gambar memiliki thumbnail preview dan validasi format/ukuran di browser.
- Panel konteks menjelaskan tipe konten aktif serta tag portal yang dikelola otomatis.
- Field dataset dan resource mengikuti `portal_type` / `portal_resource_role`; field yang tersembunyi tidak dibuang dari record.
- Resource baru mewarisi saran peran dari tipe dataset induk. Pengelola tetap boleh mengganti peran secara manual.

## Integrasi frontend

Frontend menemukan konten berdasarkan tag CKAN yang telah ditetapkan:

| `portal_type` | Tag CKAN             | Konsumen frontend                                                     |
| ------------- | -------------------- | --------------------------------------------------------------------- |
| `indikator`   | `portal-indikator`   | Statistik dan detail indikator                                        |
| `infografik`  | `portal-infografik`  | Katalog infografik                                                    |
| `publikasi`   | `portal-publikasi`   | Katalog publikasi                                                     |
| `dataset`     | Tidak ada tag khusus | Katalog dataset umum                                                  |
| `geospasial`  | Tidak ada tag khusus | Katalog dataset/detail dengan deteksi format dan pratinjau geospasial |

Perubahan pilihan tipe akan menambahkan/mengganti tag yang dikelola portal dan tetap mempertahankan tag lain milik pengguna. Geospasial belum diberi tag discovery khusus karena belum ada halaman listing khusus yang mengonsumsinya; tipe ini tetap memakai metadata dan format resource geospasial pada katalog umum.

## Kategori tematik bukan tipe dataset

CKAN `group` (kategori tematik) digunakan untuk mengelompokkan dataset berdasarkan tema/wilayah. CKAN `package` tetap bertipe internal `dataset`; `portal_type` hanya metadata tambahan pada package. Form Group diberi penjelasan dan tautan untuk membuat tipe konten yang tepat.

## Navigasi frontend publik

Komponen panduan halaman (`PublicContextGuide`) dihapus dari layout publik agar tidak ada banner/panduan di atas konten. Header, breadcrumb, target aksesibilitas `#konten-utama`, dan footer tetap dipertahankan. Panduan kontekstual hanya ada di Wajo Admin.

## File sumber utama

- `deploy/ckan/theme/ckanext/wajo_theme/templates/wajo_theme/dashboard.html`
- `deploy/ckan/theme/ckanext/wajo_theme/templates/wajo_theme/sidebar.html`
- `deploy/ckan/theme/ckanext/wajo_theme/templates/wajo_theme/context_help.html`
- `deploy/ckan/theme/ckanext/wajo_theme/public/wajo-admin-forms.js`
- `deploy/ckan/theme/ckanext/wajo_theme/assets/css/wajo-admin-design-system.css`
- `deploy/ckan/theme/ckanext/wajo_theme/schemas/dataset.yaml`
- `deploy/ckan/theme/ckanext/wajo_theme/schemas/group.yaml`
- `src/components/public-layout.jsx`
- `src/lib/data/public-indicators.js`
- `src/lib/data/public-infographics.js`
- `src/lib/data/public-publications.js`

## Validasi

`bash scripts/check-static.sh` berhasil pada source audit ini. Suite meliputi schema/form kondisional, sinkronisasi tag frontend, form Group terpisah, template CKAN, lokalisasi 1.133 pesan, media, Markdown, unduhan, auth/logout, packaging, CSS, navigasi, API, import, dan layout.

Belum dijalankan: Next.js production build, ESLint penuh, Vitest/Playwright di browser, Docker build runtime, dan acceptance test di VPS. Karena itu status ini adalah **static validation passed**, bukan konfirmasi deployment produksi.
