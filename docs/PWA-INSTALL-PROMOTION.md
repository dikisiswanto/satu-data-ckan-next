# Soft PWA install promotion

Promosi pemasangan PWA ditempatkan di `PublicLayout`, bukan root layout, sehingga tidak pernah tampil pada CKAN Admin atau shell autentikasi. Komponen tidak menampilkan dialog otomatis; promosi berupa kartu kecil yang dapat ditutup dan baru memenuhi syarat setelah engagement minimum.

## Aturan tampil

- Minimal kunjungan kedua pada tab/session berbeda.
- Minimal tiga path publik unik telah dibuka secara kumulatif. Query-string tidak dihitung sebagai halaman baru.
- Maksimum satu penawaran dalam satu session browser.
- Tutup manual menyembunyikan promosi selama 14 hari.
- Penolakan prompt native menyembunyikan promosi selama 30 hari.
- Aplikasi yang berjalan dalam mode standalone atau memicu `appinstalled` tidak lagi dipromosikan.
- State engagement dan snooze hanya disimpan di local/session storage browser; tidak ada analytics atau identitas pengguna yang dikirim ke server.

## Browser behavior

- Chromium yang mengirim `beforeinstallprompt`: event ditahan dan prompt hanya dibuka setelah pengguna menekan tombol pemasangan.
- iPhone/iPad: instruksi Add to Home Screen melalui menu Bagikan; bila opsi tidak tersedia pada browser yang digunakan, buka portal melalui Safari.
- Android: instruksi menu browser untuk Install app atau Add to Home Screen bila prompt native tidak tersedia.
- Chrome/Edge desktop: ikon Install pada address bar atau menu browser.
- Safari macOS 17+: File → Add to Dock.
- Browser yang tidak memiliki jalur instalasi yang dapat diandalkan tidak diberi promosi yang menjanjikan instalasi.

`beforeinstallprompt` bukan API lintas-browser, sehingga tidak digunakan sebagai satu-satunya jalur. Pengecekan instalasi bersifat best-effort: `display-mode: standalone`, `navigator.standalone`, dan event `appinstalled` digunakan ketika browser menyediakannya. Tidak ada API web universal untuk mendeteksi seluruh status instalasi pada semua browser/platform.

## Interaction and accessibility

Promosi disembunyikan ketika pengguna mulai berinteraksi dengan input/form, membuka dialog, mengunduh berkas, atau membuka tautan pada tab baru. Komponen tidak mengambil fokus secara otomatis, tombol memiliki nama aksesibel, konten panduan dapat diperluas, kartu menghormati safe-area mobile dan reduced-motion, serta tinggi kartu dibatasi agar tetap dapat discroll pada viewport pendek.

## Validation

- `node scripts/check-pwa.mjs` memvalidasi pemasangan komponen hanya pada public layout, engagement, lifecycle, platform guidance, dan CSS responsif.
- `tests/unit/pwa-install-promotion.test.js` menguji penghitungan engagement, state storage, platform detection, dan panduan.
- `tests/e2e/public-performance.spec.js` menguji threshold engagement, snooze, dan kondisi installed.
