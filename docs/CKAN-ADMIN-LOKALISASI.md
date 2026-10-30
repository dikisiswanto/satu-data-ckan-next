# Lokalisasi Antarmuka Administrasi CKAN

## Bahasa bawaan

Antarmuka administrasi CKAN memakai Bahasa Indonesia (`id`) sebagai bahasa default. English (`en`) tetap tersedia sebagai pilihan. Pengaturan disimpan di `.env.ckan` dan ditegakkan kembali oleh bootstrap:

```dotenv
CKAN__LOCALE_DEFAULT=id
CKAN__LOCALES_OFFERED="id en"
CKAN__LOCALE_ORDER="id en"
```

## Domain terjemahan yang dipelihara

CKAN dan extension dapat memakai domain gettext terpisah. Karena itu setiap katalog diletakkan pada domain yang benar, bukan hanya mengganti teks melalui CSS atau template.

| Domain            | Pemakaian                                                                                              | Sumber katalog                           |
| ----------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| `ckan`            | CKAN core, shell Wajo Admin, label umum, form dan pesan validasi yang menggunakan `_()`/`gettext` core | `i18n/id/LC_MESSAGES/ckan.po`            |
| `ckanext-harvest` | Halaman sumber pengambilan data, tugas, status, jadwal, dan tindakan Harvest                           | `i18n/id/LC_MESSAGES/ckanext-harvest.po` |
| `ckanext-pages`   | Pengelolaan Pages/CMS, form halaman, status publikasi, dan tindakan Pages                              | `i18n/id/LC_MESSAGES/ckanext-pages.po`   |

`WajoHarvestTranslationPlugin` dan `WajoPagesTranslationPlugin` mendaftarkan dua domain extension melalui `ITranslation`. Lokasi katalog dan locale mengikuti mekanisme resmi CKAN `DefaultTranslation`; domain di-override agar sesuai nama gettext extension. Plugin tersebut hanya menyediakan lokalisasi dan tidak mengganti route, permission, validasi, ataupun flow native extension.

Katalog `ckan.po` digabung dengan katalog bawaan CKAN yang sudah ada: terjemahan Wajo menang untuk `msgid` yang sama, sedangkan pesan upstream yang tidak dimiliki katalog Wajo tetap dipertahankan. Katalog Harvest dan Pages dikompilasi ke direktori i18n extension Wajo agar dapat ditemukan oleh plugin `ITranslation` pada startup.

## Aturan pemeliharaan

1. `msgid` harus sama persis dengan string dari versi CKAN/extension yang dipasang, termasuk kapitalisasi, konteks, plural dan placeholder.
2. Isi seluruh `msgstr`; jangan biarkan entri kosong atau fuzzy untuk string yang memang dipakai UI.
3. Pertahankan placeholder seperti `%(name)s`, `{name}`, `%s`, dan `%d` secara persis.
4. Nama produk/protokol/format seperti API, URL, DataStore, CSV, GeoJSON, serta identifier teknis boleh dipertahankan bila itu istilah yang lazim dan lebih mudah dipahami daripada terjemahan literal.
5. Tambahkan string ke domain yang benar. Jangan menaruh string `ckanext-harvest` atau `ckanext-pages` ke domain `ckan` hanya karena terjemahannya sama.
6. Setelah upgrade CKAN/extension, ekstrak ulang string gettext dari source versi baru, periksa katalog, dan tambah terjemahan yang baru diperkenalkan.

## Pemeriksaan otomatis

`python3 scripts/check-id-translations.py` dijalankan sebagai bagian `bash scripts/check-static.sh`. Pemeriksaan ini memastikan:

- semua entri yang dipelihara di tiga katalog mempunyai terjemahan;
- string wajib core, Harvest, dan Pages tersedia;
- placeholder sumber dan terjemahan cocok;
- merge katalog core tidak menghapus terjemahan upstream;
- compiler menghasilkan file `.mo` untuk domain Harvest dan Pages.

Kompilasi dijalankan di Docker build melalui `deploy/ckan/compile-id-translations.py`. File `.mo` bersifat hasil build dan tidak perlu dikomit.

## Batas cakupan yang perlu diperhatikan

Cakupan otomatis ini meliputi string gettext yang dimasukkan ke tiga katalog di atas. Teks hard-coded oleh extension pihak ketiga, pesan dari extension yang menggunakan domain lain, nama kolom yang didefinisikan dalam konfigurasi skema, serta string JavaScript yang tidak terdaftar pada katalog POT tidak bisa diterjemahkan hanya dengan katalog ini. Saat memperbarui extension, lakukan audit string pada halaman aktual dan tambahkan domain/katalog khusus bila extension tersebut mengimplementasikan `ITranslation`.

Istilah teknis, nama format berkas, dan konten yang dimasukkan administrator (misalnya judul dataset) tidak diterjemahkan otomatis karena merupakan data, bukan label antarmuka.

## Build ulang

Setelah mengganti source di VPS, jalankan bootstrap dan rebuild image CKAN sesuai mode deployment. Langkah build mengompilasi domain `ckan`, `ckanext-harvest`, dan `ckanext-pages` sebelum container dijalankan. Restart CKAN agar locale default dibaca ulang.
