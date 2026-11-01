# Kualitas FE Publik: Navigasi, Aksesibilitas, dan Performa

Dokumen ini adalah panduan kanonis untuk menjaga pengalaman portal publik Next.js. Untuk perubahan katalog dan sumber data, gunakan [kontrak API publik](API.md), [pratinjau DataStore](PRATINJAU-DATASTORE-DAN-SINKRONISASI.md), dan [pratinjau media](PRATINJAU-MEDIA-DAN-KATALOG.md). Untuk proses penerapan, lihat [panduan operasi CKAN](../deploy/ckan/README.md).

## Pagination katalog

Katalog Dataset, Statistik/Indikator, Infografik, dan Publikasi memakai `PublicPagination` bersama. Parameter halaman dinormalisasi ke bilangan bulat positif. Permintaan halaman yang melewati batas diarahkan ke halaman terakhir yang valid setelah jumlah hasil diketahui. UI menampilkan rentang hasil, halaman aktif dengan `aria-current="page"`, tautan `rel="prev"`/`rel="next"`, dan kontrol batas yang dinonaktifkan. Saat halaman berubah, fokus dan posisi pembaca diarahkan ke daftar hasil, bukan dibiarkan di bagian atas halaman.

## Catatan dan pratinjau dokumen

Keterangan metodologis atau batasan di bagian bawah halaman harus menggunakan `PublicNote` agar tampil sebagai catatan sekunder. Komponen `PdfResourcePreview` dipakai bersama pada detail Dataset, Publikasi, dan Infografik. Pratinjau memuat PDF secara lazy, memiliki judul frame yang aksesibel, dan menyediakan tautan buka dokumen pada tab baru jika embed tidak didukung browser.

## Artikel unggulan pada layar kecil

Urutan visual artikel unggulan menggunakan kelas utility `order`: gambar tampil sebelum teks pada layar kecil, sementara urutan desktop tetap seperti desain editorial sebelumnya. Pertahankan hook class `public-news-feature-media` dan `public-news-feature-copy`; uji regresi memeriksa geometri pada mobile dan desktop.

## Aksesibilitas

Pemeriksaan dasar E2E browser ada di `tests/e2e/public-accessibility.spec.js`. Audit memeriksa landmark `main`, satu `h1`, label kontrol, nama aksesibel link/button, teks alternatif gambar, ID unik, dan skip-link melalui keyboard. Perubahan komponen interaktif wajib mempertahankan label, focus-visible, urutan tab, dan state yang dapat dipahami pembaca layar.

Untuk audit WCAG yang lebih lengkap, jalankan axe pada seluruh rute utama (termasuk detail konten) dan lakukan pemeriksaan manual keyboard-only, zoom 200%, kontras, reflow, serta screen reader. Pemeriksaan E2E dasar bukan sertifikasi WCAG.

## Performa dan Core Web Vitals

Smoke browser awal mengumpulkan LCP dan CLS serta menghitung resource JavaScript first-party. Test ini adalah alarm regresi ringan, bukan pengganti pengukuran lapangan. Untuk rilis, jalankan Lighthouse pada production build dan catat LCP, INP, CLS, TTFB, ukuran JS, dan waterfall pada mobile throttling. Periksa pula cache API, pagination backend, lazy loading gambar/PDF, dan layout shift dari font/media.

Target Core Web Vitals pada persentil ke-75:

| Metrik | Target baik | Makna                 |
| ------ | ----------: | --------------------- |
| LCP    | ≤ 2,5 detik | Konten utama terlihat |
| INP    |    ≤ 200 ms | Respons interaksi     |
| CLS    |       ≤ 0,1 | Stabilitas tata letak |

## Hasil audit performa FE, portal, dan CKAN

### Perbaikan yang sudah diterapkan

