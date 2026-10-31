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
| `ckanext-dcat`    | Label metadata DCAT/RDF, penerbit, kontak, lisensi, ruang/waktu, dan URL distribusi                    | `i18n/id/LC_MESSAGES/ckanext-dcat.po`    |

`WajoHarvestTranslationPlugin`, `WajoPagesTranslationPlugin`, dan `WajoDcatTranslationPlugin` mendaftarkan domain extension melalui `ITranslation`. Lokasi katalog dan locale mengikuti mekanisme resmi CKAN `DefaultTranslation`; domain di-override agar sesuai nama gettext extension. Plugin tersebut hanya menyediakan lokalisasi dan tidak mengganti route, permission, validasi, ataupun flow native extension.

Katalog `ckan.po` digabung dengan katalog bawaan CKAN yang sudah ada: terjemahan Wajo menang untuk `msgid` yang sama, sedangkan pesan upstream yang tidak dimiliki katalog Wajo tetap dipertahankan. Katalog Harvest, Pages, dan DCAT dikompilasi ke direktori i18n extension Wajo agar dapat ditemukan oleh plugin `ITranslation` pada startup. Setelah seluruh plugin terpasang, `initialize-extensions.sh` juga menjalankan `ckan translation js` untuk membangun ulang katalog JavaScript yang dipakai widget/komponen browser CKAN.

## Aturan pemeliharaan

1. `msgid` harus sama persis dengan string dari versi CKAN/extension yang dipasang, termasuk kapitalisasi, konteks, plural dan placeholder.
2. Isi seluruh `msgstr`; jangan biarkan entri kosong atau fuzzy untuk string yang memang dipakai UI.
3. Pertahankan placeholder seperti `%(name)s`, `{name}`, `%s`, dan `%d` secara persis.
4. Nama produk/protokol/format seperti API, URL, DataStore, CSV, GeoJSON, serta identifier teknis boleh dipertahankan bila itu istilah yang lazim dan lebih mudah dipahami daripada terjemahan literal.
5. Tambahkan string ke domain yang benar. Jangan menaruh string `ckanext-harvest`, `ckanext-pages`, atau `ckanext-dcat` ke domain `ckan` hanya karena terjemahannya sama.
6. Setelah upgrade CKAN/extension, ekstrak ulang string gettext dari source versi baru, periksa katalog, dan tambah terjemahan yang baru diperkenalkan.

## Pemeriksaan otomatis

`python3 scripts/check-id-translations.py` dijalankan sebagai bagian `bash scripts/check-static.sh`. Pemeriksaan ini memastikan:

- semua entri yang dipelihara di empat katalog mempunyai terjemahan, tanpa entri kosong atau fuzzy;
- tidak ada terjemahan yang identik dengan teks sumber kecuali istilah teknis/nama format yang secara eksplisit diizinkan;
- string wajib core, Harvest, Pages, dan DCAT tersedia;
- placeholder sumber dan terjemahan cocok;
- merge katalog core tidak menghapus terjemahan upstream;
- compiler menghasilkan file `.mo` untuk domain Harvest, Pages, dan DCAT.

Label sidebar, pintasan pembuatan konten, judul dan helper dasbor Wajo Admin juga menggunakan gettext sehingga tetap konsisten dengan katalog Bahasa Indonesia. Katalog inti dan domain extension dikompilasi di Docker build melalui `deploy/ckan/compile-id-translations.py`. Katalog JavaScript dibangun setelah aktivasi plugin melalui `ckan translation js`. File `.mo`/bundle hasil kompilasi bersifat artefak build dan tidak perlu dikomit.

## Cakupan yang sudah diuji dan batas yang perlu diperhatikan

Pada source saat ini, `scripts/check-id-translations.py` memeriksa 1.133 entri terjemahan lintas empat domain (`ckan`, `ckanext-harvest`, `ckanext-pages`, dan `ckanext-dcat`), memastikan tidak ada `msgstr` kosong/fuzzy atau teks sumber yang tertinggal tanpa alasan, menjaga placeholder, menguji merge katalog upstream, dan mengompilasi `.mo` setiap domain. Angka tersebut adalah jumlah entri katalog project, bukan persentase seluruh string yang mungkin muncul dari semua paket CKAN dan extension.

Cakupan otomatis ini meliputi string gettext yang dimasukkan ke empat katalog di atas. Teks hard-coded oleh extension pihak ketiga, pesan dari extension yang menggunakan domain lain, nama kolom yang didefinisikan dalam konfigurasi skema, serta string JavaScript yang tidak terdaftar pada katalog POT tidak bisa diterjemahkan hanya dengan katalog ini. Saat memperbarui extension, lakukan audit string pada halaman aktual dan tambahkan domain/katalog khusus bila extension tersebut mengimplementasikan `ITranslation`.

Istilah teknis, nama format berkas, dan konten yang dimasukkan administrator (misalnya judul dataset) tidak diterjemahkan otomatis karena merupakan data, bukan label antarmuka.

## Teks bawaan CKAN dan beranda portal

Katalog inti mencakup label administrasi, dataset/resource, organisasi/kategori, anggota/kolaborator, formulir, validasi, pencarian, aktivitas, DataStore, token API, statistik, serta label komponen tabel yang menggunakan gettext. Dua snippet beranda upstream yang berisi promosi/placeholder berbahasa Inggris (`home/snippets/about_text.html` dan `home/snippets/promoted.html`) diganti dengan informasi resmi Portal Satu Data Kabupaten Wajo. Template lain tetap mengikuti CKAN native agar route dan alur CRUD tidak bercabang.

## Build ulang

Setelah mengganti source di VPS, jalankan bootstrap dan rebuild image CKAN sesuai mode deployment. Langkah build mengompilasi domain `ckan`, `ckanext-harvest`, `ckanext-pages`, dan `ckanext-dcat`; saat inisialisasi setelah plugin aktif, CKAN membangun bundle terjemahan JavaScript. Restart CKAN agar locale default dan katalog yang baru diterapkan.
