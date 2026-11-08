# Desain dan Kualitas Frontend

Dokumen ini menjadi acuan tampilan portal publik, halaman login, Portal Admin, aksesibilitas, PWA, dan performa.

## Sistem Desain

Dokumen ini adalah acuan visual bersama untuk frontend publik, login CKAN, dan Portal Admin. Implementasi token kanonis berada di `src/app/styles/foundation.css` dan `deploy/ckan/theme/ckanext/portal_theme/assets/css/portal-admin-design-system.css`. Jika nilai berubah, perbarui kedua sumber dan regression check terkait.

### Identitas visual

Portal memakai pendekatan **civic data atlas**: peta wilayah menjadi jangkar visual hero, dikelilingi empat kartu statistik aktual yang ditempatkan asimetris. Setiap kartu memakai warna pekat yang berbeda, ikon yang relevan, dan garis penghubung tipis menuju peta. Bahasa visualnya editorial, terstruktur, berorientasi data dan wilayah, tetapi tetap ramah untuk masyarakat umum. Karakter yang dituju adalah **standout, modern, clean, dan estetis**—bukan dashboard SaaS generik atau halaman serba putih yang datar.

### Arah visual

- **Energi visual: 2 / 3** — cukup kuat untuk membangun karakter tanpa membuat halaman terasa ramai.
- **Ritme: 2 / 3** — variasikan komposisi antarbagian; jangan mengulang pola grid yang sama.
- **Gerak: 1 / 3** — gunakan transisi singkat dan animasi kemunculan seperlunya; hindari gerak dekoratif terus-menerus.

- **Navy `#123650`:** identitas utama, hero, panel login, dan topbar admin.
- **Blue `#1D5FA7`:** aksi utama, tautan, navigasi aktif, dan fokus.
- **Teal `#23785F`:** wilayah, lingkungan, serta konektivitas data.
- **Ochre `#91621F`:** ekonomi, industri, dan regulasi.
- **Canvas `#F5F7F6`, putih, slate:** permukaan dan teks yang nyaman dibaca.
- Aksen tambahan seperti violet, rose, atau hijau boleh dipakai pada ilustrasi/kategori bila punya konteks. Hindari warna acak atau palet pelangi.

Jenis huruf utama Inter dengan fallback sistem. Heading tegas dan rapat; isi mudah dibaca. Admin memakai skala lebih kompak daripada publik, tanpa mengecilkan kontrol atau teks penting.

### Bahasa visual per area

#### Frontend publik

- Hero desktop memakai komposisi dua kolom, foto relevan, overlay kontras, headline kuat, pencarian yang mudah ditemukan, serta peta wilayah outline transparan di sisi kanan.
- Aset `public/illustrations/region-map-outline.webp` berisi garis batas putih dengan latar transparan dan tanpa label. Aset dipilih melalui `PORTAL_HERO_MAP_IMAGE` dan dipetakan ke `NEXT_PUBLIC_HERO_MAP_IMAGE`; ganti melalui konfigurasi dengan batas wilayah yang sesuai saat portal diterapkan pada instansi lain, bukan dengan menanam nama wilayah ke komponen.
- Angka metrik harus berasal dari data CKAN. Ilustrasi tidak boleh memuat angka, nama wilayah, atau klaim statistik fiktif.
- Kartu dataset menggunakan panel ilustrasi ringan; kategori memakai warna semantik; panel unggulan dapat memadukan permukaan biru muda dan navy.
- Variasikan ritme section. Jangan mengulang grid kartu untuk semua jenis konten.
- Halaman berita/CMS menempatkan isi editorial sebagai fokus; hindari kartu ber-border dan padding besar yang tidak diperlukan.

#### Login

- Menjadi penghubung identitas publik dan admin: panel identitas navy dengan ilustrasi peta wilayah yang selaras dengan hero, dipasangkan dengan formulir putih yang menjadi fokus.
- Formulir berada di tengah, lebar maksimum sekitar `448px`, input minimum `46px`, dan font input `16px`.
- Jangan menampilkan sidebar/topbar admin pada layar login.

#### Portal Admin CKAN

