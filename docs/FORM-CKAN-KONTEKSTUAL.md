# Form CKAN Kontekstual

## Tujuan

Form metadata CKAN menampilkan input sesuai entitas dan tipe konten yang sedang diedit. Implementasi tidak membuat tipe package baru agar endpoint, route, katalog publik, serta record dataset lama tetap kompatibel.

## Perilaku

- Form dataset baru menetapkan `portal_type=dataset` sebagai pilihan awal. Pintasan dasbor/sidebar meneruskan `?portal_type=indikator|infografik|publikasi|geospasial` sehingga form langsung memilih konteks yang diminta tanpa mengubah tipe package internal CKAN.
- Field lanjutan dataset ditampilkan mengikuti `portal_type`: dataset, indikator, infografik, publikasi, atau geospasial.
- Form resource tetap memakai `resource_fields` Scheming. `portal_resource_role` secara default adalah `data`; metadata periode/versi resource ditampilkan sesuai perannya.
- Organisasi memakai `organization.yaml` melalui `scheming_organizations` dan hanya menampilkan metadata perangkat daerah. Field logo tetap menggunakan preset upload resmi `organization_url_upload` dari Scheming.
- Kategori tematik memakai `group.yaml` melalui `scheming_groups` dan hanya menampilkan metadata kategori.
- Field yang tidak relevan disembunyikan di browser, tetapi tidak dihapus dari schema/API. Nilai lama tetap berada di record dan tidak hilang hanya karena tipe konten berubah.
- Ketika `portal_type` berubah, tag yang dikelola portal (`portal-indikator`, `portal-infografik`, `portal-publikasi`) ikut diselaraskan. Tag pengguna lain dipertahankan. Frontend Next.js menggunakan tag yang sama untuk menemukan konten publik. Pada record lama yang sudah memiliki tag publik tetapi belum memiliki metadata `portal_type`, form edit menyimpulkan tipe dari tag tersebut agar membuka formulir tidak menghapus konten dari katalog publik.
- Form resource baru membaca tipe dataset induk melalui shell admin: infografik menyarankan peran gambar infografik, publikasi menyarankan peran dokumen publikasi, dan geospasial menyarankan peran data geospasial. Pengelola tetap dapat mengubah pilihan.
- Form kategori tematik menampilkan penjelasan bahwa Group CKAN hanya untuk mengelompokkan dataset; tautan langsung ke form dataset indikator/infografik/publikasi/geospasial tersedia dari sana.

## Pemetaan metadata dataset

| Tipe       | Field tambahan yang ditampilkan                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------ |
| Dataset    | Periode, cakupan tanggal, frekuensi, jadwal pembaruan, versi, catatan revisi, metodologi, sumber, wilayah          |
| Indikator  | Periode, cakupan tanggal, frekuensi, jadwal pembaruan, versi, metodologi, definisi, satuan, rumus, sumber, wilayah |
| Infografik | Periode acuan, sumber, wilayah, kategori, periode tampil, atribusi/penerbit                                        |
| Publikasi  | Periode acuan, tanggal rilis, versi, catatan revisi, kategori, periode tampil, sumber, atribusi/penerbit           |
| Geospasial | Periode, cakupan tanggal, frekuensi, jadwal pembaruan, versi, metodologi, sumber, wilayah                          |

## Keputusan kompatibilitas

`dataset_type` internal CKAN tetap `dataset`. `portal_type` adalah metadata tambahan portal, bukan package type. Ini menjaga query publik, API Action CKAN, DataStore/XLoader, dan URL `/dataset/...` yang sudah dipakai data lama. Sebaliknya, kategori tematik menggunakan entitas CKAN `group` dan schema `group.yaml`; jangan menaruh `portal_type` ke Group. Ini dua konsep yang berbeda.

Field tersembunyi tetap menjadi bagian schema server sehingga update record tidak perlu migrasi database. Scheming tetap menjadi sumber validasi dan penyimpanan metadata.

## Penerapan

Jalankan bootstrap agar plugin dan konfigurasi skema organisasi/kategori ikut diterapkan, lalu bangun ulang CKAN:

```bash
bash ./deploy/ckan/bootstrap-upstream.sh
bash ./deploy/ckan/compose.sh cloudflare up -d --build --force-recreate ckan
```

Tidak perlu menghapus volume atau menjalankan migrasi database.

## Pemeriksaan

`node scripts/check-admin-forms.mjs` menguji pemilihan tipe dari query string, sinkronisasi tag dengan query FE, visibilitas field berdasarkan tipe, pewarisan role resource dari dataset induk, dan perilaku form kategori tematik yang terpisah. `bash scripts/check-static.sh` menjalankan pemeriksaan statis proyek penuh. Acceptance test browser tetap diperlukan untuk memverifikasi tampilan form pada instance CKAN setelah deploy.
