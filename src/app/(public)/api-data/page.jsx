import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Braces,
  Code2,
  ShieldCheck,
} from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/ui/code-block";
import { publicNavigation } from "@/lib/public-navigation";
import {
  getCanonicalMetadata,
  getSocialMetadata,
  siteConfig,
} from "@/lib/site-config";

const apiOrigin = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://data.wajokab.go.id"
).replace(/\/$/, "");
const basePath = "/api/3/action";
const examples = {
  search: `curl -sS '${apiOrigin}${basePath}/package_search?q=pendidikan&rows=20&start=0'`,
  detail: `curl -sS '${apiOrigin}${basePath}/package_show?id=nama-dataset'`,
  organizations: `curl -sS '${apiOrigin}${basePath}/organization_list?all_fields=true&limit=1000'`,
  activities: `curl -sS '${apiOrigin}${basePath}/package_activity_list?id=nama-dataset&limit=8&offset=0'`,
  datastore: `curl -sS '${apiOrigin}${basePath}/datastore_search?resource_id=RESOURCE_ID&limit=10&offset=0'`,
  facets: `curl -sS '${apiOrigin}${basePath}/package_search?q=%2A%3A%2A&rows=0&facets=true'`,
  harvest: `curl -sS '${apiOrigin}${basePath}/package_search?rows=100&start=0&sort=id%20asc'`,
  harvestIncremental: `curl -sS '${apiOrigin}${basePath}/package_search?rows=100&start=0&sort=id%20asc&fq=metadata_modified%3A%5B2026-01-01T00%3A00%3A00Z%20TO%20*%5D'`,
};

export const metadata = {
  title: "API data terbuka",
  description: `Dokumentasi lengkap API publik berbasis CKAN Action API 2.12 untuk ${siteConfig.regionName}.`,
  ...getCanonicalMetadata("/api-data"),
  ...getSocialMetadata({
    path: "/api-data",
    title: `Dokumentasi API | ${siteConfig.shortName}`,
    description: `Endpoint, parameter, batas akses, contoh request, dan skema respons API data terbuka ${siteConfig.regionName}.`,
  }),
};

