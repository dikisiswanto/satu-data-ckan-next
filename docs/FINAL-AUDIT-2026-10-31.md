# Audit Akhir Portal Satu Data Kabupaten Wajo

Tanggal: 31 Oktober 2026  
Basis: paket `portal-satu-data-wajo-download-markdown-auth-fix.zip`, diaudit dan diperbarui pada source tree ini.  
Target backend: CKAN 2.12.1; frontend: Next.js 16 / React 19.

## Ringkasan

Audit menggabungkan temuan dari rangkaian perbaikan admin, form custom, media, Markdown, unduhan publik, dan autentikasi. Perbaikan tambahan pada paket ini menutup beberapa celah yang masih tersisa:

- H1 Markdown sebelumnya dinaikkan menjadi H2 tanpa alasan konsisten; renderer sekarang mempertahankan level heading Markdown.
- Pratinjau admin kini memproses nested list dan Setext heading, serta mendukung tabel, daftar tugas, code fence, quote, dan gambar.
- Editor Pages/Blog kini mempunyai tombol upload dan preview untuk gambar Open Graph. Tombol upload pada `content_blocks` menambahkan objek `image` ke JSON array setelah memvalidasi JSON lebih dahulu.
- Upload Markdown menggunakan token CSRF CKAN pada field form dan header `X-CSRFToken`.
- Input file pemicu internal yang beratribut `hidden` dikecualikan dari styling file input sehingga tidak tampil sebagai kontrol kosong.
- Unduhan resource publik mendapat matcher Caddy eksplisit menuju Next.js, bukan bergantung pada fallback route umum.
- Dokumentasi audit berulang/arsip lama dibersihkan dan digabungkan ke panduan operasional serta dokumen ini.

## Temuan dan keputusan implementasi

### 1. Markdown frontend dan admin

Renderer frontend menggunakan parser Markdown internal yang aman untuk subset yang dibutuhkan portal. Pratinjau admin CKAN dibuat tanpa menyisipkan HTML mentah ke DOM. Keduanya mendukung heading ATX/Setext, paragraf, tebal, miring, coret, tautan inline/referensi/otomatis, gambar, daftar berurutan/tidak berurutan, task list, nested list, blockquote, tabel GFM dengan alignment, code inline/blok, thematic break, dan hard break.

HTML mentah tetap inert. URL tautan/gambar disaring menurut protokol yang diizinkan. Tabel memakai pembungkus overflow horizontal agar tetap dapat dibaca di layar kecil.

Batasan: ini subset CommonMark/GFM yang dipakai portal, bukan kompatibilitas penuh dengan semua ekstensi Markdown pihak ketiga. Math/LaTeX, footnote, diagram, raw HTML aktif, dan sintaks vendor-specific tidak dijanjikan.

### 2. Upload gambar CKAN

Ada dua jalur yang sengaja dibedakan:

- Logo organisasi/kategori tetap memakai Scheming preset `organization_url_upload` dengan field `image_url`. Penyajian legacy `/uploads/group/...` dilayani oleh proxy publik khusus yang membatasi path dan MIME.
- Media editorial untuk Markdown, Open Graph, dan `content_blocks` memakai CKAN File API. Endpoint `/admin/media/upload` mensyaratkan sesi sysadmin dan token CSRF, membatasi ukuran hingga 8 MiB, menerima PNG/JPEG/GIF/WebP berdasarkan magic bytes, membuat file tercatat lewat `file_create`, lalu memindahkan kepemilikan ke `wajo_media/public-editorial-media`.

Akses media publik hanya diberikan pada owner khusus tersebut melalui `wajo_media_show` dan konfigurasi `ckan.files.owner.cascade_access`. Endpoint Next.js memverifikasi file ID, owner, MIME, batas ukuran, signature, dan asal internal CKAN sebelum menyajikan gambar. Tidak ada pembukaan umum bagi semua file resource/user/group.

Form Pages menyediakan upload dan preview Open Graph. Tombol di atas `content_blocks` menambahkan blok `{ "type": "image", "src": "...", "alt": "..." }` ke array JSON. Jika JSON tidak valid, file tidak diunggah agar tidak meninggalkan media yatim. Editor Markdown menyisipkan sintaks gambar pada posisi kursor. File input native lain di admin memiliki tampilan kontrol yang terlihat, nama file, dan preview lokal untuk gambar.

### 3. Unduhan XLSX publik

Route `/dataset/[slug]/resource/[resourceId]/download/[filename]` memeriksa resource dan dataset via CKAN Action API, memastikan keduanya aktif/publik dan memastikan URL resource mengarah ke path CKAN yang diharapkan. Pengambilan file dilakukan dari `CKAN_API_INTERNAL_URL` pada jaringan privat, tidak menggunakan hostname publik sehingga menghindari loop Next/Caddy. Redirect upstream manual, respons HTML ditolak sebagai halaman login/error, JSON hanya ditolak jika filename bukan format JSON, dan plain-text tetap dapat diunduh sebagai resource sah. Header Range/Content-Range diteruskan.

Caddy pada semua profil ingress mempunyai matcher eksplisit untuk path unduhan publik menuju `nextjs:3000`. Ini mengatasi kemungkinan route resource download jatuh ke upstream CKAN dan memunculkan halaman autentikasi CKAN.

Kasus regresi telah dibuat dengan identifier yang sama seperti URL yang dilaporkan. Route juga memastikan nama file pada URL publik sama persis dengan segmen path yang dikembalikan CKAN, agar Content-Disposition tidak memakai ekstensi/nama yang menyesatkan:

