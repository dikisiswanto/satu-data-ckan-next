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

const apiOrigin = (siteConfig.publicSiteUrl || "").replace(/\/$/, "");
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
  title: `API Data Terbuka | ${siteConfig.shortName}`,
  description: `Pelajari cara mencari dataset, membaca metadata, dan mengambil data tabel ${siteConfig.regionName} melalui API publik. Tersedia daftar endpoint, parameter, contoh, dan batas akses.`,
  ...getCanonicalMetadata("/api-data"),
  ...getSocialMetadata({
    path: "/api-data",
    title: `API Data Terbuka | ${siteConfig.shortName}`,
    description: `Panduan integrasi data ${siteConfig.regionName}: endpoint, parameter, contoh permintaan, struktur JSON, dan aturan akses.`,
  }),
};

const endpoints = [
  {
    name: "status_show",
    label: "Periksa status layanan",
    tryExample: "",
    params: "Tidak ada",
    description:
      "Memeriksa apakah layanan CKAN merespons dan mengembalikan informasi status dasar. Endpoint ini tidak memerlukan parameter.",
    example: `${basePath}/status_show`,
  },
  {
    name: "package_search",
    label: "Cari dataset berdasarkan kata kunci",
    tryExample: "?q=pendidikan&rows=5",
    params: "q, rows, start, facets, sort, fq (terbatas)",
    description:
      "Mencari dataset dengan kata atau frasa pada parameter q (maksimal 160 karakter). Gunakan *:* untuk mencari seluruh katalog; sintaks Solr/Lucene lainnya tidak didukung. rows menentukan jumlah hasil (default 20, maksimal 100), sedangkan start menentukan posisi awal (default 0, maksimal 1.000.000). facets=true menambahkan ringkasan nilai filter. Untuk sinkronisasi katalog, sort hanya menerima id, name, atau metadata_modified dengan urutan asc/desc. Filter fq hanya menerima organisasi, topik, dan rentang perubahan metadata.",
    example: `${basePath}/package_search?q=pendidikan&rows=20&start=0`,
  },
  {
    name: "package_show",
    label: "Ambil metadata satu dataset",
    params: "id (wajib)",
    description:
      "Mengambil metadata dataset berdasarkan nama unik (slug) atau ID. Informasi resource yang privat atau tidak aktif tidak disertakan. Parameter lain ditolak.",
    example: `${basePath}/package_show?id=nama-dataset`,
  },
  {
    name: "package_activity_list",
    label: "Lihat riwayat perubahan dataset",
    params: "id (wajib), limit, offset",
    description:
      "Mengambil riwayat perubahan dataset yang dapat diakses oleh pemanggil. limit menentukan jumlah catatan (default 8, maksimal 31), sedangkan offset menentukan posisi awal (default 0, maksimal 100.000). Aktivitas tersembunyi, identitas pengguna, dan snapshot internal tidak disertakan.",
    example: `${basePath}/package_activity_list?id=nama-dataset&limit=8&offset=0`,
  },
  {
    name: "organization_list",
    label: "Lihat daftar organisasi penerbit data",
    tryExample: "?all_fields=true&limit=20",
    params: "all_fields, include_dataset_count, limit",
    description:
      "Mengambil daftar organisasi yang menerbitkan dataset. all_fields dan include_dataset_count menerima true/false (default true). limit menentukan jumlah organisasi yang diminta (default dan maksimum 1.000). Informasi akun pengguna dan extras tidak disertakan.",
    example: `${basePath}/organization_list?all_fields=true&limit=1000`,
  },
  {
    name: "organization_show",
    label: "Baca profil satu organisasi",
    params: "id (wajib)",
    description:
      "Mengambil metadata satu organisasi berdasarkan nama unik (slug) atau ID. Daftar dataset tertanam, informasi akun pengguna, dan extras tidak disertakan.",
    example: `${basePath}/organization_show?id=dinas-pendidikan`,
  },
  {
    name: "group_list",
    label: "Lihat daftar topik dan kategori",
    tryExample: "?all_fields=true",
    params: "all_fields",
    description:
      "Mengambil daftar topik atau kategori yang digunakan untuk mengelompokkan dataset. all_fields menerima true/false dan bernilai true secara default.",
    example: `${basePath}/group_list?all_fields=true`,
  },
  {
    name: "group_show",
    label: "Baca detail satu topik",
    params: "id (wajib)",
    description:
      "Mengambil metadata satu topik atau kategori berdasarkan nama unik (slug) atau ID.",
    example: `${basePath}/group_show?id=pendidikan`,
  },
  {
    name: "tag_list",
    label: "Temukan kata kunci dataset",
    tryExample: "?query=pendidikan&all_fields=false",
    params: "query, all_fields",
    description:
      "Mengambil kata kunci (tag) yang sesuai dengan query bila diisi. all_fields menerima true/false dan bernilai false secara default.",
    example: `${basePath}/tag_list?query=pendidikan&all_fields=false`,
  },
  {
    name: "resource_show",
    label: "Baca metadata satu resource",
    params: "id (wajib)",
    description:
      "Mengambil informasi tentang satu berkas, tautan, atau tabel di dalam dataset berdasarkan ID resource. Akses tetap mengikuti izin dataset induknya.",
    example: `${basePath}/resource_show?id=RESOURCE_ID`,
  },
  {
    name: "file_show",
    label: "Baca metadata objek file",
    params: "id (wajib)",
    description:
      "Mengambil metadata objek berkas yang dikelola CKAN 2.12. Endpoint ini tidak mengunduh isi berkas. Izin akses diperiksa oleh CKAN berdasarkan pemilik berkas serta resource atau dataset terkait.",
    example: `${basePath}/file_show?id=FILE_ID`,
  },
  {
    name: "datastore_search",
    label: "Baca isi tabel data",
    params: "resource_id (wajib), limit, offset",
    description:
      "Mengambil baris dari resource tabel yang sudah diaktifkan di DataStore. limit menentukan jumlah baris (default 10, maksimal 100), sedangkan offset menentukan posisi awal (default 0, maksimal 100.000). Filter, pengurutan, dan pemilihan kolom lanjutan belum didukung oleh API publik.",
    example: `${basePath}/datastore_search?resource_id=RESOURCE_ID&limit=10&offset=0`,
  },
];