const endpoints = [
  {
    name: "status_show",
    label: "Periksa apakah API aktif",
    tryExample: "",
    params: "Tidak ada",
    description: "Memeriksa status dasar instance CKAN.",
    example: `${basePath}/status_show`,
  },
  {
    name: "package_search",
    label: "Cari dataset berdasarkan kata kunci",
    tryExample: "?q=pendidikan&rows=5",
    params: "q, rows, start, facets, sort, fq (terbatas)",
    description:
      "Mencari dataset publik. q menerima teks/frasa biasa (maksimum 160 karakter). Untuk harvesting CKAN, sort menerima beberapa urutan yang diizinkan dan fq terbatas pada filter instansi, topik, serta perubahan metadata. Sintaks Solr bebas ditolak. rows 0–100 (default 20), start 0–1.000.000 (default 0), facets true/false (default false).",
    example: `${basePath}/package_search?q=pendidikan&rows=20&start=0`,
  },
  {
    name: "package_show",
    label: "Baca seluruh metadata satu dataset",
    params: "id (wajib)",
    description:
      "Mengambil objek Package/dataset native CKAN berdasarkan nama atau ID. Parameter lain ditolak.",
    example: `${basePath}/package_show?id=nama-dataset`,
  },
  {
    name: "package_activity_list",
    label: "Lihat riwayat perubahan dataset",
    params: "id (wajib), limit, offset",
    description:
      "Mengambil riwayat aktivitas dataset yang sudah dipastikan publik. limit default 8 (maksimum 31), offset default 0. Facade selalu memaksa include_hidden_activity=false dan menghapus identitas pengguna serta snapshot data internal.",
    example: `${basePath}/package_activity_list?id=nama-dataset&limit=8&offset=0`,
  },
  {
    name: "organization_list",
    label: "Lihat daftar instansi/perangkat daerah",
    tryExample: "?all_fields=true&limit=20",
    params: "all_fields, include_dataset_count, limit",
    description:
      "Mengambil daftar organisasi. Kedua flag menerima boolean; default true. limit 0–1.000, default 1.000. Field pengguna dan extras tetap tidak disertakan.",
    example: `${basePath}/organization_list?all_fields=true&limit=1000`,
  },
  {
    name: "organization_show",
    label: "Baca profil satu instansi",
    params: "id (wajib)",
    description:
      "Mengambil detail organisasi dengan hitungan dataset bila didukung; pengguna dan extras tidak disertakan.",
    example: `${basePath}/organization_show?id=dinas-pendidikan`,
  },
  {
    name: "group_list",
    label: "Lihat daftar topik/kategori",
    tryExample: "?all_fields=true",
    params: "all_fields",
    description:
      "Mengambil daftar grup/topik CKAN. all_fields menerima boolean dan default true.",
    example: `${basePath}/group_list?all_fields=true`,
  },
  {
    name: "group_show",
    label: "Baca detail satu topik",
    params: "id (wajib)",
    description:
      "Mengambil detail satu grup/topik CKAN berdasarkan nama atau ID.",
    example: `${basePath}/group_show?id=pendidikan`,
  },
  {
    name: "tag_list",
    label: "Cari kata kunci yang dipakai pada dataset",
    tryExample: "?query=pendidikan&all_fields=false",
    params: "query, all_fields",
    description:
      "Mencari tag CKAN berdasarkan query opsional. all_fields menerima boolean dan default false.",
    example: `${basePath}/tag_list?query=pendidikan&all_fields=false`,
  },
  {
    name: "resource_show",
    label: "Baca informasi satu berkas/resource",
    params: "id (wajib)",
    description:
      "Mengambil metadata native Resource CKAN berdasarkan ID resource.",
    example: `${basePath}/resource_show?id=RESOURCE_ID`,
  },
  {
    name: "file_show",
    label: "Baca metadata file CKAN 2.12",
    params: "id (wajib)",
    description:
      "Mengambil metadata entitas File di CKAN 2.12. Ini bukan endpoint untuk mengunduh isi file; izin tetap ditegakkan oleh CKAN.",
    example: `${basePath}/file_show?id=FILE_ID`,
  },
  {
    name: "datastore_search",
    label: "Ambil baris dari tabel data",
    params: "resource_id (wajib), limit, offset",
    description:
      "Mengambil baris DataStore. limit 0–100 (default 10), offset 0–100.000 (default 0). Parameter q, filters, sort, dan fields sengaja tidak diekspos.",
    example: `${basePath}/datastore_search?resource_id=RESOURCE_ID&limit=10&offset=0`,
  },
];

const nav = [
  ["ringkasan", "Ringkasan"],
  ["respons", "Format respons"],
  ["endpoint", "Daftar alamat API"],
  ["contoh", "Contoh request"],
  ["data", "Struktur data"],
  ["publikasi", "Menerbitkan konten"],
  ["batas", "Batas akses & keamanan"],
];

function ApiSection({ id, number, title, description, children }) {
  return (
    <section
      id={id}
      className="scroll-mt-28 border-b border-line py-8 first:pt-0 last:border-b-0 sm:py-10"
      aria-labelledby={`${id}-title`}
    >
      <div className="mb-5 flex items-start gap-3 sm:gap-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-xs font-bold text-primary">
          {number}
        </span>
        <div className="min-w-0">
          <h2
            id={`${id}-title`}
            className="text-xl font-semibold tracking-tight text-ink sm:text-2xl"
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="space-y-4 pl-0 sm:pl-[3.25rem]">{children}</div>
    </section>
  );
}

