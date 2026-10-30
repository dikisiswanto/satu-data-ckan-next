# Portal Satu Data Kabupaten Wajo

Portal data publik berbasis **Next.js + CKAN 2.12**. CKAN adalah sumber kebenaran untuk katalog dataset, organisasi, topik, resource, file, dan tabel DataStore. Next.js menyajikan pengalaman publik, pencarian, halaman dataset, statistik/indikator, infografik, organisasi, dokumentasi API, dan SEO.

> **Tidak ada backend Laravel di paket ini.** Pengelolaan data dilakukan melalui antarmuka administrasi CKAN; API yang dihadirkan Next.js hanya mengekspos daftar Action API CKAN untuk membaca informasi publik.

## Arsitektur domain

- `https://data.wajokab.go.id` — satu-satunya origin publik yang diindeks. Portal, katalog, halaman statistik, infografik, dan API baca tersedia di sini.
- `https://ckan.data.wajokab.go.id` — UI administrasi CKAN. Gunakan satu gerbang perimeter (Basic Auth Caddy atau Cloudflare Access) ditambah login/role CKAN. Mode `cloudflare-access` menghindari prompt Basic Auth terpisah; sesi Access dapat diatur lebih panjang (mis. 7 hari), tetapi sesi CKAN masih terpisah dan ini belum SSO. Unduhan resource publik disajikan melalui host publik; host admin tidak mempunyai jalur unduhan publik.
- API publik berada di path `https://data.wajokab.go.id/api/3/action/*`; tidak memerlukan hostname API terpisah. Mutasi seperti `package_create`, `package_update`, upload, dan manajemen pengguna tidak diekspos.

## Memulai deployment

Persyaratan: Docker Engine dan Docker Compose v2, Git, Python 3, serta akses internet untuk mengambil repositori/image resmi CKAN. Untuk build lokal Next.js, gunakan Node.js 22.16+ dan npm 10.9.2+.

```bash
cp .env.ckan.example .env.ckan
# Ubah hostname dan branding sebelum bootstrap; setelah bootstrap, sesuaikan CKAN_SYSADMIN_EMAIL di .env.ckan.
./deploy/ckan/bootstrap-upstream.sh
```

Bootstrap meng-clone `ckan/ckan-docker` resmi ke `deploy/ckan/upstream`, mematok image basis CKAN `2.12.1`, menyiapkan secret awal dan (bila dipilih) kredensial Basic Auth admin, memasang extension CKAN (Scheming, Pages, DCAT, GeoView, Harvest, XLoader), mengaktifkan worker Redis untuk harvest dan XLoader, lalu menyalin override Next.js. Service DataPusher legacy dihapus. CKAN hanya menjadi admin di host privat/terlindungi; di host publik Caddy meneruskan path ekspor DCAT/unduhan resource saja dan mengarahkan halaman lain ke Next.js. `.env.ckan` adalah satu-satunya sumber konfigurasi/rahasia. Bootstrap merender `deploy/ckan/upstream/.env.generated` sebagai output terfilter; token XLoader dikecualikan dari env bersama dan hanya diberikan pada CKAN serta worker. File generated bukan tempat mengatur konfigurasi, dan tidak berisi token Cloudflare, kredensial Basic Auth edge, atau variabel Next.js publik. Jangan commit atau membagikan `.env.ckan`. Bootstrap tidak otomatis menjalankan container.

Setelah CKAN pertama kali sehat, terapkan permission DataStore dan buat token XLoader:

```bash
./deploy/ckan/apply-datastore-permissions.sh
./deploy/ckan/enable-xloader.sh manual   # atau cloudflare / cloudflare-access
```

Pilih **satu** mode ingress sesuai dokumentasi di [`deploy/ckan/README.md`](deploy/ckan/README.md):

- Cloudflare DNS + named Tunnel jika origin VPS tidak boleh membuka port 80/443.
- DNS biasa dengan Caddy dan TLS otomatis jika VPS menerima inbound 80/443.

## Statistik dan infografik melalui CKAN Admin

Frontend tetap memiliki `/statistik`, `/statistik/[slug]`, `/infografik`, dan `/infografik/[slug]`. Halaman tersebut hanya membaca data publik CKAN, tidak memakai tabel backend khusus.

### Menerbitkan indikator statistik

1. Buat dataset publik di CKAN Admin dan tambahkan tag persis `portal-indikator`.
2. Tambahkan resource CSV/tabel dan aktifkan DataStore.
3. Gunakan kolom minimal `period`, `region`, `value`; kolom `unit` dan `source` disarankan. Contoh data tersedia di `public/templates/data-deret-indikator.csv`.
4. Isi field Scheming pada form dataset CKAN: satuan, definisi, frekuensi, rumus, sumber, cakupan wilayah, periode, metodologi, tanggal rilis, versi, dan catatan revisi. Field tambahan juga tersedia lewat *Additional Information* untuk dataset legacy.
5. Publikasikan dataset dan resource sebagai public agar nilai tampil di grafik dan tabel publik.

### Menerbitkan infografik

