# Akses dan Unduhan Dataset Privat melalui Next.js

Terakhir ditinjau: 1 November 2026.

CKAN adalah otoritas tunggal untuk otorisasi. Browser hanya meneruskan cookie sesi Flask CKAN yang dikonfigurasi ke Next.js; Next.js meneruskan cookie itu ke layanan CKAN internal. Keberadaan cookie tidak otomatis memberi izin. CKAN harus mengembalikan hasil `package_show` atau `package_search` yang berhasil untuk sesi tersebut sebelum dataset privat dapat ditampilkan.

## Model otorisasi

Pada CKAN 2.12, otorisasi `resource_show` di core mendelegasikan pemeriksaan ke `package_show` milik dataset induk. Pemeriksaan itu bukan ACL privat terpisah pada setiap resource. Karena itu, marker kustom `resource.private` tidak dapat dianggap sah hanya dengan memanggil `resource_show` sekali lagi.

Portal menerapkan prinsip _fail closed_ untuk marker kustom/lama yang bernilai benar pada `resource.private` dan `file.private`, meskipun cookie sesi tersedia. Normalisasi `isPrivateMarker` menangani bentuk boolean, numerik, dan string (`true`, `1`, `yes`, `on`, `private`) tanpa menganggap string `false` sebagai nilai privat. Marker tersebut disembunyikan dari respons detail/pencarian package.

Jika privasi per-resource benar-benar dibutuhkan, implementasikan field skema resource dan otorisasi eksplisit melalui `IAuthFunctions` untuk `resource_show`, DataStore, view, preview, dan unduhan. Portal baru boleh mengikuti permission tersebut setelah implementasi CKAN tersedia dan diuji.

## Jalur unduhan

### Unduhan native dataset/resource

1. Next.js hanya membaca cookie `wajo_ckan_session` yang dikonfigurasi dari request masuk.
2. Next.js memanggil CKAN `resource_show` dan memvalidasi ID resource, status aktif, serta `resource.package_id`.
3. Next.js memanggil `package_show` dengan sesi yang sama dan memvalidasi package induk serta slug/ID yang diminta. Dataset privat hanya diterima jika CKAN mengizinkannya untuk sesi tersebut.
4. Path URL resource divalidasi terhadap pola unduhan dataset/resource CKAN. Host dari URL asli tidak pernah di-fetch; path tervalidasi diminta melalui `CKAN_API_INTERNAL_URL`.
5. Endpoint unduhan native CKAN melakukan pemeriksaan permission terakhir. Respons 401/403/404 dinormalisasi menjadi 404; kegagalan upstream yang tidak terduga tetap menjadi 502.

Array `package_show.result.resources` adalah metadata, bukan gerbang otorisasi tambahan. Jika ringkasan resource tidak disertakan, hal itu tidak boleh menghasilkan 404 palsu setelah CKAN mengizinkan resource dan dataset induknya.

### Unduhan FileStore umum

1. Next.js memanggil `file_show` dan hanya menerima metadata owner eksplisit bertipe `resource` atau `package`.
2. File milik resource harus cocok dengan ID resource yang diminta; file milik package harus cocok dengan ID package induk. Owner yang tidak dikenal, kosong, atau bertipe editorial-media/user/group/organization ditolak pada proxy dataset umum.
3. Pemeriksaan `resource_show`/`package_show` menentukan akses ke dataset pemilik. Konfigurasi penerapan menetapkan `ckan.files.owner.cascade_access` untuk `resource` dan `package`, sehingga otorisasi FileStore mengikuti hak akses entitas CKAN terkait. `file_show` saja tidak pernah dianggap bukti izin unduh.
4. Next.js meminta `/file/download/<id>` dari CKAN dengan cookie sesi yang sama. CKAN melakukan pemeriksaan akhir `permission_download_file`. Respons 401/403/404/410 dinormalisasi menjadi 404.

Proxy media editorial terpisah dan memakai owner tetap, pemeriksaan MIME, batas byte, serta signature gambar. Hook `IFiles` Wajo hanya memberi akses `show` publik kepada owner `wajo_media/public-editorial-media`; hook tersebut tidak memberi izin tulis/hapus dan tidak melonggarkan akses owner resource/package.

## Persyaratan sesi dan domain

Browser dapat mengirim cookie sesi CKAN ke Admin dan portal hanya jika `PUBLIC_HOST` serta `CKAN_HOST` merupakan subdomain dalam domain registrable yang sama dan cookie dikonfigurasi untuk domain induk tersebut. Contoh yang sesuai: `data.silirdev.com` dan `ckan.silirdev.com`. Contoh yang tidak sesuai: `data.silirdev.com` dan `ckan.wajokab.go.id`.

Setelah mengubah domain cookie atau hostname, buat ulang container CKAN dan Next.js, logout dari Admin CKAN, lalu login kembali. Pada DevTools → Network, pastikan request portal menyertakan nama cookie `wajo_ckan_session`; jangan menyalin atau membagikan nilainya. `sync-env.py` sengaja menolak domain induk yang tidak cocok.

Cookie domain induk dikirim ke semua subdomain pada domain tersebut. Semua subdomain harus dipercaya dan dikelola dengan kontrol keamanan setara. Portal hanya meneruskan cookie sesi CKAN yang dikonfigurasi ke origin CKAN internal; cookie browser lain, API token, dan nilai sesi tidak diteruskan ke origin eksternal.

## Cakupan pengujian regresi

Unit test mencakup:

- Sesi CKAN yang berhak dapat membaca/mengunduh dataset privat saat `package_show` mengizinkannya.
- Sesi anonim atau tidak valid tidak dapat membaca dataset privat.
- Resource tetap dapat diunduh saat `package_show.resources` tidak menyertakan ringkasan resource, selama CKAN telah mengizinkan dataset induk.
- Marker `resource.private` kustom ditolak walaupun cookie tersedia.
- Owner FileStore harus tepat `resource` atau `package` dengan ID owner yang cocok.
- Respons akhir FileStore 401/403/404/410 dinormalisasi menjadi 404.
- Marker privat berbentuk string diproses secara aman; string `false` tidak keliru dianggap privat.
- Respons byte unduhan menggunakan `private, no-store`, termasuk berkas publik, agar cache CDN/browser lama tidak menyajikan salinan setelah visibilitas diubah.

Nilai cookie tidak pernah dicatat ke log.

## Pemeriksaan setelah penerapan

1. Pastikan `PUBLIC_HOST` dan `CKAN_HOST` adalah subdomain dalam domain induk yang sama.
2. Logout lalu login kembali ke Admin CKAN setelah konfigurasi cookie berubah.
3. Di DevTools → Network, periksa bahwa request unduhan portal membawa **nama** cookie yang dikonfigurasi. Jangan membagikan nilainya.
4. Uji dataset yang boleh dibaca admin, dataset yang tidak boleh dibaca akun tersebut, dan request tanpa sesi.
5. Uji unduhan FileStore secara terpisah karena `permission_download_file` dapat menolak unduhan meskipun `file_show` berhasil.

Jangan mengubah dataset privat menjadi publik sebagai jalan pintas untuk mengatasi masalah sesi atau domain.
