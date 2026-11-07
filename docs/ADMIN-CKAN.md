# Panduan Administrasi CKAN

Portal Admin adalah lapisan antarmuka untuk CKAN 2.12.1. CKAN tetap menjadi otoritas data, autentikasi, otorisasi, validasi, CSRF, upload, DataStore, dan workflow extension. Next.js tetap menjadi antarmuka katalog publik; tidak ada backend CRUD paralel.

## Shell dan dashboard

- **Topbar:** identitas instansi dari konfigurasi, tautan portal publik, profil, pengaturan sysadmin, dan logout ber-CSRF.
- **Sidebar:** Ringkasan, Katalog Data, Publikasi Data, Halaman & Informasi, Integrasi Data, Akun Saya, dan Pengaturan Sistem. Menu mengikuti permission CKAN.
- **Workspace:** konten native CKAN—breadcrumb, notifikasi, form, toolbar, tabel, tab, dan widget—tetap dirender oleh template upstream.
- **Footer:** identitas dan versi CKAN selaras dengan topbar. Sidebar collapse pada layar menengah/kecil; tabel tidak boleh melebarkan viewport.

Rute dashboard: `/admin/`. Metrik memakai Action API berdasarkan hak akses pengguna: dataset (`package_search`), organisasi (`organization_list`), kategori (`group_list`), dataset milik pengguna, enam dataset terakhir diperbarui, dan quick action yang hanya muncul bila permission mengizinkan. Kegagalan satu query tidak boleh merusak render dashboard; metrik terkait menampilkan `—`, bukan angka nol palsu.

## Menu dan alur kerja

| Menu                    | Fungsi dan alur utama                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Semua dataset           | Cari/filter → detail → metadata → resource → pratinjau/API                                                       |
| Organisasi              | Kelola organisasi, anggota/peran, dan dataset pemilik                                                            |
| Kategori data           | Kelola Group tematik dan hubungkan dataset relevan                                                               |
| Publikasi & laporan     | Dataset `portal-publikasi`; lengkapi penerbit, periode, lisensi, berkas, lalu terbitkan                          |
| Indikator & statistik   | Dataset `portal-indikator`; lengkapi definisi, satuan, metodologi, wilayah, periode, frekuensi, dan data tabular |
| Infografik              | Dataset `portal-infografik`; unggah visual dan cantumkan sumber/periode                                          |
| Halaman portal          | Pages untuk profil, kebijakan, panduan, dan informasi tetap                                                      |
| Berita & blog           | Blog Article untuk berita, pengumuman, dan artikel berkala                                                       |
| Pengambilan data        | CKAN Harvest: sumber → harvester → jadwal/organisasi → pekerjaan → laporan                                       |
| DataStore dan pratinjau | Pemeriksaan plugin/izin, worker XLoader, antrean resource lama, dan verifikasi API                               |

Publikasi, indikator, dan infografik adalah klasifikasi dataset CKAN melalui `portal_type`/tag, bukan modul CRUD terpisah. Pages dan Blog memakai route/form native `ckanext-pages`; tetapkan visibilitas dan tanggal terbit sebelum memeriksa hasil di portal.

## Form kontekstual dan metadata

Form menampilkan field sesuai entitas dan `portal_type`, tanpa membuat package type baru:

- Dataset baru default ke `portal_type=dataset`; pintasan dapat meneruskan `?portal_type=indikator|infografik|publikasi|geospasial`.
- Field lanjutan mengikuti tipe dataset. Resource tetap menggunakan `resource_fields`; `portal_resource_role` menentukan metadata dan saran format.
- Organisasi memakai `organization.yaml`; kategori tematik memakai `group.yaml`. Group tidak memiliki selector `portal_type`.
- Field yang tidak relevan disembunyikan di browser, bukan dihapus dari schema/record. Tag portal diselaraskan saat tipe berubah, sedangkan tag lain dipertahankan.
- Form edit record lama menyimpulkan tipe dari tag penemuan bila metadata `portal_type` belum tersedia.

| Tipe       | Metadata tambahan utama                                                            |
| ---------- | ---------------------------------------------------------------------------------- |
| Dataset    | Periode, tanggal, frekuensi, pembaruan, versi, revisi, metodologi, sumber, wilayah |
| Indikator  | Metadata dataset + definisi, satuan, rumus                                         |
| Infografik | Periode acuan, sumber, wilayah, kategori, periode tampil, atribusi                 |
| Publikasi  | Periode acuan, tanggal rilis, versi, revisi, kategori, lisensi/atribusi            |
| Geospasial | Periode, tanggal, frekuensi, versi, metodologi, sumber, wilayah                    |

`dataset_type` CKAN tetap `dataset`; `portal_type` hanyalah metadata portal. Skema Scheming tetap menjadi sumber validasi/penyimpanan, sehingga perubahan ini tidak membutuhkan migrasi database.

## DataStore dari UI