1. Buat dataset publik dan tambahkan tag `portal-infografik`.
2. Unggah resource gambar PNG/JPG/WebP (atau resource dokumen PDF untuk unduhan). Resource gambar digunakan sebagai visual utama.
3. Lengkapi title, notes/deskripsi, organisasi, tags, dan field ekstra opsional `portal_category`, `portal_period`, `portal_attribution`.
4. Pastikan resource dapat diakses publik sesuai izin CKAN.

Form metadata admin memakai `ckanext-scheming`; periode, cakupan tanggal, frekuensi, sumber, metodologi, satuan, rumus, versi rilis, catatan revisi, dan role resource didefinisikan pada `deploy/ckan/schemas/dataset.yaml`. GeoView menyediakan viewer geospasial pada CKAN Admin, dan Next.js memiliki preview GeoJSON dengan batas ukuran/geometri agar halaman publik tetap ringan. Rujuk [`deploy/ckan/EXTENSIONS.md`](deploy/ckan/EXTENSIONS.md) untuk pin versi dan model aktivasi extension resmi. Panduan penerbitan portal juga tersedia di `/api-data#indikator`, `/api-data#infografik`, dan `/api-data#publikasi-detail`.

## Dokumentasi API publik

Kontrak endpoint, whitelist parameter, batas query, bentuk respons, contoh request, perilaku cache/CORS, dan panduan keamanan tersedia di [`docs/API.md`](docs/API.md) serta halaman publik `/api-data`. Dokumentasi mengacu pada facade read-only aplikasi, bukan semua action yang tersedia pada CKAN upstream. Temuan dan cakupan validasi audit publik terbaru tersedia pada [`docs/FRONTEND-REGRESSION-AUDIT.md`](docs/FRONTEND-REGRESSION-AUDIT.md).

## UI publik dan geospasial

Frontend menggunakan Next.js App Router, Tailwind CSS 4, komponen aksesibel internal bergaya shadcn/ui, `cn()` (`clsx` + `tailwind-merge`), `cva`, dan Lucide. Radix tidak ditambahkan secara menyeluruh: kontrol sederhana tetap native, dan primitive baru sebaiknya ditambahkan hanya jika dialog/popover/menu kompleks memerlukan perilaku aksesibilitas yang tidak aman dibuat sendiri. Audit stylesheet membuang selector admin/widget legacy yang tak terpakai, mengurangi ukuran stylesheet global sekitar 9,0% (45.430 menjadi 41.332 byte) dan jumlah baris sekitar 11,0% tanpa mengubah urutan import cascade. Urutan cascade dipertahankan sampai migrasi bertahap bisa diverifikasi lewat screenshot/E2E; guardrail `scripts/check-ui-css.mjs` mencegah selector lama masuk kembali. Transisi memakai CSS dengan dukungan `prefers-reduced-motion`; tabel/grafik hanya menampilkan kolom dan nilai yang dikembalikan CKAN; preview geospasial hanya dibuat untuk resource GeoJSON yang valid dan publik. Footer menautkan Portal Satu Data Indonesia (data.go.id).

## Pemeriksaan proyek

```bash
npm ci
npm run check
npm run lint
npm run test
npx playwright install --with-deps chromium
npm run test:e2e
npm run build
npm run security:check
```

Tes unit menguji pemetaan metadata/resource CKAN; E2E menguji jalur publik dengan mock CKAN Action API 2.12, tanpa service Laravel atau database palsu yang meniru API lama. Job deployment memeriksa syntax Compose, Caddy, dan bootstrap.

## Keamanan dan operasi

- Jangan terbitkan port PostgreSQL, Solr, Redis, CKAN, atau Next.js langsung ke Internet; hanya ingress terpilih yang boleh menerima trafik publik.
- Untuk Tunnel, Cloudflare men terminasi TLS di edge; gunakan named Tunnel menuju Caddy di jaringan privat Docker.
- Untuk mode DNS manual, arahkan A record hostname publik dan admin ke VPS, buka TCP 80/443, dan biarkan Caddy mengurus sertifikat HTTPS. Pastikan firewall tidak membuka port internal lainnya.
- `X-Robots-Tag: noindex` bukan kontrol akses. Pilih satu gerbang perimeter di host admin: Basic Auth Caddy atau Cloudflare Access (Tunnel), lalu tetap gunakan login CKAN untuk hak akses internal.
- Gunakan backup terjadwal untuk database CKAN, volume filestore, dan Solr; uji restore sebelum upgrade.
- Jalankan `./deploy/ckan/compose.sh manual config` (atau `cloudflare config`) dan smoke test sesuai panduan deploy sebelum produksi. Untuk menjalankan, gunakan `./deploy/ckan/compose.sh manual up -d --build`, profil `cloudflare`, atau profil `cloudflare-access` setelah Access policy aktif. File upstream CKAN sengaja diambil pada mesin deployment, bukan disalin ke source portal.


### CKAN Admin login entrypoint

The default ingress mode is `CKAN_ADMIN_GATE_MODE=none`: opening `https://ckan.data.wajokab.go.id/` redirects directly to CKAN's login form, with a post-login destination at `/ckan-admin/config/`. Caddy Basic Auth remains an optional extra gate (`basic_auth`); Cloudflare Access is another optional edge gate for the Tunnel profile. The root redirect does not make every other native CKAN URL private; CKAN authentication/authorization protects mutating and administrative actions. See `deploy/ckan/README.md`.