- Gunakan topbar navy, sidebar netral, status aktif biru, serta aksen teal/ochre pada metrik sesuai konteks.
- Admin lebih padat dan fungsional: navigasi ringkas, metrik kompak, tabel dan formulir menjadi fokus, jarak tepi lebih kecil, serta informasi mudah dipindai.
- Area kerja maksimum `1480px`, formulir panjang `960px`, kerangka admin `1800px`, sidebar desktop `264px`.
- Pertahankan rute, template inti, kolom, validator, CSRF, izin, unggah, widget, dan JavaScript bawaan CKAN. Styling harus additive dan dibatasi pada area portal.

### Token dan komponen

Token admin menggunakan prefix `--portal-*`. Warna, font, ukuran teks, lebar shell/form, spacing, radius, shadow, dan tinggi kontrol didefinisikan pada CSS kanonis. Nilai utama:

| Token                       |     Nilai | Peran                  |
| --------------------------- | --------: | ---------------------- |
| `--portal-color-navy`       | `#123650` | Identitas utama        |
| `--portal-color-blue`       | `#1D5FA7` | Aksi dan navigasi      |
| `--portal-color-blue-hover` | `#174F8C` | Hover/focus lanjutan   |
| `--portal-color-teal`       | `#23785F` | Aksen wilayah/data     |
| `--portal-color-ochre`      | `#91621F` | Aksen ekonomi/regulasi |
| `--portal-color-canvas`     | `#F5F7F6` | Latar aplikasi         |
| `--portal-color-surface`    | `#FFFFFF` | Kartu, panel, form     |
| `--portal-color-ink`        | `#1B3440` | Teks utama             |
| `--portal-color-muted`      | `#586D76` | Deskripsi/teks bantuan |
| `--portal-color-border`     | `#D8E2E4` | Border netral          |

Ukuran dasar admin: body `0.9375rem`, kontrol `42px`, tombol `40px`, area sentuh `44px`, radius kontrol `10px`, kartu `12px`, dialog `16px`. Gutter halaman memakai `clamp(1rem, 2.1vw, 2rem)` dan jarak mengikuti kelipatan 4px.

Breakpoint admin: di bawah `1200px` ruang kerja dipersempit; di bawah `992px` sidebar menjadi navigasi collapse; di bawah `768px` panel ditumpuk dan kontrol utama tetap memiliki area sentuh `44px`; di bawah `480px` brand/toolbar diringkas tanpa mengecilkan tombol ikon di bawah `40px`. Tabel lebar memakai wrapper responsif.

Status menggunakan warna semantik—success `#28784F`, warning `#95651D`, danger `#B33D46`, info `#286B99`—dan selalu memiliki label atau ikon; warna bukan satu-satunya pembeda.

Kontrol formulir harus dibedakan menurut tugasnya: input teks, pilihan, pilihan ganda, editor teks, tanggal, kotak centang/radio, serta unggah masing-masing memiliki petunjuk penggunaan yang jelas. Tampilkan label, teks bantuan, status tidak valid, pesan error, pemuatan, dan status nonaktif secara konsisten.

### Ikon dan ilustrasi

- Pilih ikon berdasarkan makna fitur, bukan dekorasi. Ikon kategori memakai aksen warna semantik yang konsisten.
- CKAN Admin memakai macro `portal_icon` dan Font Awesome Free yang dibundel CKAN 2.12.1. Jangan mengandalkan nama alias ikon lama atau sumber ikon eksternal.
- Ilustrasi harus membantu pengguna mengenali data, wilayah, format, atau jenis publikasi. Hindari jaring node generik, kubus 3D, ornamen acak, serta grafik/angka fiktif.
- Gambar dekoratif memakai `aria-hidden="true"`; gambar informatif memiliki alt yang bermakna.

### Transisi, aksesibilitas, dan performa

- Tidak memakai animasi route, rotasi 3D, atau gerakan dekoratif terus-menerus.
- Efek keadaan hover dan fokus singkat sekitar `140–220ms`; animasi kemunculan pada halaman publik hanya sekali dan hanya aktif pada elemen daftar atau kartu yang dipilih yang relevan.
- Hormati `prefers-reduced-motion`; jangan menahan konten utama sampai animasi selesai.
- Jaga focus-visible, kontras, navigasi papan ketik, zoom, area sentuh minimal `44px`, LCP, dan CLS.

