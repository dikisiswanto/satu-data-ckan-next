# Panduan UI/UX dan Design System

## Arah visual

Gunakan antarmuka administrasi yang modern, bersih, minimal, dan mudah dipindai. Acuannya adalah pola admin-template profesional: navigasi jelas, konten dominan, permukaan netral, border halus, dan aksen warna terbatas. Hindari gradient dekoratif, glass effect berlebihan, shadow berat, kartu bertumpuk, ikon tanpa label, dan animasi yang tidak menambah pemahaman.

## Hierarki halaman

1. Breadcrumb bila relevan.
2. Judul halaman dan deskripsi singkat.
3. Toolbar/filter dan tindakan utama.
4. Konten utama (form, tabel, detail, atau ringkasan).
5. Bantuan/konteks sekunder bila diperlukan.

Jangan membuat pola layout baru untuk halaman yang sudah memiliki pola CKAN memadai. Gunakan template custom hanya jika ada kebutuhan informasi atau navigasi yang jelas; selain itu, prioritaskan CSS additive.

## Token dan komponen

Gunakan token terpusat yang sudah tersedia pada `wajo-theme.css` untuk warna, permukaan, border, radius, spacing, shadow, dan fokus. Jangan menambahkan nilai warna/radius/shadow arbitrer untuk tiap halaman. Komponen yang harus konsisten: button, input, select, textarea, checkbox, alert, badge/status, table, pagination, tabs, dropdown, modal, breadcrumb, flash message, dan empty state.

Aksi utama menggunakan satu aksen visual. Aksi sekunder tampil netral. Aksi destruktif harus dibedakan dan memerlukan konfirmasi jika mengubah/menghapus data. Status harus memiliki teks selain warna. Form wajib mempertahankan label, petunjuk, validasi, error summary, CSRF, dan pesan flash CKAN.

## Batas integrasi CKAN

- Pertahankan endpoint, route, action, context, permission, CSRF, NAVL/Scheming validation, upload, DataStore, serta alur extension.
- Utamakan override template melalui `ckan_extends` dan CSS additive pada extension theme.
- Jangan memodifikasi core CKAN atau menyalin seluruh template upstream tanpa alasan kompatibilitas yang terdokumentasi.
- Custom page harus memakai helper/action CKAN dan menghormati permission pengguna yang sedang login.
- Setiap CSS selector harus memiliki cakupan yang cukup spesifik agar tidak mengubah perilaku komponen extension secara tidak sengaja.

## Motion

Perpindahan route tidak dianimasikan. Transisi publik hanya boleh dipakai pada kartu atau item daftar yang secara eksplisit memiliki `data-public-list-item="true"`. Gunakan durasi singkat (sekitar 200–240 ms), jarak kecil (maksimal 6 px), reveal satu kali, serta dukungan `prefers-reduced-motion`. Jangan menganimasikan hero, judul, section wrapper, skeleton, atau seluruh halaman.

Pada admin, animasi bukan kebutuhan utama. Gunakan transisi singkat untuk hover/focus dan perubahan state kecil saja; hindari entrance animation pada setiap halaman.

## Acceptance

- Tampilan konsisten antara dashboard, dataset, organisasi, pengguna, Pages, Harvest, dan halaman extension lain.
- Desktop, tablet, dan mobile dapat digunakan tanpa horizontal overflow pada keseluruhan halaman.
- Navigasi keyboard dan fokus terlihat.
- Filter, tabel, dropdown, modal, upload, form errors, flash message, dan tombol submit native tetap berfungsi.
- Tidak ada perubahan flow/permission CKAN hanya demi tampilan.
- Tidak ada flash saat route publik berubah; hanya item daftar yang diizinkan melakukan reveal.
- Perubahan theme harus lulus `bash scripts/check-static.sh` serta browser acceptance pada instance CKAN sebelum deployment produksi.