- **Cache data server:** pembacaan CKAN anonim yang aman memakai Next.js Data Cache selama 60 detik dengan tag `ckan-public` dan tag per action. Hook CKAN mengirim webhook HMAC setelah perubahan dataset, resource, organisasi, grup, Pages, atau proses indexing; Next.js menginvalidasi tag sebelum pembacaan berikutnya. Jika webhook gagal, masa revalidasi 60 detik menjadi pemicu penyegaran berikutnya; sesuai mekanisme stale-while-revalidate Next.js, satu request dapat menerima data lama ketika penyegaran berlangsung.
- **Batas keamanan cache:** request dengan cookie CKAN, `include_private=true`, activity, dan metadata file tetap `no-store`. Kebijakan ini berlaku juga untuk action organisasi/grup apabila pemanggil meminta data privat. Facade HTTP publik tetap menerapkan kebijakan `no-store` tersendiri untuk action yang memerlukan pemeriksaan visibilitas.
- **Ringkasan beranda:** `organization_list` hanya meminta nama organisasi (`all_fields=false`) karena beranda hanya membutuhkan jumlahnya. Field `package_count` tidak digunakan sebagai jumlah dataset umum. Metrik kedua beranda adalah **Kategori**, dihitung dari jumlah kelompok CKAN yang memiliki setidaknya satu dataset umum publik. Penghitung beranda tidak lagi menjalankan `resource_search` yang tidak relevan dengan label atau tujuan tautan.
- **Direktori kategori:** kartu metrik Kategori membuka `/kategori`, bukan katalog dataset umum secara langsung. Halaman ini menampilkan daftar kategori, jumlah dataset umum publik di setiap kategori, pencarian, pengurutan, dan pagination. Setiap kategori mengarah ke `/dataset?kategori=<id>`. Halaman tersedia melalui kartu beranda dan tautan bagian kategori, tetapi sengaja tidak dimasukkan ke menu header utama. URL pencarian/pengurutan/pagination diberi `noindex,follow` dan direktori kanonis masuk sitemap serta robots.
- **Facet OPD:** empat kategori dihitung melalui query terpisah dan setiap query hanya meminta facet organisasi. Ini menjaga ketepatan definisi dataset umum, indikator, infografik, dan publikasi; hasil facet dapat digunakan kembali dari cache. Daftar direktori tetap meminta field organisasi karena kartu OPD membutuhkan nama, deskripsi, dan logo; pantau batas `ckan.group_and_organization_list_all_fields_max` (default CKAN 25) bila jumlah OPD bertambah.
- **Katalog indikator:** daftar tidak lagi membaca DataStore untuk setiap kartu. Nilai terbaru hanya diambil pada highlight beranda yang dibatasi dan pada halaman detail indikator. Ini menghilangkan pola N+1 request DataStore dari halaman daftar.
- **Pencarian:** jumlah token unik dibatasi 12, field pencarian memakai allowlist, dan parameter pengurutan menggunakan kontrak tetap. Token memang muncul berulang pada query Solr karena masing-masing dicoba pada beberapa field; batas 12 berlaku pada token unik, bukan jumlah kemunculan teks token pada query.
- **Build FE:** Docker memakai multi-stage build Next.js standalone, image runner terpisah, user non-root, kompresi respons, dan source map browser produksi dinonaktifkan.

### Area yang masih perlu dipantau