### Batas perubahan

Jangan mengganti alur CRUD atau kontrak CKAN demi tampilan. Periksa publik, login, dashboard, dataset/resource, organisasi, Pages/Blog, Harvest, DataStore, formulir panjang, dan layar mobile setiap kali mengubah token atau komponen bersama.

### Hero peta dan statistik

Peta batas wilayah menjadi ilustrasi utama hero. Empat kartu metrik yang menampilkan jumlah dataset, organisasi, kategori, dan indikator ditempatkan asimetris di sekelilingnya. Gunakan warna pekat yang berbeda, teks dan ikon berkontras tinggi, serta garis penghubung tipis dengan titik kecil menuju peta. Kartu boleh bergerak vertikal secara halus sekitar 5 px, tetapi tidak boleh saling menutupi atau keluar dari area visual. Nonaktifkan gerak saat `prefers-reduced-motion` aktif. Pertahankan rasio kontras teks minimal 4.5:1.

## Kualitas Frontend Publik

Dokumen ini adalah panduan kanonis untuk menjaga pengalaman portal publik Next.js. Untuk perubahan katalog dan sumber data, gunakan [kontrak API publik](API.md), [pratinjau DataStore](DATASTORE-DAN-AKSES.md), dan [konten dan media](ADMIN-CKAN-DAN-CMS.md). Untuk proses penerapan, lihat [panduan deployment](OPERASIONAL-DEPLOYMENT.md).

### Paginasi katalog

Katalog Dataset, Statistik/Indikator, Infografik, dan Publikasi memakai `PublicPagination` bersama. Parameter halaman dinormalisasi ke bilangan bulat positif. Permintaan halaman yang melewati batas diarahkan ke halaman terakhir yang valid setelah jumlah hasil diketahui. UI menampilkan rentang hasil, halaman aktif dengan `aria-current="page"`, tautan `rel="prev"`/`rel="next"`, dan kontrol batas yang dinonaktifkan. Saat halaman berubah, fokus dan posisi pembaca diarahkan ke daftar hasil, bukan dibiarkan di bagian atas halaman.

### Catatan dan pratinjau dokumen

Keterangan metodologis atau batasan di bagian bawah halaman harus menggunakan `PublicNote` agar tampil sebagai catatan sekunder. Komponen `PdfResourcePreview` dipakai bersama pada detail Dataset, Publikasi, dan Infografik. Pratinjau memuat PDF secara lazy, memiliki judul frame yang aksesibel, dan menyediakan tautan buka dokumen pada tab baru jika embed tidak didukung browser.

### Artikel unggulan pada layar kecil

Urutan visual artikel unggulan menggunakan kelas utility `order`: gambar tampil sebelum teks pada layar kecil, sementara urutan desktop tetap seperti desain editorial sebelumnya. Pertahankan hook class `public-news-feature-media` dan `public-news-feature-copy`; uji regresi memeriksa geometri pada mobile dan desktop.

### Aksesibilitas

Pemeriksaan dasar E2E browser ada di `tests/e2e/public-accessibility.spec.js`. Audit memeriksa landmark `main`, satu `h1`, label kontrol, nama aksesibel link/button, teks alternatif gambar, ID unik, dan skip-link melalui keyboard. Perubahan komponen interaktif wajib mempertahankan label, focus-visible, urutan tab, dan state yang dapat dipahami pembaca layar.

Untuk audit WCAG yang lebih lengkap, jalankan axe pada seluruh rute utama (termasuk detail konten) dan lakukan pemeriksaan manual keyboard-only, zoom 200%, kontras, reflow, serta screen reader. Pemeriksaan E2E dasar bukan sertifikasi WCAG.

### Performa dan Core Web Vitals

Smoke browser awal mengumpulkan LCP dan CLS serta menghitung resource JavaScript dari portal. Test ini adalah alarm regresi ringan, bukan pengganti pengukuran lapangan. Untuk rilis, jalankan Lighthouse pada build produksi dan catat LCP, INP, CLS, TTFB, ukuran JS, dan waterfall pada simulasi perangkat seluler dengan jaringan terbatas. Periksa pula cache API, paginasi backend, lazy loading gambar/PDF, dan layout shift dari font/media.

