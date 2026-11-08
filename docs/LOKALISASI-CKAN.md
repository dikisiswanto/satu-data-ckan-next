# Lokalisasi CKAN dan extension

Panduan ini mencakup terjemahan antarmuka admin CKAN dan extension yang dikemas di image portal. CKAN memakai GNU gettext untuk Python/Jinja (`.po` → `.mo`) dan katalog JavaScript terpisah. Portal publik Next.js menggunakan teks Bahasa Indonesia langsung di komponennya.

## Cakupan katalog saat ini

| Domain    | Katalog lokal          |  Entri terjemahan | Pemuat                                                                              |
| --------- | ---------------------- | ----------------: | ----------------------------------------------------------------------------------- |
| CKAN core | `ckan.po`              |               917 | Compiler portal menggabungkan katalog CKAN upstream lalu menerapkan override lokal. |
| Harvest   | `ckanext-harvest.po`   |               182 | Plugin `ITranslation` portal.                                                       |
| Pages     | `ckanext-pages.po`     |               120 | Plugin `ITranslation` portal.                                                       |
| DCAT      | `ckanext-dcat.po`      |                29 | Plugin `ITranslation` portal.                                                       |
| XLoader   | Katalog lokal opsional | belum ada di repo | Plugin `ITranslation`; katalog upstream digabung bila extension menyediakannya.     |
| GeoView   | Katalog upstream       |                 — | Plugin `ITranslation` memuat domain jika paket menyediakan katalog.                 |
| Scheming  | Katalog upstream       |                 — | Plugin `ITranslation` memuat domain jika paket menyediakan katalog.                 |

> Angka menghitung entri `.po` lokal dan tidak menghitung terjemahan upstream yang digabung saat build. Katalog lokal saat ini tidak memiliki entri kosong. CKAN 2.12.1 dipatok di deployment; lampiran `ckan.pot` berasal dari CKAN 2.13.0a0. Dari 1.185 msgid lampiran, 667 belum tercantum dalam PO lokal. Itu adalah daftar selisih versi, bukan bukti bahwa seluruhnya tampil dalam bahasa Inggris: compiler juga mempertahankan katalog upstream yang tersedia. Untuk mengukur celah runtime secara akurat, audit harus memakai POT dan extension source yang sama versinya dengan image.

## Memperbarui CKAN core

Gunakan template yang diekstrak dari CKAN 2.12.1, bukan POT 2.13.0a0. Di checkout sumber dan virtualenv CKAN:

```sh
python setup.py extract_messages
python setup.py update_catalog --locale id
```

Tinjau dan terjemahkan `ckan/i18n/id/LC_MESSAGES/ckan.po`, lalu salin entri yang diperlukan sebagai override ke `deploy/ckan/theme/ckanext/portal_theme/i18n/id/LC_MESSAGES/ckan.po`. CKAN menggunakan Babel dan format GNU gettext; pertahankan `%s`, `%(name)s`, `{name}`, konteks, serta pasangan singular/plural.

Saat image dibuat, `deploy/ckan/compile-id-translations.py` menggabungkan katalog inti upstream dari `.mo` maupun `.po` bila tersedia. Override lokal diterapkan terakhir. Entri kosong atau fuzzy tidak menimpa terjemahan yang sudah ada. Hasil `.mo` dan `.po` gabungan ditulis ke direktori locale resmi CKAN; `.po` diperlukan juga oleh kompilasi JavaScript CKAN.

## Memperbarui extension

Extension yang memiliki katalog lokal memakai domain terpisah di `i18n/id/LC_MESSAGES/`. Template `.pot` harus diekstrak dari versi extension yang dipatok di `deploy/ckan/extensions/requirements.txt`, lalu katalog diperbarui dengan Babel pada checkout extension:

```sh
python setup.py extract_messages
python setup.py update_catalog --locale id
python setup.py compile_catalog --locale id
```

Kompiler portal mencari katalog upstream `.po` dan `.mo` pada extension terpasang, lalu menggabungkannya dengan override lokal. Ia menulis `.po`, `.mo`, dan `.pot` di direktori khusus tiap domain, misalnya `i18n/ckanext-pages/`. Pemisahan direktori ini penting: CKAN mengindeks sumber JS berdasarkan `i18n_directory()`; bila beberapa domain berbagi satu direktori, katalog browser dapat saling menimpa. POT upstream dipakai untuk JS; bila tidak ada, compiler membuat POT dari referensi yang tersedia di katalog gabungan. Tema mendaftarkan domain Harvest, Pages, DCAT, XLoader, GeoView, dan Scheming melalui entry point `ITranslation`. Tambahkan mapping paket pada `EXTENSION_MODULES`, plugin domain, dan katalog lokal bila menambah extension.

## JavaScript CKAN

Setelah extension aktif, `deploy/ckan/initialize-extensions.sh` menjalankan perintah resmi CKAN untuk menggabungkan katalog JavaScript CKAN dan extension:

```sh
ckan -c /srv/app/ckan.ini translation js
```

Proses startup mengulang kompilasi itu setelah migrasi extension, sehingga string JavaScript yang dipasang pada image tersedia di browser CKAN. Bila extension atau versinya berubah, rebuild image dan restart container.

## Pemeriksaan

`scripts/check-id-translations.py` memeriksa PO lokal, placeholder, plural, string wajib, template Jinja, hasil MO, serta perilaku merge katalog upstream. Ia memeriksa override yang dikelola repo; entri yang hanya ada di katalog upstream diperiksa saat katalog final dirakit di image. Untuk gap audit lintas versi, siapkan POT core dan tiap extension dari source yang dipatok lalu bandingkan setelah `update_catalog`; jangan memakai perbandingan 2.13 sebagai ukuran cakupan image 2.12.1.
