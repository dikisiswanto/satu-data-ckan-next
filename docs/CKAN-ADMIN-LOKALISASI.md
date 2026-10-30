# Lokalisasi Antarmuka Administrasi CKAN

## Bahasa bawaan

Antarmuka admin CKAN memakai Bahasa Indonesia (`id`) sebagai bahasa default. English (`en`) tetap tersedia sebagai pilihan. Pengaturan disimpan di `.env.ckan` melalui bootstrap:

```dotenv
CKAN__LOCALE_DEFAULT=id
CKAN__LOCALES_OFFERED="id en"
CKAN__LOCALE_ORDER="id en"
```

`deploy/ckan/bootstrap-upstream.sh` menegakkan nilai tersebut agar konfigurasi lama tidak diam-diam kembali ke English.

## Sumber terjemahan

Katalog yang dipelihara berada di:

`deploy/ckan/theme/ckanext/wajo_theme/i18n/id/LC_MESSAGES/ckan.po`

Katalog ini menggunakan domain gettext `ckan`, sehingga dipakai oleh teks core CKAN yang menggunakan `gettext`/`_()`. Terjemahan saat ini mencakup navigasi, autentikasi, dashboard, dataset, organisasi, grup, pengguna, form, aksi umum, dan beberapa pesan statistik/validasi. Istilah teknis seperti API, URL, metadata, dan nama peran yang lazim tetap dipertahankan ketika terjemahan justru mengurangi kejelasan.

Jika menambah terjemahan:

1. Pertahankan `msgid` persis sama dengan CKAN 2.12.1, termasuk kapitalisasi dan placeholder (`%(name)s`, `{name}`, `%s`).
2. Isi `msgstr` Bahasa Indonesia; jangan menghapus placeholder dari kalimat dinamis.
3. Untuk plural Bahasa Indonesia, pertahankan aturan `nplurals=1; plural=0;`.
4. Jalankan `bash scripts/check-static.sh`.

Katalog `.po` dikompilasi saat image CKAN dibangun oleh `deploy/ckan/compile-id-translations.py` menjadi `ckan/i18n/id/LC_MESSAGES/ckan.mo`. File hasil kompilasi tidak perlu dikelola manual di repository.

## Cakupan

Katalog ini melokalkan string core CKAN yang sudah dimasukkan ke dalam katalog proyek. Teks extension yang memakai domain gettext terpisah, teks hard-coded tanpa gettext, dan beberapa pesan dari extension pihak ketiga mungkin masih tampil dalam English. Tambahkan katalog khusus untuk domain extension yang bersangkutan bila diperlukan; jangan mengganti template admin upstream hanya untuk menimpa teks, karena hal itu berisiko merusak alur CKAN saat upgrade.

## Build ulang

Setelah mengganti source di VPS, jalankan bootstrap/build image CKAN mengikuti mode deployment yang dipakai. Build harus menjalankan langkah compile katalog sebelum container berjalan. Restart CKAN agar `ckan.locale_default` dibaca saat startup.