Target Core Web Vitals pada persentil ke-75:

| Metrik | Target baik | Makna                 |
| ------ | ----------: | --------------------- |
| LCP    | ≤ 2,5 detik | Konten utama terlihat |
| INP    |    ≤ 200 ms | Respons interaksi     |
| CLS    |       ≤ 0,1 | Stabilitas tata letak |

### Hasil audit performa FE, portal, dan CKAN

#### Perbaikan yang sudah diterapkan

- **Cache data di server:** pembacaan CKAN anonim yang aman memakai Next.js cache data selama 60 detik dengan tag `ckan-public` dan tag per action. Hook CKAN mengirim webhook HMAC setelah perubahan dataset, resource, organisasi, grup, Pages, atau proses pengindeksan; Next.js menginvalidasi tag sebelum pembacaan berikutnya. Jika webhook gagal, masa revalidasi 60 detik menjadi pemicu penyegaran berikutnya; sesuai mekanisme stale-while-revalidate Next.js, satu permintaan dapat menerima data lama ketika penyegaran berlangsung.
- **Batas keamanan cache:** permintaan yang membawa cookie CKAN, `include_private=true`, activity, dan metadata file tetap `no-store`. Kebijakan ini berlaku juga untuk action organisasi/grup apabila pemanggil meminta data privat. API HTTP publik tetap menerapkan kebijakan `no-store` tersendiri untuk action yang memerlukan pemeriksaan visibilitas.
- **Ringkasan beranda:** `organization_list` hanya meminta nama organisasi (`all_fields=false`) karena beranda hanya membutuhkan jumlahnya. Properti `package_count` tidak digunakan sebagai jumlah dataset umum. Metrik kedua beranda adalah **Kategori**, dihitung dari jumlah kelompok CKAN yang memiliki setidaknya satu dataset umum publik. Penghitung beranda tidak lagi menjalankan `resource_search` yang tidak relevan dengan label atau tujuan tautan.
- **Direktori kategori:** kartu metrik Kategori membuka `/kategori`, bukan katalog dataset umum secara langsung. Halaman ini menampilkan daftar kategori, jumlah dataset umum publik di setiap kategori, pencarian, pengurutan, dan paginasi. Setiap kategori mengarah ke `/dataset?kategori=<id>`. Halaman tersedia melalui kartu beranda dan tautan bagian kategori, tetapi sengaja tidak dimasukkan ke menu header utama. URL pencarian/pengurutan/paginasi diberi `noindex,follow` dan direktori kanonis masuk sitemap serta robots.
- **Facet OPD:** empat kategori dihitung melalui query terpisah dan setiap query hanya meminta facet organisasi. Ini menjaga ketepatan definisi dataset umum, indikator, infografik, dan publikasi; hasil facet dapat digunakan kembali dari cache. Daftar direktori tetap meminta properti organisasi karena kartu OPD membutuhkan nama, deskripsi, dan logo; pantau batas `ckan.group_and_organization_list_all_fields_max` (default CKAN 25) bila jumlah OPD bertambah.
- **Katalog indikator:** daftar tidak lagi membaca DataStore untuk setiap kartu. Nilai terbaru hanya diambil pada sorotan beranda yang dibatasi dan pada halaman detail indikator. Ini menghilangkan pola permintaan N+1 DataStore dari halaman daftar.
- **Pencarian:** jumlah token unik dibatasi 12, kolom pencarian memakai allowlist, dan parameter pengurutan menggunakan kontrak tetap. Token memang muncul berulang pada query Solr karena masing-masing dicoba pada beberapa field; batas 12 berlaku pada token unik, bukan jumlah kemunculan teks token pada query.
- **Build FE:** Docker memakai multi-stage build Next.js standalone, image runner terpisah, user non-root, kompresi respons, dan source map browser produksi dinonaktifkan.
- **LCP beranda:** foto hero dirender melalui `next/image` di HTML server, memakai `preload` native Next.js, ukuran responsif `100vw`, dan titik fokus terpisah untuk layar kecil. URL eksternal tetap melewati jalur `unoptimized` agar tidak membuka Image Optimizer ke host yang belum dimasukkan ke daftar izin.
- **PWA dan cache browser:** manifest, warna tema, dan ikon instalasi mengikuti satu konfigurasi situs. Service worker hanya didaftarkan di produksi; halaman navigasi selalu mengambil HTML terbaru dari jaringan, dengan `/offline.html` sebagai fallback saat offline. Cache v5 dibatasi pada ikon, chunk Next.js ber-hash yang ditandai `immutable`, dan daftar gambar publik berukuran kecil. Cache dibatasi 140 aset dan 2 MiB per aset; respons `private`/`no-store`, API, HTML, endpoint unduhan CKAN, serta unggahan editorial tidak pernah disimpan.
- **Pembaruan service worker:** pemanggilan `register()` dibiarkan memakai mekanisme pembaruan browser dan `updateViaCache: "none"`; aplikasi tidak memaksa pemanggilan `registration.update()` pada setiap kunjungan agar tidak menambah permintaan jaringan yang tidak perlu.

