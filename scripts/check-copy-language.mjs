import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!existsSync(absolutePath)) {
    errors.push(
      `Berkas untuk pemeriksaan wording tidak ditemukan: ${relativePath}`,
    );
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

function requireText(source, text, message) {
  if (!source.includes(text)) errors.push(message);
}

function forbidText(source, text, message) {
  if (source.toLowerCase().includes(text.toLowerCase())) errors.push(message);
}

const docs = [
  "README.md",
  ...[
    "ADMIN-CKAN-DAN-CMS.md",
    "API.md",
    "DATASTORE-DAN-AKSES.md",
    "DESAIN-DAN-KUALITAS-FRONTEND.md",
    "OPERASIONAL-DEPLOYMENT.md",
  ].map((name) => `docs/${name}`),
];
const docText = docs.map(read).join("\n");

for (const malformed of [
  "informulirasi",
  "formulirulir",
  "formulirat",
  "package_riwayat aktivitas_list",
  "db upgrade -p riwayat aktivitas",
  "resource_koloms",
  "check-admin-formulirs.mjs",
  "Access-Control-Permintaan-Method",
  "Access-Control-Permintaan-Headers",
  "x-permintaaned-with",
  "API publik publik",
  "CKAN layanan CKAN",
  "sinkronisasi katalog (sinkronisasi katalog",
]) {
  forbidText(
    docText,
    malformed,
    `Istilah atau identifier rusak masih ditemukan dalam dokumentasi: ${malformed}`,
  );
}

const apiDocs = read("docs/API.md");
requireText(
  apiDocs,
  "Untuk pengembang dan integrator",
  "Dokumentasi API harus menyebut sasaran pengembang dan integrator.",
);
requireText(
  apiDocs,
  "pengembang aplikasi, integrator sistem",
  "Dokumentasi API harus menjelaskan pembacanya secara eksplisit.",
);
forbidText(
  apiDocs,
  "tanpa harus menjadi developer",
  "Dokumentasi API masih memakai deskripsi sasaran pembaca yang keliru.",
);
requireText(
  apiDocs,
  "package_activity_list",
  "Dokumentasi API harus menyertakan action riwayat aktivitas yang didukung.",
);

const adminDocs = read("docs/ADMIN-CKAN-DAN-CMS.md");
requireText(
  adminDocs,
  "resource_fields",
  "Panduan admin harus menyebut schema resource_fields yang benar.",
);
requireText(
  adminDocs,
  "node scripts/check-admin-forms.mjs",
  "Panduan admin harus menunjuk pemeriksaan formulir yang benar.",
);

const datastoreDocs = read("docs/DATASTORE-DAN-AKSES.md");
requireText(
  datastoreDocs,
  "`package_activity_list`",
  "Panduan DataStore harus memakai nama action CKAN yang valid.",
);
requireText(
  datastoreDocs,
  "`db upgrade -p activity`",
  "Panduan DataStore harus memakai nama migrasi Activity yang valid.",
);
requireText(
  datastoreDocs,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "Panduan DataStore harus mempertahankan MIME type XLSX yang benar.",
);

const operationsDocs = read("docs/OPERASIONAL-DEPLOYMENT.md");
requireText(
  operationsDocs,
  "Access-Control-Request-Method: GET",
  "Contoh preflight CORS harus memakai header standar Access-Control-Request-Method.",
);
requireText(
  operationsDocs,
  "Access-Control-Request-Headers: x-requested-with",
  "Contoh preflight CORS harus mempertahankan nama header standar.",
);

const instanceDocs = read("docs/ADMIN-CKAN-DAN-CMS.md");
requireText(
  instanceDocs,
  "PORTAL_HERO_MAP_IMAGE",
  "Panduan konfigurasi instansi harus mencakup aset peta hero.",
);

const designDocs = read("docs/DESAIN-DAN-KUALITAS-FRONTEND.md");
requireText(
  designDocs,
  "empat kartu statistik",
  "Panduan desain harus menggambarkan empat kartu statistik hero yang diterapkan.",
);
requireText(
  designDocs,
  "Empat kartu metrik",
  "Panduan desain harus menjelaskan posisi dan fungsi kartu metrik hero.",
);
requireText(
  designDocs,
  "rasio kontras teks minimal 4.5:1",
  "Panduan desain harus mencantumkan batas kontras kartu hero.",
);

const navigation = read("src/lib/public-navigation.js");
const pageCopy = read("src/lib/public-copy.js");
const breadcrumbs = read("src/components/public-breadcrumbs.jsx");
const infographicPage = read("src/app/(public)/infografik/page.jsx");
const homePage = read("src/app/(public)/page.jsx");
const lightbox = read("src/components/ui/image-lightbox.jsx");
const translations = read(
  "deploy/ckan/theme/ckanext/portal_theme/i18n/id/LC_MESSAGES/ckan.po",
);

requireText(
  navigation,
  'label: "Infografik"',
  "Navigasi publik harus menggunakan istilah Infografik.",
);
requireText(
  pageCopy,
  'title: "Infografik"',
  "Judul katalog publik harus menggunakan istilah Infografik.",
);
requireText(
  breadcrumbs,
  'infografik: { label: "Infografik"',
  "Breadcrumb katalog harus menggunakan istilah Infografik.",
);
requireText(
  infographicPage,
  'title: "Infografik"',
  "Metadata/judul katalog harus menggunakan istilah Infografik.",
);
requireText(
  translations,
  'msgid "Infographic"\nmsgstr "Infografik"',
  "Terjemahan CKAN untuk Infographic harus konsisten menjadi Infografik.",
);
requireText(
  translations,
  'msgid "Infographics"\nmsgstr "Infografik"',
  "Terjemahan CKAN untuk Infographics harus konsisten menjadi Infografik.",
);
requireText(
  navigation,
  'href: "/infografik"',
  "Perubahan istilah tidak boleh mengubah rute teknis /infografik.",
);
requireText(
  pageCopy,
  "infografik: Object.freeze",
  "Kunci internal konten infografik tidak boleh diubah.",
);
requireText(
  homePage,
  "Dataset publik",
  "Label metrik dataset pada beranda harus jelas sebagai data publik.",
);
requireText(
  homePage,
  "Perangkat daerah",
  "Label metrik organisasi pada beranda harus mengikuti istilah portal.",
);
requireText(
  breadcrumbs,
  'aria-label="Navigasi halaman"',
  "Navigasi breadcrumb harus memiliki nama aksesibel berbahasa Indonesia.",
);
requireText(
  lightbox,
  "Gunakan roda mouse atau cubit untuk memperbesar tampilan",
  "Petunjuk lightbox harus memakai wording yang mudah dipahami.",
);
requireText(
  lightbox,
  "Tekan Esc untuk menutup",
  "Petunjuk menutup lightbox harus menggunakan kalimat instruksi yang jelas.",
);

const additionalUiSources = [
  "src/components/organization-directory.jsx",
  "src/app/(public)/kategori/page.jsx",
  "src/app/(public)/organisasi/[slug]/page.jsx",
  "src/app/(public)/api-data/page.jsx",
  "deploy/ckan/theme/ckanext/portal_theme/public/portal-admin-forms.js",
  "deploy/ckan/theme/ckanext/portal_theme/templates/portal_theme/context_help.html",
  "deploy/ckan/theme/ckanext/portal_theme/templates/portal_theme/sidebar.html",
  "deploy/ckan/theme/ckanext/portal_theme/templates/portal_theme/dashboard.html",
  "deploy/ckan/theme/ckanext/portal_theme/schemas/dataset.yaml",
  "deploy/ckan/theme/ckanext/portal_theme/schemas/group.yaml",
  "tests/e2e/public-portal.spec.js",
].map(read);
const userFacingSources = [
  navigation,
  pageCopy,
  breadcrumbs,
  infographicPage,
  homePage,
  lightbox,
  translations,
  docText,
  ...additionalUiSources,
].join("\n");
forbidText(
  userFacingSources,
  "Infografis",
  "Istilah pada dokumentasi, portal publik, Portal Admin, dan pengujian tampilan harus menggunakan bentuk Infografik.",
);

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

process.stdout.write(
  `Pemeriksaan wording lulus: ${docs.length} dokumen dan istilah UI utama sudah konsisten.\n`,
);