function Field({ name, value }) {
  return (
    <div className="grid gap-1 border-b border-line/70 py-3 last:border-b-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
      <dt className="font-mono text-xs font-semibold text-primary">{name}</dt>
      <dd className="min-w-0 break-words text-sm leading-6 text-muted">
        {value}
      </dd>
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#edf4f6_0%,#fff_22rem)]">
      <div className="page-container py-8 sm:py-12 lg:py-14">
        <PageHeading
          eyebrow="Integrasi untuk pengembang"
          title="API data terbuka"
          description={`Akses katalog data publik ${siteConfig.regionName} melalui API read-only berbasis CKAN Action API 2.12. Gunakan respons JSON native untuk mengintegrasikan dataset ke aplikasi, analisis, atau visualisasi Anda.`}
          className="mb-7 border-0 pb-0 sm:mb-9"
        />

        <Card
          as="section"
          className="mb-6 rounded-2xl p-5 shadow-subtle sm:p-7"
          aria-labelledby="api-quickstart-title"
        >
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
              Panduan singkat penggunaan API
            </p>
            <h2
              id="api-quickstart-title"
              className="mt-2 text-xl font-semibold tracking-tight text-ink sm:text-2xl"
            >
              API membantu aplikasi mengambil data secara otomatis
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted sm:text-base">
              Anggap katalog dataset sebagai tempat penyimpanan data. API
              menyediakan alamat untuk meminta daftar dataset, rincian dataset,
              atau isi tabel. Anda dapat membuka contoh alamat di browser untuk
              melihat hasilnya dalam format JSON, yaitu format data terstruktur
              yang umum digunakan aplikasi.
            </p>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <Card as="article" className="rounded-xl border-0 bg-canvas p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">
                Langkah 1
              </p>
              <h3 className="mt-2 text-sm font-semibold text-ink">
                Pilih data yang dibutuhkan
              </h3>
              <p className="mt-1 text-sm leading-5 text-muted">
                Apakah Anda ingin mencari dataset, melihat perangkat daerah,
                atau membaca isi tabel?
              </p>
            </Card>
            <Card as="article" className="rounded-xl border-0 bg-canvas p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">
                Langkah 2
              </p>
              <h3 className="mt-2 text-sm font-semibold text-ink">
                Buka alamat API
              </h3>
              <p className="mt-1 text-sm leading-5 text-muted">
                Buka salah satu contoh alamat API di bawah. Data yang tersedia
                untuk umum dapat diakses tanpa kunci API.
              </p>
            </Card>
            <Card as="article" className="rounded-xl border-0 bg-canvas p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">
                Langkah 3
              </p>
              <h3 className="mt-2 text-sm font-semibold text-ink">
                Gunakan hasilnya
              </h3>
              <p className="mt-1 text-sm leading-5 text-muted">
                Data utama berada pada bagian `result`. Jika `success` bernilai
                `false`, baca keterangan pada bagian `error`.
              </p>
            </Card>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              href={`${apiOrigin}${basePath}/package_search?q=pendidikan&rows=5`}
              target="_blank"
              rel="noopener noreferrer"
              variant="primary"
            >
              Coba pencarian contoh{" "}
              <ArrowUpRight size={15} aria-hidden="true" />
            </Button>
            <Button
              href={`${apiOrigin}${basePath}/status_show`}
              target="_blank"
              rel="noopener noreferrer"
              variant="outline"
            >
              Cek status API <ArrowUpRight size={15} aria-hidden="true" />
            </Button>
            <Button href="/dataset" variant="ghost">
              Cari dataset di portal{" "}
              <ArrowUpRight size={15} aria-hidden="true" />
            </Button>
          </div>
        </Card>

        <section
          id="ringkasan"
          className="scroll-mt-28 grid gap-3 sm:grid-cols-3"
          aria-label="Ringkasan API"
        >
          <Card className="flex gap-3 rounded-2xl p-4 shadow-subtle sm:p-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
              <ShieldCheck size={20} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold">Hanya baca</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                API ini hanya menyediakan akses untuk membaca data.
              </p>
            </div>
          </Card>
          <Card className="flex gap-3 rounded-2xl p-4 shadow-subtle sm:p-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-700">
              <Braces size={20} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold">JSON native CKAN</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Menggunakan struktur data asli CKAN.
              </p>
            </div>
          </Card>
          <Card className="flex gap-3 rounded-2xl p-4 shadow-subtle sm:p-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700">
              <Code2 size={20} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold">Tanpa kunci API</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Untuk data publik; aturan akses sumber data tetap berlaku.
              </p>
            </div>
          </Card>
        </section>

        <nav
          aria-label="Navigasi dokumentasi API pada layar kecil"
          className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:hidden"
        >
          {nav.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="shrink-0 rounded-full border border-line bg-white px-3 py-2 text-xs font-semibold text-muted"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="mt-6 grid min-w-0 gap-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
          <aside className="hidden lg:block">
            <nav
              aria-label="Navigasi dokumentasi API"
              className="sticky top-24 rounded-2xl border border-line bg-white p-4"
            >
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-muted">
                Pada halaman ini
              </p>
              <ul className="space-y-1">
                {nav.map(([id, label]) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      className="block rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-accent hover:text-primary"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
              <Link
                href="https://docs.ckan.org/en/2.12/api/index.html"
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex items-center gap-2 border-t border-line pt-4 text-xs font-semibold text-primary hover:underline"
              >
                Dokumentasi CKAN <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            </nav>
          </aside>

          <div className="min-w-0 rounded-2xl border border-line bg-white px-5 py-7 shadow-[0_8px_32px_rgb(15_35_50_/_0.04)] sm:px-8 sm:py-9">
            <ApiSection
              id="respons"
              number="01"
              title="Alamat dasar dan format respons"
              description="Semua permintaan menggunakan HTTPS dan alamat dasar yang sama dengan portal."
            >
              <Card as="div" className="rounded-xl bg-canvas p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  Base URL
                </p>
                <code className="break-all text-sm font-semibold text-ink">
                  {apiOrigin}
                  {basePath}
                </code>
              </Card>
              <p className="text-sm leading-6 text-muted">
                Setiap response sukses memakai HTTP 200 dan bentuk envelope
                CKAN. Isi{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                  result
                </code>{" "}
                berbeda sesuai action yang dipanggil.
              </p>
              <CodeBlock>{`{
  "help": "https://docs.ckan.org/en/2.12/api/index.html#...",
  "success": true,
  "result": { "...": "objek native CKAN" }
}`}</CodeBlock>
              <p className="text-sm leading-6 text-muted">
                Response gagal menggunakan{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                  success: false
                </code>{" "}
                dengan detail di dalam{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                  error.message
                </code>{" "}
                dan{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                  error.__type
                </code>
                .
              </p>
              <CodeBlock>{`{
  "help": "https://docs.ckan.org/en/2.12/api/index.html#...",
  "success": false,
  "error": {
    "message": "Parameter 'q' tidak tersedia pada API publik.",
    "__type": "Validation Error"
  }
}`}</CodeBlock>
            </ApiSection>

            <ApiSection
              id="endpoint"
              number="02"
              title="Daftar alamat API"
              description="Semua alamat API menggunakan metode GET untuk membaca data. Hanya parameter yang tercantum pada dokumentasi yang dapat digunakan. Parameter yang sama tidak boleh ditulis lebih dari sekali."
            >
              <div className="space-y-3">
                {endpoints.map((endpoint) => (
                  <Card
                    as="article"
                    key={endpoint.name}
                    className="min-w-0 rounded-xl p-4 transition-colors hover:border-slate-300 sm:p-5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="success"
                        className="rounded-md px-2 py-1 text-[0.68rem] font-extrabold tracking-wide"
                      >
                        GET
                      </Badge>
                      <code className="break-all text-sm font-bold text-ink">
                        /{endpoint.name}
                      </code>
                    </div>
                    <h3 className="mt-3 text-base font-semibold leading-6 text-ink">
                      {endpoint.label}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      {endpoint.description}
                    </p>
                    <Card
                      as="dl"
                      className="mt-3 grid gap-1 rounded-lg bg-canvas px-3 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-3"
                    >
                      <dt className="py-2 text-xs font-semibold text-muted">
                        Parameter
                      </dt>
                      <dd className="break-words py-2 font-mono text-xs text-ink">
                        {endpoint.params}
                      </dd>
                    </Card>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <p className="min-w-0 break-all font-mono text-xs leading-5 text-primary">
                        {endpoint.example}
                      </p>
                      {endpoint.tryExample !== undefined ? (
                        <Button
                          href={`${apiOrigin}${basePath}/${endpoint.name}${endpoint.tryExample}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="outline"
                          size="sm"
                        >
                          Coba di browser{" "}
                          <ArrowUpRight size={13} aria-hidden="true" />
                        </Button>
                      ) : (
                        <span className="text-xs leading-5 text-muted">
                          Perlu ID dari dataset/resource
                        </span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </ApiSection>

            <ApiSection
              id="contoh"
              number="03"
              title="Contoh request"
              description="Contoh dapat dijalankan dari terminal. Ganti nama dataset, ID resource, dan query sesuai kebutuhan; request akan mengembalikan JSON."
            >
              <div className="space-y-5">
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Cari dataset</h3>
                  <CodeBlock>{examples.search}</CodeBlock>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold">
                    Ambil metadata lengkap
                  </h3>
                  <CodeBlock>{examples.detail}</CodeBlock>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold">
                    Baca data tabular dengan pagination
                  </h3>
                  <CodeBlock>{examples.datastore}</CodeBlock>
                  <p className="mt-2 text-xs leading-5 text-muted">
                    Naikkan offset untuk halaman berikutnya. API membatasi satu
                    request hingga 100 baris.
                  </p>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold">
                    Ambil daftar organisasi
                  </h3>
                  <CodeBlock>{examples.organizations}</CodeBlock>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold">
                    Ambil facet untuk filter
                  </h3>
                  <CodeBlock>{examples.facets}</CodeBlock>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold">
                    Ambil riwayat aktivitas
                  </h3>
                  <CodeBlock>{examples.activities}</CodeBlock>
                </div>
                <Card
                  as="section"
                  className="rounded-xl border-sky-200 bg-sky-50 p-4 text-sky-950 sm:p-5"
                >
                  <h3 className="font-semibold text-sky-950">
                    Integrasi katalog otomatis (harvesting)
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-sky-950">
                    Jika katalog Wajo akan diambil oleh portal data lain,
                    gunakan <code>https://data.wajokab.go.id</code> sebagai
                    alamat sumber CKAN, bukan hostname admin. API publik
                    mendukung paginasi berukuran 100, urutan stabil{" "}
                    <code>id asc</code>, dan filter perubahan metadata yang
                    dibatasi. Tidak perlu API key untuk metadata publik.
                    Kesesuaian akhir tetap perlu diuji dengan konfigurasi
                    harvester tujuan.
                  </p>
                  <div className="mt-4 space-y-3">
                    <div>
                      <p className="mb-2 text-xs font-semibold text-sky-950">
                        Daftar dataset untuk sinkronisasi awal
                      </p>
                      <CodeBlock className="bg-sky-950">
                        {examples.harvest}
                      </CodeBlock>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-semibold text-sky-950">
                        Contoh filter perubahan metadata
                      </p>
                      <CodeBlock className="bg-sky-950">
                        {examples.harvestIncremental}
                      </CodeBlock>
                      <p className="mt-2 text-xs leading-5 text-sky-950">
                        Ganti tanggal contoh dengan waktu UTC dari sinkronisasi
                        terakhir yang berhasil. Simpan checkpoint tersebut di
                        sisi harvester; tanggal statis hanya cocok untuk uji
                        coba awal.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </ApiSection>

            <ApiSection
              id="data"
              number="04"
              title="Struktur data native CKAN"
              description="Objek mengikuti struktur yang didefinisikan CKAN. Field tertentu dapat kosong, tidak ada, atau berbeda sesuai metadata yang dimasukkan oleh pengelola."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Card as="article" className="p-4">
                  <h3 className="font-semibold text-ink">Dataset</h3>
                  <p className="mt-1 text-sm leading-5 text-muted">
                    Satu kumpulan informasi tentang suatu topik, misalnya jumlah
                    sekolah per kecamatan.
                  </p>
                </Card>
                <Card as="article" className="p-4">
                  <h3 className="font-semibold text-ink">Resource</h3>
                  <p className="mt-1 text-sm leading-5 text-muted">
                    Berkas atau tabel di dalam dataset, misalnya CSV, XLSX, PDF,
                    GeoJSON, atau tabel DataStore.
                  </p>
                </Card>
                <Card as="article" className="p-4">
                  <h3 className="font-semibold text-ink">ID</h3>
                  <p className="mt-1 text-sm leading-5 text-muted">
                    Kode unik yang menunjuk dataset, resource, atau instansi.
                    Untuk membaca isi tabel, gunakan ID resource, bukan ID
                    dataset.
                  </p>
                </Card>
                <Card as="article" className="p-4">
                  <h3 className="font-semibold text-ink">DataStore</h3>
                  <p className="mt-1 text-sm leading-5 text-muted">
                    Penyimpanan tabel yang dapat dibaca per halaman melalui API.
                    Resource harus diaktifkan pada DataStore terlebih dahulu.
                  </p>
                </Card>
              </div>
              <Card as="div" className="rounded-xl px-4">
                <dl>
                  <Field
                    name="Package / dataset"
                    value="id, name, title, notes, metadata_created, metadata_modified, license_id, license_title, organization, groups, tags, extras, resources, state."
                  />
                  <Field
                    name="Resource"
                    value="id, package_id, name, description, format, mimetype, url, size, datastore_active, state, serta metadata tambahan jika tersedia."
                  />
                  <Field
                    name="Organization"
                    value="id, name, title, description, image_url, state, dan dataset_count jika didukung oleh CKAN."
                  />
                  <Field
                    name="DataStore"
                    value="records, fields, total, offset dan informasi resource lain yang dikembalikan oleh action CKAN. Field persis bergantung pada tabel resource."
                  />
                </dl>
              </Card>
              <p className="text-sm leading-6 text-muted">
                API tidak menjanjikan entitas indikator, observasi, versi
                publikasi, registri SDI, maupun manifest GeoPortal sebagai objek
                inti. Halaman khusus portal merakit tampilan tersebut dari
                dataset, tag, metadata ekstra, dan resource DataStore CKAN.
              </p>
            </ApiSection>

            <ApiSection
              id="publikasi"
              number="05"
              title="Panduan publikasi konten"
              description="Data yang tampil pada halaman khusus portal dikelola melalui Portal Pengelola. Portal menggunakan satu sumber data agar informasi tetap konsisten."
            >
              <div className="space-y-4">
                <Card
                  as="section"
                  id="indikator"
                  className="scroll-mt-28 rounded-xl p-4 sm:p-5"
                >
                  <h3 className="font-semibold">Indikator statistik</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Terbitkan dataset publik, pilih tipe{" "}
                    <strong>Indikator statistik</strong>, tambahkan tag{" "}
                    <code>portal-indikator</code>, lalu aktifkan DataStore untuk
                    resource tabular dengan kolom <code>period</code> dan{" "}
                    <code>value</code>. Kolom <code>region</code>,{" "}
                    <code>unit</code>, dan <code>source</code> disarankan.
                    Metadata yang dapat diisi mencakup <code>portal_unit</code>,{" "}
                    <code>portal_periodicity</code>,{" "}
                    <code>portal_definition</code>, <code>portal_formula</code>,{" "}
                    <code>portal_source</code>, <code>portal_geography</code>,
                    dan <code>portal_reference_period</code>.
                  </p>
                </Card>
                <Card
                  as="section"
                  id="infografik"
                  className="scroll-mt-28 rounded-xl p-4 sm:p-5"
                >
                  <h3 className="font-semibold">Infografik</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Pilih tipe <strong>Infografik</strong>, tambahkan tag{" "}
                    <code>portal-infografik</code>, unggah resource gambar atau
                    PDF, dan lengkapi metadata seperti{" "}
                    <code>portal_category</code>, <code>portal_period</code>,{" "}
                    <code>portal_attribution</code>, serta{" "}
                    <code>portal_reference_period</code>.
                  </p>
                </Card>
                <Card
                  as="section"
                  id="publikasi-detail"
                  className="scroll-mt-28 rounded-xl p-4 sm:p-5"
                >
                  <h3 className="font-semibold">Publikasi & laporan</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Pilih tipe <strong>Publikasi/laporan</strong>, tambahkan tag{" "}
                    <code>portal-publikasi</code>, unggah dokumen publik, dan
                    isi metadata yang relevan:{" "}
                    <code>portal_reference_period</code>,{" "}
                    <code>portal_publication_date</code>,{" "}
                    <code>portal_version</code>,{" "}
                    <code>portal_revision_note</code>,{" "}
                    <code>portal_methodology</code>, dan atribusi penerbit.
                  </p>
                </Card>
              </div>
            </ApiSection>

            <ApiSection
              id="batas"
              number="06"
              title="Batas akses, cache & keamanan"
              description="API ini adalah antarmuka publik terbatas, bukan proxy generik ke seluruh CKAN Action API."
            >
              <Card
                as="aside"
                className="rounded-xl border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"
              >
                <p className="font-semibold">Tidak untuk operasi tulis</p>
                <p className="mt-1">
                  Action membuat, mengubah, menghapus, mengunggah, dan mengelola
                  pengguna tidak tersedia. Gunakan CKAN Admin yang dilindungi
                  autentikasi untuk pekerjaan pengelolaan.
                </p>
              </Card>
              <Card as="div" className="rounded-xl px-4">
                <dl>
                  <Field
                    name="HTTP"
                    value="GET, HEAD, dan OPTIONS diizinkan untuk action publik. Request mutasi dan action yang tidak dikenal ditolak."
                  />
                  <Field
                    name="HTTP error"
                    value="400 untuk parameter/validasi; 403 untuk akses yang ditolak; 404 untuk action atau objek yang tidak ditemukan; 502 jika upstream CKAN tidak tersedia atau gagal."
                  />
                  <Field
                    name="Limit"
                    value="package_search rows maksimum 100 dan start maksimum 1.000.000; DataStore limit maksimum 100 dan offset maksimum 100.000; organization_list maksimum 1.000."
                  />
                  <Field
                    name="Cache"
                    value="status_show, package_search, daftar/detail organisasi/topik, dan tag dapat memakai shared cache singkat sebagai fallback (s-maxage 5 detik; stale-while-revalidate 5 detik). package_show, package_activity_list, resource_show, file_show, datastore_search, dan semua respons error memakai Cache-Control: no-store."
                  />
                  <Field
                    name="CORS"
                    value="Origin hanya diizinkan bila sama persis dengan PUBLIC_SITE_ORIGIN. Pemakaian same-origin tidak memerlukan konfigurasi CORS tambahan."
                  />
                  <Field
                    name="Indexing"
                    value="Response API menambahkan X-Robots-Tag: noindex, nofollow, noarchive dan X-Content-Type-Options: nosniff."
                  />
                  <Field
                    name="Data privat"
                    value="Pencarian memaksa include_private=false. Resource privat atau nonaktif disaring dari respons publik; activity tidak menyertakan identitas pengguna dan snapshot perubahan. Permission dan visibilitas CKAN tetap menjadi sumber otoritatif."
                  />
                </dl>
              </Card>
              <p className="text-sm leading-6 text-muted">
                Jangan mengekspos port PostgreSQL, Solr, Redis, maupun port
                internal CKAN ke internet. Host admin harus tetap terpisah dan
                dilindungi login CKAN serta satu gerbang perimeter: Basic Auth
                pada mode basic_auth, atau Cloudflare Access pada mode
                cloudflare_access. Jangan menumpuk Basic Auth di depan
                Cloudflare Access jika tujuan Anda mengurangi prompt login.
              </p>
              <Button
                href="https://docs.ckan.org/en/2.12/api/index.html"
                target="_blank"
                rel="noopener noreferrer"
                variant="link"
                size="sm"
              >
                Baca dokumentasi resmi CKAN 2.12{" "}
                <BookOpen size={15} aria-hidden="true" />
              </Button>
            </ApiSection>

            <section
              className="mt-8 border-t border-line pt-7"
              aria-labelledby="api-related-pages-title"
            >
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="eyebrow">Jelajahi portal</p>
                  <h2
                    id="api-related-pages-title"
                    className="mt-1 text-lg font-semibold text-ink"
                  >
                    Laman lain yang mungkin Anda perlukan
                  </h2>
                </div>
                <p className="max-w-xl text-sm leading-6 text-muted">
                  Temukan data melalui antarmuka publik, atau pelajari
                  organisasi dan konten yang diterbitkan.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {publicNavigation
                  .filter((item) => item.href !== "/api-data")
                  .map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="group flex min-w-0 items-center gap-3 rounded-xl border border-line bg-surface p-3.5 transition-colors hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-canvas text-primary group-hover:bg-white">
                          <Icon size={17} aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1 text-sm font-semibold text-ink">
                          {item.label}
                        </span>
                        <ArrowUpRight
                          size={15}
                          className="shrink-0 text-muted transition group-hover:text-primary"
                          aria-hidden="true"
                        />
                      </Link>
                    );
                  })}
              </div>
            </section>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-canvas p-4 sm:p-5">
              <div>
                <p className="text-sm font-semibold">
                  Mulai dari katalog publik
                </p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Temukan dataset dan salin identifier yang dibutuhkan untuk
                  request API.
                </p>
              </div>
              <Button href="/dataset" variant="primary">
                Buka katalog <ArrowUpRight size={15} aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