#### Area yang masih perlu dipantau

- **Hitungan resource:** metrik resource tidak ditampilkan pada ringkasan beranda karena tujuannya sebelumnya mengarah ke katalog dataset umum dan membingungkan pengunjung. Jangan menghidupkan kembali penghitung `resource_search` pada beranda tanpa label serta halaman tujuan yang secara khusus menjelaskan bahwa angka tersebut adalah jumlah berkas/resource, bukan jumlah dataset atau kategori.
- **Sitemap:** generator saat ini membaca katalog secara bertahap sampai batas 50.000 URL dan berjalan dinamis. Pada katalog besar, regenerasi sitemap dapat menjadi beban tersendiri. Langkah skala berikutnya adalah memecah sitemap per keluarga konten atau memakai `generateSitemaps()` dan mengukur waktu respons tiap bagian.
- **Gambar CMS/CKAN:** beberapa gambar dinamis menggunakan `unoptimized` untuk menghindari pengambilan gambar dari domain yang belum masuk daftar izin oleh Image Optimizer. Konsekuensinya, Next.js tidak membuat varian ukuran/format otomatis; gambar besar dapat meningkatkan transfer bytes dan LCP. Solusi yang aman adalah normalisasi ukuran/WebP saat unggah atau proxy gambar origin yang sama dengan allowlist, bukan membuka optimizer ke semua host.
- **DataStore:** detail indikator membatasi pembacaan hingga 1.000 observasi terbaru/terurut. Ini cukup untuk grafik ringkasan, tetapi bukan mekanisme ekspor seluruh data. Untuk tabel yang tumbuh sangat besar, gunakan paginasi/keyset di backend daripada terus memperbesar `limit` atau `offset`.
- **Invalidasi CKAN:** webhook invalidasi dipanggil sinkron dari hook CKAN dengan timeout 1,5 detik dan kegagalannya tidak membatalkan penyimpanan. Bila waktu simpan CKAN menjadi lambat, ukur durasi hook dan pertimbangkan antrean asynchronous yang tetap memiliki retry serta TTL fallback.
- **Kapasitas backend:** berkas Compose override mendefinisikan healthcheck dan restart policy untuk Next.js/worker, tetapi belum menetapkan batas CPU, memori, atau PID. Batas kapasitas yang tepat tidak dapat ditentukan dari source saja; ukur pemakaian VPS, PostgreSQL, Solr, Redis/RQ, XLoader, dan CKAN pada beban nyata sebelum menetapkan limit.

#### Cara mengukur sebelum dan sesudah rilis

1. Buat build produksi, lalu jalankan Lighthouse pada beranda, katalog Dataset, katalog Statistik, detail Dataset, detail OPD, dan detail Publikasi menggunakan profil perangkat seluler. Simpan LCP, INP, CLS, TTFB, ukuran transfer, dan jumlah permintaan.
2. Jalankan pengukuran dengan cache dingin dan hangat. Catat p50/p95 TTFB dan durasi action CKAN (`package_search`, `resource_search`, `organization_list`, `datastore_search`) secara terpisah.
3. Pada VPS, catat CPU/RAM per container, restart/OOM, latensi PostgreSQL, durasi/slow query Solr, antrean Redis/RQ, serta waktu XLoader. Uji dengan trafik yang mendekati jam sibuk.
4. Bandingkan hasil sebelum dan sesudah dengan dataset dan kondisi jaringan yang sama. Jangan menyimpulkan peningkatan Core Web Vitals hanya dari pemeriksaan source atau unit test.