Buka **Integrasi Data → DataStore dan pratinjau** (`/admin/data-preview`). Admin dapat memeriksa konfigurasi, menyalin perintah izin DataStore, memeriksa status/log worker, lalu mengantrekan hingga 25 resource tabular lama yang publik dan didukung. Antrean UI hanya tersedia untuk sysadmin. Worker berjalan di server; browser hanya menyalin perintah, bukan mengeksekusi shell. Backfill penuh mengikuti [panduan DataStore](PRATINJAU-DATASTORE-DAN-SINKRONISASI.md).

## Rute, host, dan autentikasi

- `CKAN__AUTH__ROUTE_AFTER_LOGIN=portal_admin.index` mengarahkan login sukses ke dashboard.
- Blueprint `portal_admin` memakai prefix `/admin`; jangan menghapus prefix karena middleware root dapat membentuk redirect loop.
- Root `CKAN_HOST` mengarahkan pengguna anonim ke login dan pengguna terautentikasi ke dashboard.
- Host admin meminta login pada seluruh rute admin; Action API tanpa sesi mendapat JSON `401`. Host publik dan host internal tidak ikut dikunci.
- Login hanya mengautentikasi. Permission CRUD tetap ditegakkan CKAN menurut role dan keanggotaan.

## Lokalisasi

Bahasa Indonesia (`id`) adalah default; English (`en`) tetap tersedia. Bootstrap menegakkan konfigurasi berikut:

```dotenv
CKAN__LOCALE_DEFAULT=id
CKAN__LOCALES_OFFERED="id en"
CKAN__LOCALE_ORDER="id en"
```

Katalog project dipisah menurut domain gettext:

| Domain            | Cakupan                                                      |
| ----------------- | ------------------------------------------------------------ |
| `ckan`            | CKAN core, shell portal, label umum, form, dan validasi      |
| `ckanext-harvest` | Sumber, pekerjaan, status, jadwal, dan tindakan Harvest      |
| `ckanext-pages`   | Pages/CMS, form, status publikasi, dan tindakan Pages        |
| `ckanext-dcat`    | Metadata DCAT/RDF, penerbit, kontak, lisensi, dan distribusi |

Plugin `ITranslation` mendaftarkan domain extension. Katalog `ckan.po` digabung dengan terjemahan upstream sehingga pesan bawaan yang tidak dimiliki portal tetap ada; katalog extension dikompilasi ke `.mo` saat build. Setelah plugin aktif, `ckan translation js` membangun katalog JavaScript. File `.mo` dan bundle hasil kompilasi adalah artefak build, bukan source untuk dikomit.

Aturan pemeliharaan: `msgid` harus sama dengan sumber; `msgstr` tidak boleh kosong/fuzzy; placeholder harus identik; string harus masuk ke domain yang benar; istilah teknis lazim boleh dipertahankan. Setelah upgrade CKAN/extension, ekstrak ulang string dan periksa katalog.

Validasi `python3 scripts/check-id-translations.py` (juga bagian `check-static.sh`) memeriksa empat domain, placeholder, string wajib, merge upstream `.po`/`.mo`, dan hasil kompilasi. Cakupan ini menjamin katalog yang dipelihara project, bukan seluruh teks hard-coded extension pihak ketiga.

## Peta berkas utama

| Lokasi                                                                             | Fungsi                                          |
| ---------------------------------------------------------------------------------- | ----------------------------------------------- |
| `deploy/ckan/theme/ckanext/portal_theme/templates/`                                | Shell, navigasi, dashboard, dan template portal |
| `deploy/ckan/theme/ckanext/portal_theme/assets/css/portal-theme.css`               | Compatibility styling CKAN                      |
| `deploy/ckan/theme/ckanext/portal_theme/assets/css/portal-admin-design-system.css` | Token dan komponen visual admin                 |
| `deploy/ckan/theme/ckanext/portal_theme/plugin.py`                                 | Middleware, blueprint, helper, dan schema Pages |
| `deploy/ckan/theme/setup.py`                                                       | Metadata package dan package-data               |

Template portal didaftarkan satu kali melalui `plugin_template_paths`. Bootstrap menempatkan `portal_theme` sebelum `pages` dan `activity`; urutan ini diperlukan untuk prioritas helper/template CKAN 2.12. Jangan menduplikasi direktori template pada `extra_template_paths`.

## Batas perubahan dan validasi

Jangan mengganti route/action dataset, resource, organisasi, grup, user, revision, DataStore, validasi NAVL/Scheming, CSRF, permission, upload, flash/error message, atau extension Pages, Harvest, GeoView, DCAT, dan XLoader demi styling. Detail token, layout, dan paritas publik/login/admin ada di [Sistem Desain Portal](DESAIN-SISTEM.md).

```bash
bash scripts/check-static.sh
python3 scripts/check-auth-middleware.py
node scripts/check-admin-forms.mjs
python3 scripts/check-id-translations.py
```

Acceptance browser mencakup login, dashboard, dataset/resource, organisasi, Pages/Blog, Harvest, DataStore, form panjang, permission, filter, dropdown, modal, upload, serta keyboard dan ukuran layar desktop/tablet/mobile. Rebuild dan diagnostik ada di [Panduan Operasional](OPERASIONAL-DEPLOYMENT.md).
