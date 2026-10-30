# Portal Satu Data Kabupaten Wajo

Portal data publik berbasis **Next.js + CKAN 2.12.1**. CKAN menjadi sumber kebenaran metadata, organisasi, resource, DataStore, dan administrasi. Next.js menyajikan portal publik, pencarian, dataset, statistik, infografik, publikasi, organisasi, dan API baca.

## Domain

| Hostname                          | Fungsi                                            | Routing                                                                     |
| --------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------- |
| `https://data.wajokab.go.id`      | Portal, katalog, statistik, publikasi, API publik | Next.js; ekspor DCAT dan unduhan resource publik diteruskan ke CKAN         |
| `https://ckan.data.wajokab.go.id` | Login dan UI administrasi CKAN                    | Root diarahkan ke form login CKAN; seluruh hostname diberi header `noindex` |

API publik tersedia di `https://data.wajokab.go.id/api/3/action/*`. Tidak diperlukan hostname `api.data.wajokab.go.id`. Facade API hanya mengizinkan action baca dan parameter yang ditentukan aplikasi.

## Setup deployment

Butuh Docker Engine + Compose v2, Git, Python 3, dan akses keluar ke GitHub/registry. Salin konfigurasi dan tinjau hostname, branding, dan gerbang admin:

```bash
cp .env.ckan.example .env.ckan
# Edit PUBLIC_HOST, CKAN_HOST, CLOUDFLARE_TUNNEL_TOKEN, dan nilai branding bila diperlukan.
./deploy/ckan/bootstrap-upstream.sh
```

Bootstrap mengambil dua source resmi dengan peran terpisah: `ckan/ckan-docker` untuk orkestrasi Compose dan `ckan/ckan-docker-base` untuk membangun runtime CKAN. Source `ckan-2.12/VERSION.txt` wajib bernilai `2.12.1`; sebelum `compose up`, script memakai `build.sh` upstream untuk membangun dan memverifikasi image lokal `ckan/ckan-base:2.12.1`. Setelah itu Compose membangun image CKAN Wajo di atas base tersebut, memasang extension metadata/interoperabilitas, DataStore, GeoView, Harvest, XLoader, dan theme admin Wajo, serta memakai environment CKAN terfilter. Bootstrap hanya mengambil dan memvalidasi source; build image dasar berlangsung otomatis saat `compose up`.

Pilih satu mode ingress dan ikuti [`deploy/ckan/README.md`](deploy/ckan/README.md):

```bash
# Cloudflare Tunnel — tidak memerlukan port web VPS terbuka
./deploy/ckan/compose.sh cloudflare config
# Perintah up otomatis menyinkronkan dan membangun base image resmi CKAN 2.12.1
./deploy/ckan/compose.sh cloudflare up -d --build

# Atau DNS biasa + Caddy HTTPS pada VPS
./deploy/ckan/compose.sh manual config
./deploy/ckan/compose.sh manual up -d --build
```

Setelah CKAN sehat, terapkan izin DataStore dan siapkan token XLoader:

```bash
./deploy/ckan/apply-datastore-permissions.sh
./deploy/ckan/enable-xloader.sh cloudflare  # ganti manual jika memakai ingress manual
```

`.env.ckan` adalah satu-satunya sumber konfigurasi deployment. Jangan commit atau bagikan file tersebut; token Tunnel dan rahasia admin bersifat privat. Jangan menghapus volume database atau filestore saat memperbarui source.

## Theme admin CKAN

UI CKAN menggunakan Midnight Blue bawaan CKAN 2.12 sebagai dasar ditambah extension lokal `wajo_theme`. Extension ini memuat branding Wajo, logo, CSS responsif, fokus aksesibel, serta styling untuk halaman login dan halaman administrasi. Ia terpasang saat bootstrap dan aktif melalui plugin `wajo_theme`; bukan hanya stylesheet milik Next.js. Kode sumbernya ada di `deploy/ckan/theme/` dan disalin ke build context upstream saat bootstrap.

`ckanext-theming` tidak dipakai sebagai dependency karena arsip source ini tidak mengandung instalasi aktifnya, sementara proyek tersebut masih berupa prototipe. Extension lokal menggunakan mekanisme resmi CKAN untuk template dan WebAssets sehingga tetap berada di atas template CKAN, bukan mengganti alur login, form, permission, atau fitur extension lain.

## Menjalankan pemeriksaan lokal

```bash
npm ci
npm run check
npm run lint
npm run test
npm run test:e2e
npm run build
python3 scripts/check-ckan-build-overlay.py
```

E2E publik menggunakan CKAN Action API mock. Build image CKAN dan smoke test login/theme perlu dijalankan pada lingkungan deployment untuk menguji extension terhadap image CKAN dan data nyata.