`/dataset/9c70ae22-cd50-4e14-8887-d7574abfface/resource/3c2e4f10-6c61-4a2c-a3db-b96db879889c/download/menara-telekomunikasi-di-kabupaten-wajo-tahun-2025.xlsx`

Uji integrasi Vitest tersedia di `tests/unit/public-resource-download.test.js`, namun belum dapat dieksekusi pada lingkungan audit ini karena dependency npm tidak berhasil diunduh. Static checker memeriksa route, policy, dan seluruh konfigurasi Caddy.

### 4. Logout dan login

Middleware admin meneruskan logout dengan HTTP 303 ke `/user/login` tanpa `came_from` yang menunjuk kembali ke logout. Respons login/logout diberi header no-store. Setelah autentikasi, middleware menghapus hanya flash logout yang tertinggal dan mempertahankan flash lain. Login saat sesi masih aktif diarahkan ke dashboard admin.

### 5. Form dan design system

Design system CKAN memiliki aturan input/select/textarea, tombol, tabel, fokus keyboard, error state, file selector, preview gambar, dan Markdown editor. Pesan error menggunakan latar merah muda serta teks merah gelap; label tidak ikut diberi blok merah penuh. Input file yang terlihat memiliki batas dan tombol file selector yang jelas. Preview lokal ditandai belum tersimpan sampai form CKAN berhasil dikirim.

Login dipusatkan dan dipadatkan pada viewport normal; halaman pendek tetap dapat scroll agar elemen tidak terpotong pada layar landscape atau saat muncul pesan validasi.

### 6. Dokumentasi

Catatan audit bertanggal yang duplikatif di root dan `docs/` dihapus. Panduan operasional yang masih relevan dipertahankan: `README.md`, `deploy/ckan/README.md`, `docs/API.md`, `docs/CMS.md`, `docs/DATASTORE-PREVIEW-SYNC.md`, `docs/WAJO-ADMIN.md`, `docs/WAJO-ADMIN-DESIGN-SYSTEM.md`, `docs/CKAN-CUSTOM-FORMS-CONTEXT-AWARE.md`, panduan admin, lokalisasi, dan UI/UX.

## Pemeriksaan yang dijalankan

`bash scripts/check-static.sh` — PASS. Cakupan checker:

- kontrak CI/environment dan baseline CKAN;
- template CKAN, WebAssets, schema, lokalisasi;
- form Dataset/Resource/Organisasi/Kategori;
- proxy logo dan validasi form;
- upload media editorial, File API owner, CSRF, MIME, dan media proxy;
- parser Markdown, struktur tabel/list/heading, serta inert HTML;
- route unduhan publik, matcher Caddy, dan header unduhan;
- 21 skenario auth/dashboard ditambah pemeriksaan stale flash/logout;
- packaging wheel CKAN, konfigurasi plugin, DataStore/XLoader, CSS, navigasi, API, import graph, dan layout.

Smoke test parser Markdown langsung melalui Node juga lulus untuk heading, tabel/alignment, task list, nested list, Setext heading, blockquote, fenced code, dan hard break. `node --check` lulus untuk JavaScript editor, admin form enhancement, media route, dan download route. `python3 -m py_compile` lulus untuk plugin CKAN dan checker Python.

## Batas verifikasi

- Environment pengerjaan tidak memiliki `node_modules`; `npm ci --ignore-scripts` mengalami timeout karena akses registry tidak tersedia. Vitest, ESLint, Next production build, dan Playwright E2E belum dijalankan.
- DNS/jaringan dari lingkungan audit tidak dapat mengakses hostname produksi, sehingga URL XLSX dan upload media belum diuji langsung pada VPS/browser.
- Caddyfile diperiksa dengan static guard, belum diverifikasi oleh `caddy validate` pada image deployment.
- Perubahan belum di-deploy. Pengujian browser pada akun sysadmin dan editor tetap diperlukan untuk memverifikasi CKAN plugin/CSRF/FileStore yang aktif di instance.

Jangan menghapus volume PostgreSQL, Solr, Redis, atau `ckan_storage` saat menerapkan source baru.

## Deployment dan acceptance test

1. Backup database CKAN dan volume filestore.
2. Ganti source proyek dengan paket ini.
3. Jalankan:

   ```bash
   bash ./deploy/ckan/bootstrap-upstream.sh
   bash ./deploy/ckan/compose.sh cloudflare config
   bash ./deploy/ckan/compose.sh cloudflare up -d --build --force-recreate ckan nextjs edge-tunnel
   ```

4. Pastikan CKAN sehat, lalu uji login/logout dan login ulang pada hostname admin.
5. Uji logo organisasi dan gambar kategori; periksa file URL pada domain publik.
6. Pada Pages/Blog uji upload Open Graph, upload Markdown pada posisi kursor, dan penambahan image block pada JSON. Buka halaman publik dan periksa gambar.
7. Uji file XLSX dengan URL regresi di atas. Respons unduhan yang berhasil harus berupa `200` (atau `206` untuk Range), MIME XLSX, dan `Content-Disposition: attachment`; file harus dapat dibuka di Excel.
8. Uji halaman login pada desktop dan ponsel portrait/landscape, serta validasi form dengan isian sengaja salah.
9. Jalankan `npm ci`, `npm run check`, `npm run test`, `npm run test:e2e`, dan `npm run build` pada mesin deployment/CI yang memiliki akses registry.
