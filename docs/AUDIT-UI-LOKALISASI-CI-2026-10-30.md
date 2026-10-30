# Audit UI, Lokalisasi, dan CI — 30 Oktober 2026

## Ringkasan

Pembaruan ini mempertahankan CKAN 2.12.1 sebagai backend administrasi. Perubahan antarmuka menggunakan theme extension, template tambahan yang bersifat additive, dan CSS design system; tidak mengganti alur CRUD, route, Action API, authorization, validasi, CSRF, upload, DataStore, maupun workflow extension CKAN.

## UI/UX dan konsistensi admin

- Menambahkan `docs/UI-UX-DESIGN-GUIDELINES.md` sebagai kontrak desain: hierarki halaman, token bersama, komponen, aksesibilitas, responsive layout, dan batas integrasi CKAN.
- Memperjelas `docs/WAJO-ADMIN.md` tentang pola visual minimalis, konsistensi lintas modul, dan prinsip tidak membuat backend/CRUD paralel.
- Wajo Admin mempertahankan shell dan design token netral; aksen warna dipakai terbatas untuk tindakan utama/status. Dataset, Resource, Organization, User, Pages, Harvest, dan halaman extension tetap menggunakan workflow CKAN native.
- Tidak ada perubahan pada backend CRUD maupun kontrak API untuk mengejar tampilan.

## Transisi portal publik

- Perpindahan route tidak dianimasikan.
- Hero, judul, section wrapper, skeleton, dan kontainer halaman tidak menjalankan entrance animation.
- Reveal hanya diterapkan pada elemen daftar/kartu yang secara eksplisit diberi `data-public-list-item="true"`.
- Reveal hanya sekali, dengan gerak kecil dan durasi singkat; `prefers-reduced-motion` membuat item tampil langsung.
- `scripts/check-layout.mjs` memeriksa bahwa animasi bersifat opt-in dan wrapper halaman tidak ikut dianimasikan.

## Lokalisasi CKAN Admin

- Locale default `id`; English tetap tersedia.
- Tiga domain gettext dipelihara: `ckan`, `ckanext-harvest`, dan `ckanext-pages`.
- Katalog project berisi 394 entri terjemahan non-kosong. Compiler menggabungkan katalog core Wajo dengan `ckan.mo` upstream agar terjemahan upstream yang sudah ada tidak dihapus; entri Wajo menang untuk `msgid` yang sama.
- Harvest dan Pages memakai `ITranslation` domain terpisah dan menghasilkan file `.mo` di lokasi yang dibaca CKAN.
- `scripts/check-id-translations.py` memeriksa katalog kosong, placeholder, string wajib, merge core, serta hasil kompilasi domain extension.

Batasan: ini mencakup semua string yang dipelihara dalam tiga katalog project dan mempertahankan katalog core upstream. Ini belum membuktikan bahwa setiap teks hard-coded dari semua extension pihak ketiga atau string JavaScript yang tidak memakai gettext sudah diterjemahkan. Audit browser untuk semua halaman extension tetap menjadi acceptance test deployment.

## Perbaikan CI/API contract

- `scripts/check-api.mjs` kini memiliki daftar 12 action wajib, sehingga action tidak bisa hilang bersamaan dari allowlist, halaman API, dan dokumentasi tanpa terdeteksi.
- Seluruh 12 action sekarang selaras antara allowlist route API, halaman API publik, dan `docs/API.md`.
- Catatan contoh harvesting menyebut tanggal tetap sebagai contoh dan mengarahkan penggantian dengan checkpoint UTC harvester terakhir yang berhasil.
- Pesan error checker menjelaskan file/daftar yang harus disinkronkan.
- `scripts/check-ci.py` memeriksa ESLint dideklarasikan di `devDependencies`, paket ESLint ada di lockfile, dan workflow menjalankan `npm ci` sebelum `npm run check`.
- `.github/workflows/ci.yml` sudah memasang locked dependencies menggunakan `HUSKY=0 npm ci` sebelum menjalankan `npm run check`.

## Hasil validasi lokal

| Pemeriksaan                                 | Hasil                                                                             |
| ------------------------------------------- | --------------------------------------------------------------------------------- |
| `bash scripts/check-static.sh`              | PASS — seluruh 14 pemeriksaan                                                     |
| API contract                                | PASS — 12 action wajib selaras                                                    |
| Auth middleware/dashboard smoke test        | PASS — 19 skenario                                                                |
| Translation catalogs/compiler               | PASS — 394 entri, placeholder dan merge diperiksa                                 |
| Wajo theme/wheel packaging fixture          | PASS                                                                              |
| CSS/navigation/project/import/layout checks | PASS                                                                              |
| `npm run check` — static stage              | PASS                                                                              |
| `npm run check` — ESLint stage              | BELUM DAPAT DIJALANKAN: `eslint: not found` karena dependency tidak tersedia      |
| `npm ci --no-audit --no-fund`               | TIMEOUT di lingkungan pengerjaan; `node_modules/.bin/eslint` tetap tidak tersedia |

Karena instalasi dependency mengalami timeout, tidak ada klaim bahwa ESLint penuh, unit test, Playwright E2E, atau production build berhasil pada lingkungan ini. CI GitHub dirancang untuk menjalankan `npm ci` lebih dahulu; hasil hosted workflow tetap perlu dikonfirmasi pada GitHub Actions.

## Acceptance sebelum produksi

1. Jalankan `npm ci` pada mesin/runner yang dapat mengakses registry, kemudian `npm run check`.
2. Jalankan `npm run test`, `npm run test:e2e`, dan `npm run build`.
3. Rebuild image CKAN dan verifikasi locale `id`, dashboard Wajo Admin, menu, dataset, resource, organisasi, Pages, Harvest, dan GeoView.
4. Periksa teks yang masih berbahasa Inggris pada seluruh halaman extension; tambahkan ke katalog gettext domain yang tepat bila string memakai gettext, atau perbaiki template/source extension bila hard-coded.
5. Uji tampilan browser desktop/tablet/mobile dan pastikan public route transition tidak flashy.