const nav = [
  ["ringkasan", "Mulai cepat"],
  ["respons", "Alamat dan respons"],
  ["endpoint", "Endpoint"],
  ["contoh", "Contoh penggunaan"],
  ["data", "Struktur data"],
  ["publikasi", "Konten khusus portal"],
  ["batas", "Akses dan keamanan"],
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
          eyebrow="Integrasi dan pemanfaatan data"
          title="API Data Terbuka"
          description={`Temukan dataset, baca metadata, dan ambil isi tabel ${siteConfig.regionName} melalui API publik. Hasil dikirim dalam format JSON dengan struktur CKAN, sehingga dapat digunakan oleh aplikasi, analisis, dan visualisasi.`}
          className="mb-7 border-0 pb-0 sm:mb-9"
        />

        <Card
          as="section"
          className="mb-6 rounded-2xl p-5 shadow-subtle sm:p-7"
          aria-labelledby="api-quickstart-title"
        >
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
              Mulai menggunakan API
            </p>
            <h2
              id="api-quickstart-title"
              className="mt-2 text-xl font-semibold tracking-tight text-ink sm:text-2xl"
            >
              Hubungkan aplikasi Anda ke data terbuka
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted sm:text-base">
              API adalah cara bagi aplikasi untuk meminta data dari portal. Anda
              dapat menggunakannya untuk mencari dataset, membaca detail,
              melihat organisasi penerbit, atau mengambil baris dari tabel.
              Hasilnya dikirim sebagai JSON, yaitu format data terstruktur yang
              mudah dibaca dan diproses oleh aplikasi.
            </p>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <Card as="article" className="rounded-xl border-0 bg-canvas p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">
                Langkah 1
              </p>
              <h3 className="mt-2 text-sm font-semibold text-ink">
                Tentukan informasi yang dibutuhkan
              </h3>
              <p className="mt-1 text-sm leading-5 text-muted">
                Cari dataset, baca metadata, lihat organisasi penerbit, atau
                ambil isi tabel yang tersedia.
              </p>
            </Card>
            <Card as="article" className="rounded-xl border-0 bg-canvas p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">
                Langkah 2
              </p>
              <h3 className="mt-2 text-sm font-semibold text-ink">
                Kirim permintaan
              </h3>
              <p className="mt-1 text-sm leading-5 text-muted">
                Buka tautan contoh di halaman ini atau kirim permintaan GET dari
                aplikasi Anda. Anda dapat mencoba endpoint data publik tanpa API
                key.
              </p>
            </Card>
            <Card as="article" className="rounded-xl border-0 bg-canvas p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">
                Langkah 3
              </p>
              <h3 className="mt-2 text-sm font-semibold text-ink">
                Olah hasil JSON
              </h3>
              <p className="mt-1 text-sm leading-5 text-muted">
                Periksa nilai <code>success</code>. Jika bernilai{" "}
                <code>true</code>, data berada di <code>result</code>. Jika{" "}
                bernilai <code>false</code>, baca pesan kesalahan di{" "}
                <code>error.message</code>.
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
              Coba pencarian dataset{" "}
              <ArrowUpRight size={15} aria-hidden="true" />
            </Button>
            <Button
              href={`${apiOrigin}${basePath}/status_show`}
              target="_blank"
              rel="noopener noreferrer"
              variant="outline"
            >
              Periksa status layanan{" "}
              <ArrowUpRight size={15} aria-hidden="true" />
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
              <p className="text-sm font-semibold">Hanya untuk membaca</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Endpoint tersedia untuk melihat data, bukan membuat atau
                mengubahnya.
              </p>
            </div>
          </Card>
          <Card className="flex gap-3 rounded-2xl p-4 shadow-subtle sm:p-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-700">
              <Braces size={20} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold">Respons JSON CKAN</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Struktur hasil mengikuti CKAN dengan penyaringan untuk
                melindungi informasi sensitif.
              </p>
            </div>
          </Card>
          <Card className="flex gap-3 rounded-2xl p-4 shadow-subtle sm:p-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700">
              <Code2 size={20} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold">Tanpa API key</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Data publik dapat diakses tanpa API key. Jika memakai sesi CKAN,
                izin akun tetap diperiksa oleh CKAN.
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
              description="Gunakan alamat dasar ini untuk setiap endpoint. Pada penggunaan normal, permintaan dikirim ke domain portal publik melalui HTTPS."
            >
              <Card as="div" className="rounded-xl bg-canvas p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  Alamat dasar (Base URL)
                </p>
                <code className="break-all text-sm font-semibold text-ink">
                  {apiOrigin}
                  {basePath}
                </code>
              </Card>
              <p className="text-sm leading-6 text-muted">
                Permintaan yang berhasil mengembalikan HTTP 200 dengan struktur
                respons CKAN. Isi pada bagian{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                  result
                </code>{" "}
                berbeda sesuai endpoint yang dipanggil.
              </p>
              <CodeBlock>{`{
  "help": "https://docs.ckan.org/en/2.12/api/index.html#...",
  "success": true,
  "result": { "...": "data sesuai endpoint CKAN" }
}`}</CodeBlock>
              <p className="text-sm leading-6 text-muted">
                Jika permintaan gagal, respons menggunakan status HTTP 4xx atau
                5xx dan JSON berisi{" "}
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
              <p className="text-sm leading-6 text-muted">
                Contoh berikut menunjukkan kesalahan validasi karena pemanggil
                mengirim parameter <code>include_private</code>. Parameter ini
                tidak termasuk parameter yang didukung API publik.
              </p>
              <CodeBlock>{`{
  "help": "https://docs.ckan.org/en/2.12/api/index.html#...",
  "success": false,
  "error": {
    "message": "Parameter 'include_private' tidak tersedia pada API publik.",
    "__type": "Validation Error"
  }
}`}</CodeBlock>
            </ApiSection>

            <ApiSection
              id="endpoint"
              number="02"
              title="Endpoint yang tersedia"
              description="Gunakan GET untuk membaca data. HEAD memeriksa respons tanpa mengembalikan isinya, sedangkan OPTIONS digunakan browser untuk pemeriksaan CORS. Metode untuk membuat, mengubah, atau menghapus data (POST, PUT, PATCH, DELETE) tidak tersedia. Hanya parameter yang tercantum pada setiap endpoint yang diterima; parameter yang sama tidak boleh dikirim berulang."
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
                        Parameter yang diterima
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
                          Buka contoh{" "}
                          <ArrowUpRight size={13} aria-hidden="true" />
                        </Button>
                      ) : (
                        <span className="text-xs leading-5 text-muted">
                          Isi parameter wajib, misalnya ID dataset atau
                          resource, untuk menjalankan contoh.
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
              title="Contoh penggunaan"
              description="Jalankan contoh berikut dari terminal yang memiliki cURL. Ganti nama dataset, ID resource, atau kata kunci dengan nilai yang sesuai. Setiap perintah meminta respons JSON dari portal."
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
                    Baca tabel per halaman
                  </h3>
                  <CodeBlock>{examples.datastore}</CodeBlock>
                  <p className="mt-2 text-xs leading-5 text-muted">
                    Untuk mengambil halaman berikutnya, tambahkan nilai offset
                    sebesar jumlah baris yang diminta. Satu permintaan dibatasi
                    maksimal 100 baris.
                  </p>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold">
                    Ambil daftar organisasi penerbit data
                  </h3>
                  <CodeBlock>{examples.organizations}</CodeBlock>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold">
                    Lihat ringkasan kategori hasil pencarian (facet)
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
                    Sinkronisasi katalog otomatis (harvesting)
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-sky-950">
                    Jika katalog ini perlu disalin atau disinkronkan ke portal
                    lain, daftarkan alamat publik portal sebagai sumber CKAN—
                    bukan alamat khusus admin. API mendukung pengambilan
                    bertahap hingga 100 dataset per permintaan, urutan stabil{" "}
                    <code>id asc</code>, serta filter perubahan metadata yang
                    dibatasi. Metadata publik tidak memerlukan API key. Uji
                    konfigurasi akhir menggunakan harvester yang akan dipakai.
                  </p>
                  <div className="mt-4 space-y-3">
                    <div>
                      <p className="mb-2 text-xs font-semibold text-sky-950">
                        Pengambilan awal: daftar dataset secara bertahap
                      </p>
                      <CodeBlock className="bg-sky-950">
                        {examples.harvest}
                      </CodeBlock>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-semibold text-sky-950">
                        Sinkronisasi berikutnya: ambil metadata yang berubah
                      </p>
                      <CodeBlock className="bg-sky-950">
                        {examples.harvestIncremental}
                      </CodeBlock>
                      <p className="mt-2 text-xs leading-5 text-sky-950">
                        Ganti waktu contoh dengan checkpoint UTC dari
                        sinkronisasi terakhir yang berhasil. Simpan checkpoint
                        tersebut di sisi harvester. Tanggal pada contoh hanya
                        ilustrasi, bukan nilai yang digunakan otomatis.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </ApiSection>

            <ApiSection
              id="data"
              number="04"
              title="Struktur data dan istilah penting"
              description="Respons mengikuti struktur CKAN. Kelengkapan field bergantung pada metadata yang diisi pengelola; field opsional dapat kosong, bernilai null, atau tidak muncul."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Card as="article" className="p-4">
                  <h3 className="font-semibold text-ink">Dataset</h3>
                  <p className="mt-1 text-sm leading-5 text-muted">
                    Kumpulan data tentang satu topik. Dataset memiliki metadata
                    dan satu atau beberapa resource yang memuat datanya.
                  </p>
                </Card>
                <Card as="article" className="p-4">
                  <h3 className="font-semibold text-ink">Resource</h3>
                  <p className="mt-1 text-sm leading-5 text-muted">
                    Berkas, tautan, atau tabel yang menjadi bagian dari dataset,
                    misalnya CSV, XLSX, PDF, atau GeoJSON.
                  </p>
                </Card>
                <Card as="article" className="p-4">
                  <h3 className="font-semibold text-ink">ID</h3>
                  <p className="mt-1 text-sm leading-5 text-muted">
                    Pengenal unik untuk dataset, resource, atau organisasi.
                    Untuk membaca isi tabel, gunakan ID resource pada parameter
                    resource_id, bukan ID dataset.
                  </p>
                </Card>
                <Card as="article" className="p-4">
                  <h3 className="font-semibold text-ink">DataStore</h3>
                  <p className="mt-1 text-sm leading-5 text-muted">
                    Fitur CKAN untuk membaca baris data dari resource berbentuk
                    tabel melalui API. Resource harus lebih dahulu dimuat dan
                    diaktifkan di DataStore.
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
                API CKAN tidak menyediakan indikator, infografik, publikasi,
                atau observasi sebagai jenis objek inti yang terpisah. Tampilan
                khusus portal dibentuk dari dataset, tag, metadata tambahan, dan
                resource DataStore. Karena itu, aplikasi integrasi perlu membaca
                metadata dan resource CKAN sebagai sumber datanya.
              </p>
            </ApiSection>

            <ApiSection
              id="publikasi"
              number="05"
              title="Metadata untuk konten khusus portal"
              description="Selain dataset umum, portal menyajikan indikator, infografik, serta publikasi. Ketiganya tetap dikelola sebagai metadata dan resource CKAN, lalu ditampilkan pada bagian portal yang sesuai."
            >
              <div className="space-y-4">
                <Card
                  as="aside"
                  className="rounded-xl border-line bg-surface p-4 text-sm leading-6 text-ink"
                >
                  <p className="font-semibold">
                    Satu sumber data, beberapa tampilan
                  </p>
                  <p className="mt-1">
                    Di CKAN, seluruh konten tersebut tetap disimpan sebagai
                    entri dataset (Package) beserta resource-nya. Portal membaca
                    metadata <code>portal_type</code> dan tag terkait untuk
                    menentukan apakah entri ditampilkan pada halaman Statistik,
                    Infografik, Publikasi, atau katalog Dataset umum. Dengan
                    cara ini, metadata, berkas, organisasi, lisensi, izin, dan
                    riwayat tetap dikelola dari satu sumber di CKAN.
                  </p>
                </Card>
                <Card
                  as="section"
                  id="indikator"
                  className="scroll-mt-28 rounded-xl p-4 sm:p-5"
                >
                  <h3 className="font-semibold">Indikator statistik</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Untuk menampilkan indikator pada halaman Statistik, pilih
                    tipe konten portal <strong>Indikator statistik</strong> pada
                    formulir CKAN. Tag <code>portal-indikator</code> akan
                    ditambahkan otomatis. Aktifkan DataStore untuk resource
                    berbentuk tabel dengan kolom <code>period</code> dan{" "}
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
                    Untuk menampilkan infografik terpisah dari katalog Dataset
                    umum, pilih tipe konten portal <strong>Infografik</strong>
                    pada formulir CKAN. Tag <code>portal-infografik</code> akan
                    ditambahkan otomatis. Unggah gambar atau PDF sebagai
                    resource, lalu lengkapi metadata seperti{" "}
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
                  <h3 className="font-semibold">Publikasi dan laporan</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Untuk menampilkan dokumen rilis secara terpisah dari katalog
                    Dataset umum, pilih tipe konten portal{" "}
                    <strong>Publikasi/laporan</strong> pada formulir CKAN. Tag{" "}
                    <code>portal-publikasi</code> akan ditambahkan otomatis.
                    Unggah dokumen publik sebagai resource dan isi metadata yang
                    relevan: <code>portal_reference_period</code>,{" "}
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
              title="Akses, batas penggunaan, dan keamanan"
              description="API publik hanya membuka endpoint dan parameter yang diperlukan untuk membaca data. Tidak semua fungsi CKAN tersedia melalui alamat ini."
            >
              <Card
                as="aside"
                className="rounded-xl border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"
              >
                <p className="font-semibold">Hanya untuk membaca data</p>
                <p className="mt-1">
                  API ini tidak menyediakan fungsi untuk membuat, mengubah,
                  menghapus, atau mengunggah data. Pengelolaan dataset dilakukan
                  melalui CKAN Admin dengan autentikasi dan izin yang sesuai.
                </p>
              </Card>
              <Card as="div" className="rounded-xl px-4">
                <dl>
                  <Field
                    name="Metode HTTP"
                    value="GET digunakan untuk mengambil data. HEAD memeriksa respons tanpa isi, sedangkan OPTIONS mendukung pemeriksaan CORS. POST, PUT, PATCH, DELETE, dan action di luar daftar publik ditolak."
                  />
                  <Field
                    name="Status kesalahan"
                    value="400 berarti parameter tidak dikenal, berulang, atau tidak valid; 401/403 berarti autentikasi atau izin ditolak; 404 berarti action atau objek tidak ditemukan/tidak tersedia bagi pemanggil; 409 dan 422 meneruskan konflik atau validasi yang dikenali; 502 berarti layanan CKAN di belakang API tidak dapat dihubungi atau gagal merespons."
                  />
                  <Field
                    name="Batas hasil"
                    value="package_search: rows maksimal 100 dan start maksimal 1.000.000. datastore_search: limit maksimal 100 baris dan offset maksimal 100.000. organization_list: maksimal 1.000 organisasi. Nilai di atas batas disesuaikan ke batas maksimum."
                  />
                  <Field
                    name="Cache respons"
                    value="Status layanan, daftar/detail organisasi dan topik, serta tag dapat disimpan di cache bersama selama 5 detik. Pencarian, detail dataset, aktivitas, resource, file, DataStore, dan seluruh respons error memakai Cache-Control: no-store agar perubahan izin dan visibilitas tidak tertahan oleh cache."
                  />
                  <Field
                    name="Akses lintas domain (CORS)"
                    value="Untuk aplikasi browser dari origin lain, alamat origin harus tercantum pada PUBLIC_API_CORS_ORIGINS. Isi dengan origin lengkap, termasuk skema dan port bila ada, pisahkan beberapa origin dengan koma. Jika variabel ini kosong, portal memakai PUBLIC_SITE_ORIGIN; NEXT_PUBLIC_SITE_URL menjadi nilai cadangan terakhir. Untuk production, gunakan HTTPS. Aplikasi pada origin portal yang sama tidak memerlukan konfigurasi CORS tambahan."
                  />
                  <Field
                    name="Mesin pencari"
                    value="Respons API diberi X-Robots-Tag: noindex, nofollow, noarchive agar endpoint JSON tidak diindeks sebagai halaman web. Header X-Content-Type-Options: nosniff juga diterapkan."
                  />
                  <Field
                    name="Hak akses data"
                    value="Tanpa sesi CKAN, pencarian hanya mengembalikan dataset publik. Jika permintaan membawa sesi CKAN yang valid, akses dataset mengikuti izin akun tersebut. Resource bertanda privat atau tidak aktif tetap disaring; riwayat aktivitas tidak menyertakan identitas pengguna maupun snapshot internal. CKAN tetap menjadi sumber utama pemeriksaan izin."
                  />
                </dl>
              </Card>
              <p className="text-sm leading-6 text-muted">
                API publik tidak membuka akses langsung ke database atau layanan
                internal CKAN. Alamat administrasi tetap terpisah dan hanya
                dapat digunakan oleh pengguna yang memiliki akses serta izin
                pengelolaan.
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
                  <p className="eyebrow">Bagian lain di portal</p>
                  <h2
                    id="api-related-pages-title"
                    className="mt-1 text-lg font-semibold text-ink"
                  >
                    Jelajahi data dan informasi lainnya
                  </h2>
                </div>
                <p className="max-w-xl text-sm leading-6 text-muted">
                  Kembali ke katalog untuk menemukan dataset, atau lihat
                  organisasi dan publikasi yang tersedia.
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
                  Belum menemukan dataset yang dibutuhkan?
                </p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Telusuri katalog, pilih dataset, lalu gunakan ID-nya pada
                  endpoint yang sesuai.
                </p>
              </div>
              <Button href="/dataset" variant="primary">
                Cari dataset <ArrowUpRight size={15} aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