- **Hitungan resource:** metrik resource tidak ditampilkan pada ringkasan beranda karena tujuannya sebelumnya mengarah ke katalog dataset umum dan membingungkan pengunjung. Jangan menghidupkan kembali penghitung `resource_search` pada beranda tanpa label serta halaman tujuan yang secara khusus menjelaskan bahwa angka tersebut adalah jumlah berkas/resource, bukan jumlah dataset atau kategori.
- **Sitemap:** generator saat ini membaca katalog secara bertahap sampai batas 50.000 URL dan berjalan dinamis. Pada katalog besar, regenerasi sitemap dapat menjadi beban tersendiri. Langkah skala berikutnya adalah memecah sitemap per keluarga konten atau memakai `generateSitemaps()` dan mengukur waktu respons tiap bagian.
- **Gambar CMS/CKAN:** beberapa gambar dinamis memakai `unoptimized` untuk menghindari pengambilan gambar dari domain pengguna yang tidak di-allowlist oleh Image Optimizer. Konsekuensinya, Next.js tidak membuat varian ukuran/format otomatis; gambar besar dapat meningkatkan transfer bytes dan LCP. Solusi yang aman adalah normalisasi ukuran/WebP saat upload atau proxy gambar same-origin dengan allowlist, bukan membuka optimizer ke semua host.
- **DataStore:** detail indikator membatasi pembacaan hingga 1.000 observasi terbaru/terurut. Ini cukup untuk grafik ringkasan, tetapi bukan mekanisme ekspor seluruh data. Untuk tabel yang tumbuh sangat besar, gunakan pagination/keyset di backend daripada terus memperbesar `limit` atau `offset`.
- **Invalidasi CKAN:** webhook invalidasi dipanggil sinkron dari hook CKAN dengan timeout 1,5 detik dan kegagalannya tidak membatalkan penyimpanan. Bila waktu simpan CKAN menjadi lambat, ukur durasi hook dan pertimbangkan antrean asynchronous yang tetap memiliki retry serta TTL fallback.
- **Kapasitas backend:** berkas Compose override mendefinisikan healthcheck dan restart policy untuk Next.js/worker, tetapi belum menetapkan batas CPU, memori, atau PID. Batas kapasitas yang tepat tidak dapat ditentukan dari source saja; ukur pemakaian VPS, PostgreSQL, Solr, Redis/RQ, XLoader, dan CKAN pada beban nyata sebelum menetapkan limit.

### Cara mengukur sebelum dan sesudah rilis

1. Buat production build, lalu jalankan Lighthouse pada beranda, katalog Dataset, katalog Statistik, detail Dataset, detail OPD, dan detail Publikasi menggunakan profil mobile. Simpan LCP, INP, CLS, TTFB, ukuran transfer, dan jumlah request.
2. Jalankan pengukuran dengan cache dingin dan hangat. Catat p50/p95 TTFB dan durasi action CKAN (`package_search`, `resource_search`, `organization_list`, `datastore_search`) secara terpisah.
3. Pada VPS, catat CPU/RAM per container, restart/OOM, latensi PostgreSQL, durasi/slow query Solr, antrean Redis/RQ, serta waktu XLoader. Uji dengan trafik yang mendekati jam sibuk.
4. Bandingkan hasil sebelum/sesudah dengan dataset dan kondisi jaringan yang sama. Jangan menyimpulkan peningkatan Core Web Vitals hanya dari pemeriksaan source atau unit test.

Target Core Web Vitals pada persentil ke-75: LCP ≤ 2,5 detik, INP ≤ 200 ms, dan CLS ≤ 0,1. Ini adalah ambang kategori “baik” menurut Google, bukan hasil pengukuran portal. Belum ada hasil Lighthouse produksi atau metrik lapangan pada audit source ini; angka aktual harus diisi setelah pengukuran runtime. Rujukan: [Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals), [Next.js revalidateTag](https://nextjs.org/docs/app/api-reference/functions/revalidateTag), [Next.js Image](https://nextjs.org/docs/app/api-reference/components/image), dan [CKAN DataStore pagination](https://docs.ckan.org/en/2.12/maintaining/datastore.html).

## Analitik penerbitan OPD pada Admin CKAN

Dashboard Wajo Admin menampilkan peringkat penerbitan organisasi dari empat facet CKAN yang terpisah: dataset umum, indikator, infografik, dan publikasi. Data tidak memakai `organization.package_count`, karena field tersebut menghitung paket lintas tipe. Panel ini hanya tersedia bila keempat query facet berhasil; kegagalan satu sumber tidak disamarkan sebagai nol. Query mengatur `include_private=false`, sehingga angka merepresentasikan konten publik saja dan dapat dibandingkan dengan katalog publik. Filter per tipe dibuat saling eksklusif; item dengan marker kategori yang saling bertentangan tidak dihitung ganda.

Perhitungan murni diuji di `scripts/test-publisher-analytics.py`, dengan fixture OPD yang memiliki satu infografik tetapi nol dataset umum.

## Perintah perapian dan pemeriksaan

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
