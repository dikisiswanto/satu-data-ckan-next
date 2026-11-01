# Pratinjau Media dan Pemisahan Katalog

Dokumen ini menjelaskan pratinjau gambar serta aturan klasifikasi katalog publik. CKAN tetap menjadi satu-satunya sumber data dan otorisasi.

## Pratinjau gambar (lightbox)

Komponen bersama `src/components/ui/image-lightbox.jsx` menampilkan gambar pada lapisan dialog di atas halaman. Dialog dirender melalui portal ke `body` agar tidak terpotong oleh `overflow` atau stacking context kartu.

### Kontrol dan perilaku

- Klik gambar untuk membuka pratinjau; klik latar gelap atau tekan `Escape` untuk menutup.
- Zoom tersedia dari 100% hingga 500% dengan langkah 50%; roda mouse juga didukung.
- Klik ganda berpindah antara ukuran sesuai layar dan zoom 200%.
- Gambar dapat digeser saat diperbesar. Layar sentuh mendukung pinch zoom dan swipe.
- Galeri mendukung navigasi gambar sebelumnya/berikutnya, thumbnail, dan pemuatan awal gambar di sekitar posisi aktif.
- Tombol `+`/`=` dan `-` mengatur zoom; `0` mengembalikan ukuran awal; tombol panah kiri/kanan berpindah gambar saat gambar tidak sedang diperbesar.
- Toolbar menyediakan reset, buka gambar asli, navigasi galeri, dan tutup sesuai konteks.
- Status memuat dan kegagalan gambar ditampilkan secara eksplisit. Jika gagal, tersedia tautan ke sumber asli.
- Dialog mengelola fokus keyboard, mengunci scroll halaman, dan mengembalikan fokus ke elemen pemicu saat ditutup.
- Kontrol memiliki nama aksesibel dan focus state yang terlihat. Judul gambar serta posisi galeri diumumkan kepada teknologi bantu.

### Lokasi integrasi

- Pratinjau resource gambar pada detail dataset.
- Thumbnail katalog dan gambar pada detail infografik.
- Blok gambar dan galeri CMS.
- Gambar Markdown pada konten Pages/Blog.
- Gambar sampul pada detail informasi dan berita.

Pratinjau ukuran penuh menggunakan URL media publik yang sama dengan thumbnail setelah melewati validasi. Komponen ini tidak melewati pemeriksaan akses CKAN dan tidak membentuk URL penyimpanan langsung.

## Pemisahan katalog tanpa menggandakan record CKAN

Tipe package native CKAN tetap `dataset`. Field `portal_type` hanya mengatur klasifikasi dan penyajian di portal; field ini bukan tipe package baru dan bukan penyimpanan terpisah.

Katalog `/dataset`, facet-nya, dan metrik dataset umum mengecualikan tipe berikut:

- `indikator` / `portal-indikator`
- `infografik` / `portal-infografik`
- `publikasi` / `portal-publikasi`

Pengecualian memeriksa tag penemuan dan `extras_portal_type`. Tag tetap dipakai untuk mendukung record lama yang belum memiliki extra `portal_type`. Katalog khusus menggunakan adapter CKAN masing-masing:

- `/statistik` mengambil record indikator dan resource tabular DataStore.
- `/infografik` mengambil record infografik dan resource gambar/PDF.
- `/publikasi` mengambil record publikasi/laporan dan resource dokumen.

Pemisahan ini hanya mengatur katalog. Tidak ada record yang dihapus, dipindahkan, atau digandakan, dan permission CKAN tidak berubah. API CKAN native tetap menyediakan objek asli untuk integrasi dan harvesting.

## Pedoman pemodelan konten

1. **Indikator/statistik:** gunakan package CKAN dengan `portal_type=indikator`, tag `portal-indikator`, metadata definisi/satuan/rumus/wilayah/periode, dan resource tabular DataStore. Observasi tetap bersumber dari DataStore, bukan database CMS lain.
2. **Infografik:** buat package `portal_type=infografik` jika visual memiliki judul, periode, penerbit/atribusi, dan siklus publikasi sendiri. Sertakan resource gambar/PDF dan rujukan dataset sumber. Jika gambar hanya lampiran dataset, simpan sebagai resource pada dataset tersebut.
3. **Publikasi/laporan:** gunakan package `portal_type=publikasi` untuk laporan resmi yang memiliki penerbit, tanggal rilis, periode, lisensi, versi, metodologi, dan berkas unduhan. Berita serta narasi situs tetap menggunakan Pages/Blog.
4. **Data geospasial:** simpan sebagai dataset dengan `portal_type=geospasial`; tampilkan pratinjau spasial pada detail dataset atau GeoPortal.

Pola ini mempertahankan satu sumber otoritatif CKAN untuk pemilik, organisasi, lisensi, resource, permission, versi, dan revisi, sekaligus menjaga katalog publik tetap mudah dipahami.

## Rujukan terkait

- [Dokumentasi API Publik](API.md)
- [Pratinjau DataStore dan Sinkronisasi](PRATINJAU-DATASTORE-DAN-SINKRONISASI.md)
- [Akses Unduhan Dataset Privat](AKSES-UNDUHAN-DATASET-PRIVAT.md)
- [CMS Pages dan Blog](CMS.md)