Target Core Web Vitals pada persentil ke-75: LCP ≤ 2,5 detik, INP ≤ 200 ms, dan CLS ≤ 0,1. Ini adalah ambang kategori “baik” menurut Google, bukan hasil pengukuran portal. Belum ada hasil Lighthouse produksi atau metrik lapangan pada audit source ini; angka aktual harus diisi setelah pengukuran runtime. Rujukan: [Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals), [Next.js revalidateTag](https://nextjs.org/docs/app/api-reference/functions/revalidateTag), [Next.js Image](https://nextjs.org/docs/app/api-reference/components/image), dan [CKAN DataStore paginasi](https://docs.ckan.org/en/2.12/maintaining/datastore.html).

### Analitik penerbitan OPD pada Admin CKAN

Dashboard Portal Admin menampilkan peringkat penerbitan organisasi dari empat facet (dimensi agregasi) CKAN yang terpisah: dataset umum, indikator, infografik, dan publikasi. Data tidak memakai `organization.package_count`, karena field tersebut menghitung paket lintas tipe. Panel ini hanya tersedia bila keempat query facet berhasil; kegagalan satu sumber tidak disamarkan sebagai nol. Query mengatur `include_private=false`, sehingga angka merepresentasikan konten publik saja dan dapat dibandingkan dengan katalog publik. Filter per tipe dibuat saling eksklusif; entri dengan penanda kategori yang saling bertentangan tidak dihitung ganda.

Perhitungan murni diuji di `scripts/test-publisher-analytics.py`, dengan fixture OPD yang memiliki satu infografik tetapi nol dataset umum.

### Perintah perapian dan pemeriksaan

```bash
npm ci
npm run format:write
npm run lint:fix
npm run check
npm run test
npm run test:e2e
npm run build
```

`npm run fix` menjalankan perapian format lalu perbaikan otomatis ESLint. `npm run check` tetap menjadi quality gate utama (static checks dan ESLint). `npm run test:e2e` memerlukan browser Playwright yang sudah dipasang. Jalankan `npm run format:check` pada CI bila ingin memastikan file sudah diformat tanpa mengubah source.

### Promosi pemasangan PWA

Promosi PWA berada di `PublicLayout`, bukan root layout, sehingga tidak tampil pada CKAN Admin atau shell autentikasi. Bentuknya kartu kecil yang dapat ditutup; tidak ada dialog otomatis.

- Baru memenuhi syarat setelah kunjungan kedua pada sesi yang berbeda dan tiga path publik unik dibuka. Maksimum satu tawaran per sesi.
- Tutup manual menyembunyikan promosi 14 hari; penolakan prompt native 30 hari. Mode standalone atau event `appinstalled` menghentikan promosi. Status interaksi hanya disimpan di penyimpanan browser.
- Chromium memakai `beforeinstallprompt` setelah klik pengguna. iOS mengarahkan ke Add to Home Screen melalui Safari; Android dan desktop mendapat panduan menu browser yang sesuai. Browser tanpa jalur instalasi yang andal tidak diberi janji instalasi.
- Komponen tidak mengambil fokus otomatis, memiliki nama aksesibel, menghormati area aman layar/reduced gerak, dan disembunyikan saat pengguna mengisi form, membuka dialog, mengunduh, atau membuka tab baru.
- Tidak ada API web universal untuk mendeteksi status instalasi pada semua browser; deteksi memakai `display-mode`, `navigator.standalone`, dan `appinstalled` bila tersedia.

Pemeriksaan regresi: `node scripts/check-pwa.mjs`, `node scripts/test-service-worker.mjs`, unit test `tests/unit/pwa-install-promotion.test.js`, dan E2E `tests/e2e/public-performance.spec.js`.
