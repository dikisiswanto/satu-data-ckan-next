# Panduan menu pengelola Portal Satu Data Kabupaten Wajo

Dokumen ini menjelaskan menu Wajo Admin dan urutan kerja yang disarankan. CKAN tetap menjadi sistem sumber untuk metadata, resource, organisasi, permission, dan preview; portal Next.js menjadi antarmuka publik.

## Ringkasan

Gunakan `/admin/` untuk melihat jumlah dataset, organisasi, kategori, dataset milik akun, serta dataset terbaru. Dasbor menyediakan pintasan **Buat konten berdasarkan jenis**; pilih jenisnya sebelum mengisi metadata agar field dan klasifikasi portal diatur otomatis. Menu dan aksi tetap mengikuti permission akun.

## Katalog data

- **Semua dataset:** cari, filter, buat, dan perbarui metadata dataset.
- **Organisasi:** kelola perangkat daerah pemilik data dan keanggotaan pengelola.
- **Kategori data:** kelola kategori topik yang membantu penelusuran. Kategori tematik adalah entitas Group CKAN, bukan tipe konten Dataset.

Sebelum menerbitkan dataset, periksa judul, deskripsi, organisasi, lisensi, periode, frekuensi pembaruan, tag, dan resource.

## Publikasi data

Menu berikut memfilter dataset berdasarkan tag yang dikenali portal publik. Ini bukan penyimpanan terpisah. Ketika membuat data dari pintasan tipe konten, `portal_type` dipilih otomatis dan tag penemuan publik akan diselaraskan saat formulir berubah/disimpan.

- **Publikasi & laporan:** gunakan tag `portal-publikasi`; isi penerbit, tanggal rilis, periode, lisensi, ringkasan, dan file publikasi.
- **Indikator & statistik:** gunakan tag `portal-indikator`; isi definisi, satuan, rumus/metodologi, cakupan wilayah, periode, frekuensi, dan resource tabular.
- **Infografik:** gunakan tag `portal-infografik`; tambahkan gambar utama, deskripsi, periode, atribusi, dan dataset sumber.
- **Data geospasial:** pilih tipe `geospasial`; lengkapi cakupan wilayah/metodologi dan unggah GeoJSON, GeoPackage, KML/KMZ, SHP dalam ZIP, atau data berkoordinat. Saat ini data geospasial ditemukan melalui katalog/detail dataset umum, belum mempunyai halaman listing khusus bertag.

## Halaman dan informasi

- **Halaman portal (`/pages`):** profil daerah, kebijakan, panduan, metodologi, dan informasi tetap.
- **Berita & blog (`/blog`):** berita, pengumuman, kegiatan, dan artikel berkala.

Gunakan panel panduan kontekstual di Wajo Admin untuk menuju form tambah, memeriksa field editorial, dan memahami status publikasi. Frontend publik tidak lagi menampilkan banner panduan halaman di atas konten; pengunjung menggunakan navigasi utama dan breadcrumb.

## Integrasi data

- **Pengambilan data (`/harvest`):** daftarkan katalog eksternal, pilih harvester, organisasi pemilik, jadwal, jalankan job, dan periksa laporan.
- **DataStore & pratinjau (`/admin/data-preview`):** hanya sysadmin; periksa konfigurasi, jalankan perintah izin yang disalin ke terminal, pastikan worker aktif, antrekan resource lama, lalu buka detail dataset dari daftar. Jangan bagikan token XLoader.

## Permission

Menu ditampilkan berdasarkan permission CKAN, dan setiap operasi tetap diperiksa oleh CKAN. Tidak semua editor dapat mengelola anggota organisasi, pengaturan sistem, atau menjalankan backfill. Hubungi sysadmin jika tombol tindakan tidak tersedia.
