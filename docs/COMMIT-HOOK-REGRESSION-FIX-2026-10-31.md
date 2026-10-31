# Perbaikan kegagalan pre-commit — 31 Oktober 2026

## 1. `no-unused-vars` pada `wajo-admin-forms.js`

`buildPortalTypeContext` dan `updatePortalTypeContext` tidak membutuhkan elemen control sebagai argumen. Parameter tersebut dihapus dari kedua signature dan dari pemanggilan fungsi. Perilaku pembentukan panel panduan dan pembaruan teks/tag tetap sama karena elemen panel dicari melalui `fieldWrapper("portal_type")`.

## 2. `react-hooks/set-state-in-effect` pada `geojson-resource-preview.jsx`

Effect yang hanya menjalankan `setFailedTileCount(0)` ketika URL berubah dihapus. Jumlah kegagalan ubin peta sekarang disimpan bersama URL asalnya. Render hanya menampilkan hitungan jika URL tersebut sama dengan URL resource aktif. Event `onError` yang datang terlambat dari URL sebelumnya tidak menambah hitungan resource baru.

## Validasi

- `bash scripts/check-static.sh` — lulus setelah perubahan.
- `node --check deploy/ckan/theme/ckanext/wajo_theme/public/wajo-admin-forms.js` — lulus.
- `node scripts/check-admin-forms.mjs` — lulus.
- `node scripts/check-geojson-component.mjs` — menjadi guard baru untuk kedua regresi.
- ESLint penuh dan lint-staged belum dijalankan di lingkungan ini karena dependency npm tidak tersedia secara lokal dan registry sebelumnya tidak dapat di-resolve (`EAI_AGAIN`). Jalankan `npm run check` atau ulangi `git commit` di lingkungan lokal setelah dependency tersedia.
