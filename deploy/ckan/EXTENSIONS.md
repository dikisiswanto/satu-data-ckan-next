# Ekstensi CKAN yang dipasang

Extension pins disimpan dalam `extensions/requirements.txt` dan dimasukkan ke image dari source Compose resmi `ckan/ckan-docker`. Bootstrap tidak meng-clone extension dari branch `master`; paket dipasang dari versi rilis yang dikunci agar build dapat direproduksi.

## Tampilan CKAN Admin: Midnight Blue bawaan CKAN 2.12

CKAN 2.12.1 menyediakan tema modern **Midnight Blue** secara bawaan. Deployment ini mengaktifkannya dengan `CKAN__BASE_PUBLIC_FOLDER=public-midnight-blue` dan `CKAN__BASE_TEMPLATES_FOLDER=templates-midnight-blue`, yang dipetakan CKAN ke `ckan.base_public_folder` dan `ckan.base_templates_folder`. Pengaturan ini memodernisasi antarmuka CKAN yang mencakup halaman pengelolaan/admin dan UI CKAN lainnya; tidak mengubah desain Next.js pada portal publik.

Kami tidak memasang `ckanext-theming`/`ckanext-mlc-theme` sebagai dependency default. `ckanext-theming` saat ini menjelaskan dirinya sebagai prototipe dan tema MLC memerlukannya. Pilih jalur ini hanya jika kelak dibutuhkan framework UI yang dapat diganti-ganti dan tersedia waktu untuk menguji semua template dari `scheming`, `pages`, `harvest`, `geoview`, DataStore, autentikasi, dan alur admin pada deployment aktual. Lihat [catatan rilis CKAN 2.12](https://docs.ckan.org/en/2.12/changelog.html) untuk pengaturan tema bawaan.

## Paket dan fungsi

| Extension                                                      |   Versi | Status              | Pemakaian                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------- | ------: | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`ckanext-scheming`](https://github.com/ckan/ckanext-scheming) | `3.1.0` | Aktif               | Form metadata terstruktur untuk tipe dataset, indikator, infografik, publikasi, periode data, frekuensi, sumber, metodologi, satuan, rumus, versi rilis, catatan revisi, dan peran resource.                                                                                                                                                                                                                      |
| [`ckanext-pages`](https://github.com/ckan/ckanext-pages)       | `0.5.2` | Aktif               | CMS di CKAN Admin, halaman informasi, dan revisi untuk konten halaman yang dikelola oleh extension ini. Tidak berarti dataset memiliki snapshot penuh yang dapat di-rollback.                                                                                                                                                                                                                                     |
| [`ckanext-dcat`](https://github.com/ckan/ckanext-dcat)         | `2.4.4` | Aktif               | Ekspor/serialisasi katalog interoperabel DCAT/RDF, termasuk profil katalog yang didukung extension, dan plugin `structured_data` untuk output data terstruktur.                                                                                                                                                                                                                                                   |
| [`ckanext-xloader`](https://github.com/ckan/ckanext-xloader)   | `2.5.2` | Aktif dengan worker | Loader tabular untuk DataStore melalui CKAN Jobs/Redis dan PostgreSQL `COPY`. Token dibuat setelah first start oleh `enable-xloader.sh`; DataPusher dihapus dari stack.                                                                                                                                                                                                                                           |
| [`ckanext-geoview`](https://github.com/ckan/ckanext-geoview)   | `0.3.2` | Aktif               | Viewer resource geospasial untuk GeoJSON, WMS/WFS, WMTS, GML/KML, ArcGIS REST dan shapefile yang didukung extension; memerlukan `resource_proxy`. CKAN menampilkan viewer ini di antarmuka admin, sementara Next.js memberi preview GeoJSON ringan pada portal publik.                                                                                                                                            |
| [`ckanext-harvest`](https://github.com/ckan/ckanext-harvest)   | `1.6.3` | Aktif dengan worker | Federasi/ingest katalog dari CKAN lain melalui sumber Harvest; mendukung alur DCAT RDF melalui `dcat_rdf_harvester`. Menggunakan Redis dan dua worker gather/fetch yang terpisah. Sumber harvest perlu dibuat dan dikonfigurasi oleh pengelola; memasang plugin tidak otomatis menyambungkan katalog lain. Lisensi AGPL-3.0-or-later; perhatikan kewajiban lisensi jika memodifikasi atau mendistribusikan image. |

Pratinjau gambar, PDF, tabel, grafik dan GeoJSON pada portal publik ditangani oleh UI Next.js dari resource public CKAN. `ckanext-geoview` juga aktif pada CKAN admin untuk menyediakan viewer geospasial ketika staf mengelola resource. Rilis resmi geoview mengklaim dukungan CKAN 2.10+; karena classifier PyPI belum secara eksplisit menyebut Python 3.14, build image terhadap `ckan/ckan-base:2.12.1` tetap harus diuji sebelum produksi. CI deployment memeriksa Dockerfile/konfigurasi; smoke test image harus menguji `pip install`, import plugin, dan pembukaan tiap jenis viewer.

## GeoView dan pratinjau geospasial

`ckanext-geoview` menyediakan viewer di CKAN untuk resource dengan format yang didukung (GeoJSON, WMS/WFS, WMTS, GML/KML, ArcGIS REST, dan shapefile). Plugin `resource_proxy` wajib tersedia. Viewer admin tidak menjadikan resource privat menjadi publik; izin CKAN tetap menjadi satu-satunya otoritas. Untuk pengalaman publik, Next.js hanya mempratinjau GeoJSON dari URL resource public yang berasal dari metadata CKAN, dengan batas file 5 MiB, 2.000 fitur, dan 20.000 koordinat. Dataset yang lebih besar tetap bisa diunduh dan dibuka melalui tooling GIS khusus. Format WMS/WFS/WMTS/shapefile tetap dapat dikelola dan dilihat melalui CKAN admin; portal publik menautkan ke resource aslinya tanpa menggambar data yang tidak tersedia.

## Federasi katalog / SDI dengan Harvest + DCAT

`ckanext-harvest` menambahkan halaman sumber harvest pada CKAN Admin. Redis dan worker `harvest-gather` / `harvest-fetch` menangani antrean. Pengelola dapat menambahkan sumber CKAN lain dan memakai plugin `dcat_rdf_harvester` untuk katalog DCAT/RDF yang sesuai. Endpoint ekspor DCAT di host publik memudahkan konsumsi katalog Wajo oleh portal lain. Harvesting tidak otomatis mengubah sumber eksternal menjadi data resmi Wajo; pilih organisasi tujuan, jadwal, aturan mapping, deduplikasi, lisensi, atribusi dan proses review sebelum memublikasikan dataset hasil harvest. `ckanext-spatial` tidak dipasang sebagai default karena dukungan repository yang terlihat belum mencakup CKAN 2.12; visualisasi resource telah dipindahkan ke `ckanext-geoview`.

## XLoader sebagai loader default

Deployment default memakai XLoader, extension yang direkomendasikan CKAN untuk ingestion otomatis ke DataStore. XLoader menyalurkan data tabular langsung lewat PostgreSQL `COPY`, yang menurut dokumentasi project bisa lebih dari 10× cepat daripada DataPusher pada pengujian mereka; angka aktual tetap bergantung ukuran file, disk, database, dan resource server. DataPusher legacy dihapus dari upstream Compose dan tidak boleh dijalankan bersamaan dengan XLoader. <https://github.com/ckan/ckanext-xloader>

Setelah CKAN pertama kali sehat, jalankan dari root repository:

```bash
./deploy/ckan/apply-datastore-permissions.sh
./deploy/ckan/enable-xloader.sh manual   # gunakan cloudflare jika memakai profil Tunnel
```

Skrip membuat API token bagi pengguna `CKAN_SYSADMIN_NAME`, menyimpannya hanya di `.env.ckan`, lalu recreate service `ckan` dan `xloader-worker`. Token tidak dicetak ke terminal serta tidak dimasukkan ke env bersama yang diwarisi database, Solr, Redis, Nginx, atau Next.js. Cek status/log dengan `./deploy/ckan/compose.sh manual ps` dan `./deploy/ckan/compose.sh manual logs -f ckan xloader-worker`.

Mode `COPY` bawaan cepat dan tahan terhadap data campuran, tetapi menyimpan kolom sebagai `text`. Atur kolom angka/tanggal melalui Data Dictionary jika fitur native CKAN memerlukan tipe tersebut. Pengaturan `ckanext.xloader.use_type_guessing=true` memungkinkan inferensi tipe, tetapi lebih lambat dan lebih rentan gagal pada data inkonsisten. Sebelum produksi, uji CSV berukuran representatif, tipe kolom, DataStore API, status job, dan retry.

## Metadata terstruktur untuk Portal Satu Data

Schema yang dipasang di `schemas/dataset.yaml` menyediakan field inti CKAN dan field khusus portal:

- `portal_type`: dataset, indikator, infografik, publikasi, atau geospasial.
- `portal_reference_period`, `portal_data_start`, `portal_data_end`, `portal_periodicity`, `portal_update_frequency`, dan `portal_publication_date`.
- `portal_version`, `portal_revision_note`, dan `portal_methodology`.
- `portal_definition`, `portal_unit`, `portal_formula`, `portal_source`, `portal_geography`, `portal_category`, `portal_period`, dan `portal_attribution`.
- Resource field: `portal_resource_role`, `portal_resource_period`, dan `portal_resource_version`.

Tag yang dibaca oleh frontend tetap harus ditambahkan pada dataset: `portal-indikator`, `portal-infografik`, dan `portal-publikasi`. Field `portal_type` membantu konsistensi form dan metadata, sedangkan tag memberi kontrak penemuan yang kompatibel dengan query CKAN dan resource lama.

### Indikator statistik

Buat dataset publik bertag `portal-indikator`, lengkapi satuan, definisi, periode, frekuensi, sumber, rumus, metodologi, versi, dan catatan revisi; unggah resource tabular yang diaktifkan pada DataStore. Untuk grafik, gunakan field `period`, `value`; `region`, `unit`, dan `source` direkomendasikan. Portal memilih resource `portal_resource_role=data` bila diisi, atau DataStore aktif pertama jika role belum ditentukan.

### Infografik dan publikasi

Gunakan tag `portal-infografik` untuk dataset gambar/visual dan `portal-publikasi` untuk laporan atau dokumen. Lengkapi periode, penerbit/atribusi, versi rilis, tanggal terbit, catatan revisi, metodologi, dan role resource. File publik hanya muncul jika status/izin CKAN mengizinkannya.

## Riwayat, versi dan revisi

- `metadata_modified` adalah waktu metadata CKAN terakhir berubah, bukan tanggal rilis statistik.
- `portal_version` dan `portal_revision_note` menyatakan versi rilis yang diterbitkan pengelola.
- `package_activity_list` menampilkan jejak aktivitas yang diizinkan CKAN; itu bukan sistem snapshot file/data lengkap dan tidak menjamin rollback nilai DataStore.
- `ckanext-pages` menyediakan riwayat revisi bagi halaman Pages yang dikelola extension tersebut.

Untuk revisi numerik yang harus dapat direproduksi, simpan setiap rilis sebagai resource/versioned dataset yang dapat ditelusuri (dengan periode, versi, dan catatan perubahan); jangan menimpa data lama tanpa catatan jika audit angka merupakan kewajiban.

## Referensi resmi

- CKAN 2.12 DataStore: https://docs.ckan.org/en/2.12/maintaining/datastore.html
- GeoView official repository: https://github.com/ckan/ckanext-geoview
- Harvest official repository: https://github.com/ckan/ckanext-harvest
- Satu Data Indonesia: https://data.go.id/about
- CKAN Action API: https://docs.ckan.org/en/2.12/api/index.html
- Scheming: https://github.com/ckan/ckanext-scheming
- Pages: https://github.com/ckan/ckanext-pages
- DCAT: https://github.com/ckan/ckanext-dcat
- XLoader: https://github.com/ckan/ckanext-xloader
