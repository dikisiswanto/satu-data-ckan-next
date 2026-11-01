import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  CalendarDays,
  Database,
  FileChartColumn,
  FileText,
  GraduationCap,
  Images,
  BookOpen,
  HeartPulse,
  Leaf,
  MapPinned,
  Network,
  Sprout,
  Fish,
  Factory,
  Droplets,
  Scale,
  ShieldCheck,
  House,
  Handshake,
  Trees,
  UsersRound,
  FolderOpen,
} from "lucide-react";
import { SearchForm } from "@/components/search-form";
import {
  getPublishedDatasetFacetsResult,
  getPublishedDatasetsResult,
  getPublicPortalStatsResult,
} from "@/lib/data/public";
import { formatDate, safeHttpUrl } from "@/lib/utils";
import { ckanPackageCategory } from "@/lib/ckan/client";
import { SectionReveal } from "@/components/section-reveal";
import {
  getCanonicalMetadata,
  getSocialMetadata,
  siteConfig,
} from "@/lib/site-config";
import { getPublishedIndicatorsResult } from "@/lib/data/public-indicators";
import { getPublishedInfographicsResult } from "@/lib/data/public-infographics";
import { getPublishedPublicationsResult } from "@/lib/data/public-publications";
import { getPublicCmsBlogPostsResult } from "@/lib/cms/pages";
import { CmsContentCard } from "@/components/cms/content-card";
import { normalizePublicCategoryFacets } from "@/lib/public-categories";

export const metadata = {
  title: siteConfig.name,
  description: `Temukan dataset, indikator, dan informasi resmi dari perangkat daerah ${siteConfig.regionName}.`,
  ...getCanonicalMetadata("/"),
  ...getSocialMetadata({
    path: "/",
    title: siteConfig.name,
    description: `Temukan dataset, indikator, dan informasi resmi dari perangkat daerah ${siteConfig.regionName}.`,
  }),
};

const topics = [
  {
    label: "Kependudukan",
    query: "kependudukan penduduk",
    icon: UsersRound,
    tone: "blue",
  },
  {
    label: "Pendidikan",
    query: "pendidikan sekolah",
    icon: GraduationCap,
    tone: "green",
  },
  { label: "Kesehatan", query: "kesehatan", icon: HeartPulse, tone: "rose" },
  {
    label: "Ekonomi",
    query: "ekonomi perdagangan",
    icon: BarChart3,
    tone: "violet",
  },
  {
    label: "Pertanian",
    query: "pertanian perikanan",
    icon: Sprout,
    tone: "emerald",
  },
  {
    label: "Infrastruktur",
    query: "infrastruktur jalan",
    icon: Network,
    tone: "cyan",
  },
  {
    label: "Wilayah & Geospasial",
    query: "wilayah geospasial",
    icon: MapPinned,
    tone: "amber",
  },
  {
    label: "Lingkungan Hidup",
    query: "lingkungan hidup",
    icon: Leaf,
    tone: "emerald",
  },
  {
    label: "Sosial",
    query: "sosial kesejahteraan",
    icon: UsersRound,
    tone: "violet",
  },
  {
    label: "Pemerintahan",
    query: "pemerintahan",
    icon: Building2,
    tone: "blue",
  },
];

function displayStat(value) {
  return value === null || value === undefined
    ? "—"
    : new Intl.NumberFormat("id-ID").format(value);
}

function DatasetPreviewCard({ dataset, index }) {
  const topic = topics.find((item) =>
    `${ckanPackageCategory(dataset)} ${dataset.title || ""} ${dataset.notes || ""}`
      .toLowerCase()
      .includes(item.label.toLowerCase()),
  );
  const Icon = topic?.icon || FileText;
  const tone = topic?.tone || "blue";
  return (
    <article data-public-list-item="true" className="home-dataset-card group">
      <div
        className={`home-dataset-art home-dataset-art-${tone}`}
        aria-hidden="true"
      >
        <span className="home-dataset-art-grid" />
        <span className="home-dataset-art-icon">
          <Icon size={26} strokeWidth={1.8} />
        </span>
        <span className="home-dataset-index">0{index + 1}</span>
      </div>
      <div className="home-dataset-body">
        <p className="home-dataset-category">{ckanPackageCategory(dataset)}</p>
        <h3>
          <Link href={`/dataset/${dataset.name}`}>
            {dataset.title || dataset.name}
          </Link>
        </h3>
        <p className="home-dataset-description">
          {dataset.notes || "Deskripsi dataset belum tersedia."}
        </p>
        <div className="home-dataset-meta">
          <span>
            <Building2 size={13} aria-hidden="true" />
            {dataset.organization?.title ||
              dataset.organization?.name ||
              "Perangkat daerah belum dicantumkan"}
          </span>
          <span>
            <CalendarDays size={13} aria-hidden="true" />
            {formatDate(dataset.metadata_created)}
          </span>
        </div>
      </div>
      <Link
        className="home-dataset-open"
        href={`/dataset/${dataset.name}`}
        aria-label={`Lihat dataset ${dataset.title || dataset.name}`}
      >
        <ArrowUpRight size={18} aria-hidden="true" />
      </Link>
    </article>
  );
}

function getTopicLinks(availableCategories) {
  return topics.map((topic) => {
    const normalizedLabel = topic.label.toLocaleLowerCase("id-ID");
    const matchingCategory = availableCategories.find((category) => {
      const normalizedCategory = String(category?.name || "")
        .trim()
        .toLocaleLowerCase("id-ID");
      return (
        Boolean(normalizedCategory) &&
        (normalizedCategory === normalizedLabel ||
          normalizedCategory.includes(normalizedLabel) ||
          normalizedLabel.includes(normalizedCategory))
      );
    });
    return {
      ...topic,
      href: matchingCategory
        ? `/dataset?kategori=${encodeURIComponent(matchingCategory.id)}`
        : `/dataset?q=${encodeURIComponent(topic.query)}`,
    };
  });
}

function HomeHeroContent({
  stats = null,
  availableCategories = [],
  facetsUnavailable = false,
  loading = false,
}) {
  const normalizedCategories =
    normalizePublicCategoryFacets(availableCategories);
  const topicLinks = getTopicLinks(normalizedCategories);
  return (
    <section
      className={`home-hero${loading ? " home-hero--loading" : ""}`}
      style={{ "--home-hero-image": `url("${siteConfig.heroImage}")` }}
      aria-busy={loading ? "true" : undefined}
    >
      <div className="home-hero-pattern" aria-hidden="true" />
      <div className="page-container home-hero-inner">
        <div className="home-hero-copy">
          <p className="home-hero-kicker">
            <span />{" "}
            {`PORTAL DATA TERPADU ${siteConfig.regionName.toUpperCase()}`}
          </p>
          <h1>
            Temukan Data,
            <br />
            <span>Pahami {siteConfig.regionShortName}.</span>
          </h1>
          <p className="home-hero-description">
            Jelajahi data resmi {siteConfig.regionName} untuk memahami kondisi
            daerah, menyusun perencanaan, dan mendukung keputusan berbasis data.
          </p>
          <div className="home-hero-search">
            <SearchForm
              placeholder="Cari dataset, tema, atau kata kunci…"
              submitLabel="Cari"
            />
          </div>
          <nav
            className="home-search-suggestions"
            aria-label="Contoh pencarian berdasarkan topik"
          >
            <span>Coba cari</span>
            {topicLinks.slice(0, 4).map((topic) => (
              <Link key={topic.label} href={topic.href}>
                {topic.label}
              </Link>
            ))}
          </nav>
        </div>
        <div
          className={`home-hero-visual${loading ? " home-hero-visual--loading" : ""}`}
          role="group"
          aria-label="Akses cepat ke data publik"
        >
          <div className="home-orbit home-orbit-one" aria-hidden="true" />
          <div className="home-orbit home-orbit-two" aria-hidden="true" />
          <div className="home-scene-grid" aria-hidden="true" />
          <div
            className="home-scene-spark home-scene-spark-one"
            aria-hidden="true"
          />
          <div
            className="home-scene-spark home-scene-spark-two"
            aria-hidden="true"
          />
          <div className="home-visual-mark" aria-hidden="true">
            <div className="home-scene-cube">
              <span className="home-scene-cube__face home-scene-cube__front">
                <Database size={42} strokeWidth={1.35} />
              </span>
              <span className="home-scene-cube__face home-scene-cube__back" />
              <span className="home-scene-cube__face home-scene-cube__right" />
              <span className="home-scene-cube__face home-scene-cube__left" />
              <span className="home-scene-cube__face home-scene-cube__top" />
              <span className="home-scene-cube__face home-scene-cube__bottom" />
            </div>
          </div>
          <div className="home-visual-caption">
            <span className="home-live-dot" />
            <span>
              <strong>{siteConfig.shortName}</strong>
              <small>Data daerah, terhubung dalam satu portal</small>
            </span>
          </div>
          <div
            className="home-visual-metrics"
            aria-label="Ringkasan cepat portal"
          >
            <Link
              href="/dataset"
              className="home-visual-chip home-visual-chip-top home-visual-chip-top-left"
            >
              <Database size={17} aria-hidden="true" />
              <span>
                <strong className="home-metric-value">
                  {loading ? (
                    <span
                      className="loading-skeleton home-metric-skeleton"
                      aria-hidden="true"
                    />
                  ) : (
                    displayStat(stats?.datasets)
                  )}
                </strong>
                <small>Dataset terbuka</small>
              </span>
            </Link>
            <Link
              href="/organisasi"
              className="home-visual-chip home-visual-chip-top home-visual-chip-top-right"
            >
              <Building2 size={17} aria-hidden="true" />
              <span>
                <strong className="home-metric-value">
                  {loading ? (
                    <span
                      className="loading-skeleton home-metric-skeleton"
                      aria-hidden="true"
                    />
                  ) : (
                    displayStat(stats?.organizations)
                  )}
                </strong>
                <small>Organisasi aktif</small>
              </span>
            </Link>
            <Link
              href="/dataset"
              className="home-visual-chip home-visual-chip-bottom home-visual-chip-bottom-left"
            >
              <FolderOpen size={17} aria-hidden="true" />
              <span>
                <strong className="home-metric-value">
                  {loading || facetsUnavailable ? (
                    <span
                      className="loading-skeleton home-metric-skeleton"
                      aria-hidden="true"
                    />
                  ) : (
                    displayStat(normalizedCategories.length)
                  )}
                </strong>
                <small>Kategori data</small>
              </span>
            </Link>
            <Link
              href="/statistik"
              className="home-visual-chip home-visual-chip-bottom home-visual-chip-bottom-right"
            >
              <FileChartColumn size={17} aria-hidden="true" />
              <span>
                <strong className="home-metric-value">
                  {loading ? (
                    <span
                      className="loading-skeleton home-metric-skeleton"
                      aria-hidden="true"
                    />
                  ) : (
                    displayStat(stats?.indicators)
                  )}
                </strong>
                <small>Indikator publik</small>
              </span>
            </Link>
          </div>
        </div>
      </div>
      <div className="page-container home-stats-wrap">
        <section className="home-stats" aria-label="Ringkasan data publik">
          <Link href="/dataset" className="home-stat home-stat-blue">
            <span className="home-stat-icon">
              <Database size={22} aria-hidden="true" />
            </span>
            <span className="home-stat-copy">
              <strong className="home-metric-value">
                {loading ? (
                  <span
                    className="loading-skeleton home-metric-skeleton"
                    aria-hidden="true"
                  />
                ) : (
                  displayStat(stats?.datasets)
                )}
              </strong>
              <small>Dataset terbuka</small>
            </span>
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <Link href="/dataset" className="home-stat home-stat-violet">
            <span className="home-stat-icon">
              <FileText size={22} aria-hidden="true" />
            </span>
            <span className="home-stat-copy">
              <strong className="home-metric-value">
                {loading ? (
                  <span
                    className="loading-skeleton home-metric-skeleton"
                    aria-hidden="true"
                  />
                ) : (
                  displayStat(
                    facetsUnavailable ? null : normalizedCategories.length,
                  )
                )}
              </strong>
              <small>Kategori data</small>
            </span>
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <Link href="/statistik" className="home-stat home-stat-green">
            <span className="home-stat-icon">
              <FileChartColumn size={22} aria-hidden="true" />
            </span>
            <span className="home-stat-copy">
              <strong className="home-metric-value">
                {loading ? (
                  <span
                    className="loading-skeleton home-metric-skeleton"
                    aria-hidden="true"
                  />
                ) : (
                  displayStat(stats?.indicators)
                )}
              </strong>
              <small>Indikator statistik</small>
            </span>
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <Link href="/organisasi" className="home-stat home-stat-green">
            <span className="home-stat-icon">
              <Building2 size={22} aria-hidden="true" />
            </span>
            <span className="home-stat-copy">
              <strong className="home-metric-value">
                {loading ? (
                  <span
                    className="loading-skeleton home-metric-skeleton"
                    aria-hidden="true"
                  />
                ) : (
                  displayStat(stats?.organizations)
                )}
              </strong>
              <small>Perangkat daerah</small>
            </span>
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </section>
        <p className="home-stats-note">
          Ringkasan dihitung dari data yang tersedia untuk publik. Jumlah
          indikator mengikuti data statistik yang diterbitkan.
        </p>
      </div>
    </section>
  );
}

const categoryIconRules = [
  {
    keywords: [
      "kependudukan",
      "penduduk",
      "demografi",
      "keluarga",
      "catatan sipil",
      "administrasi kependudukan",
    ],
    Icon: UsersRound,
    iconName: "users-round",
  },
  {
    keywords: [
      "pendidikan",
      "sekolah",
      "guru",
      "siswa",
      "peserta didik",
      "perguruan tinggi",
    ],
    Icon: GraduationCap,
    iconName: "graduation-cap",
  },
  {
    keywords: [
      "kesehatan",
      "rumah sakit",
      "puskesmas",
      "tenaga medis",
      "kesehatan masyarakat",
    ],
    Icon: HeartPulse,
    iconName: "heart-pulse",
  },
  {
    keywords: ["perikanan", "perikanan tangkap", "budidaya ikan", "kelautan"],
    Icon: Fish,
    iconName: "fish",
  },
  {
    keywords: [
      "pertanian",
      "perkebunan",
      "peternakan",
      "pangan",
      "tanaman",
      "hortikultura",
    ],
    Icon: Sprout,
    iconName: "sprout",
  },
  {
    keywords: [
      "kehutanan",
      "lingkungan",
      "persampahan",
      "sampah",
      "iklim",
      "konservasi",
      "ekologi",
    ],
    Icon: Trees,
    iconName: "trees",
  },
  {
    keywords: [
      "geospasial",
      "wilayah",
      "peta",
      "geografi",
      "tata ruang",
      "batas wilayah",
      "geodesi",
      "pertanahan",
      "agraria",
    ],
    Icon: MapPinned,
    iconName: "map-pinned",
  },
  {
    keywords: ["industri", "pabrik", "manufaktur"],
    Icon: Factory,
    iconName: "factory",
  },
  {
    keywords: [
      "ekonomi",
      "perdagangan",
      "keuangan",
      "pdrb",
      "koperasi",
      "umkm",
      "investasi",
      "perbankan",
    ],
    Icon: BarChart3,
    iconName: "chart",
  },
  {
    keywords: [
      "air",
      "sungai",
      "irigasi",
      "sanitasi",
      "sumber daya air",
      "drainase",
    ],
    Icon: Droplets,
    iconName: "droplets",
  },
  {
    keywords: [
      "infrastruktur",
      "jalan",
      "jembatan",
      "perhubungan",
      "transportasi",
      "pekerjaan umum",
      "angkutan",
    ],
    Icon: Network,
    iconName: "network",
  },
  {
    keywords: [
      "sosial",
      "kesejahteraan",
      "kemiskinan",
      "ketenagakerjaan",
      "perlindungan sosial",
    ],
    Icon: Handshake,
    iconName: "handshake",
  },
  {
    keywords: [
      "pemerintahan",
      "perangkat daerah",
      "organisasi",
      "administrasi",
      "kelembagaan",
      "aparatur",
      "desa",
      "kelurahan",
      "kecamatan",
    ],
    Icon: Building2,
    iconName: "building-2",
  },
  {
    keywords: ["perumahan", "permukiman", "rumah", "bangunan"],
    Icon: House,
    iconName: "house",
  },
  {
    keywords: [
      "bencana",
      "kebencanaan",
      "keamanan",
      "ketertiban",
      "perlindungan",
    ],
    Icon: ShieldCheck,
    iconName: "shield-check",
  },
  {
    keywords: [
      "hukum",
      "regulasi",
      "peraturan",
      "perundang-undangan",
      "legislasi",
    ],
    Icon: Scale,
    iconName: "scale",
  },
  {
    keywords: ["pariwisata", "wisata", "budaya", "destinasi", "rekreasi"],
    Icon: MapPinned,
    iconName: "map-pinned",
  },
  {
    keywords: ["olahraga", "kepemudaan", "pemuda"],
    Icon: UsersRound,
    iconName: "users-round",
  },
  {
    keywords: ["informasi", "publikasi", "dokumen", "arsip", "kearsipan"],
    Icon: FileText,
    iconName: "file-text",
  },
  {
    keywords: ["statistik", "indikator", "indeks", "survei", "sensus"],
    Icon: FileChartColumn,
    iconName: "file-chart-column",
  },
];

function getCategoryVisual(category) {
  const normalized = `${category.name} ${category.id}`
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("id-ID");
  const match = categoryIconRules.find(({ keywords }) =>
    keywords.some((keyword) => normalized.includes(keyword)),
  );
  return {
    Icon: match?.Icon || FolderOpen,
    iconName: match?.iconName || "folder-open",
  };
}

function HomeCategoryCards({ categories = [], unavailable = false }) {
  const normalizedCategories = normalizePublicCategoryFacets(categories);
  return (
    <SectionReveal as="section" className="home-section home-topic-section">
      <div className="home-section-heading">
        <div>
          <p className="eyebrow">JELAJAHI KATALOG</p>
          <h2>Data berdasarkan kategori</h2>
          <p>
            Pilih kategori untuk melihat dataset yang diterbitkan perangkat
            daerah.
          </p>
        </div>
        <Link href="/dataset" className="home-section-link">
          Semua dataset <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
      {normalizedCategories.length ? (
        <div className="home-topic-grid">
          {normalizedCategories.slice(0, 10).map((category) => {
            const { Icon, iconName } = getCategoryVisual(category);
            return (
              <Link
                key={category.id}
                href={`/dataset?kategori=${encodeURIComponent(category.id)}`}
                data-public-list-item="true"
                className="home-topic-card group"
                aria-label={`${category.name}, ${displayStat(category.count)} dataset`}
              >
                <span className="home-topic-icon" data-category-icon={iconName}>
                  <Icon size={22} strokeWidth={1.9} aria-hidden="true" />
                </span>
                <span className="home-topic-name">{category.name}</span>
                <span className="home-topic-count">
                  <strong>{displayStat(category.count)}</strong> dataset
                </span>
                <span className="home-topic-arrow">
                  <ArrowUpRight size={16} aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div
          className="home-topic-empty"
          role={unavailable ? "alert" : "status"}
        >
          {unavailable
            ? "Kategori data belum dapat dimuat. Silakan coba kembali beberapa saat lagi."
            : "Kategori akan muncul setelah dataset publik dikelompokkan di CKAN."}
        </div>
      )}
      {normalizedCategories.length > 10 ? (
        <p className="home-topic-note">
          Menampilkan 10 kategori dengan dataset terbanyak. Seluruh kategori
          tersedia melalui filter katalog.
        </p>
      ) : null}
    </SectionReveal>
  );
}

function HomeCategoryCardsSkeleton() {
  return (
    <section
      className="home-section home-topic-section"
      aria-busy="true"
      aria-label="Memuat kategori dataset"
    >
      <div className="home-section-heading">
        <div>
          <p className="eyebrow">JELAJAHI KATALOG</p>
          <h2>Data berdasarkan kategori</h2>
          <p>
            Pilih kategori untuk melihat dataset yang diterbitkan perangkat
            daerah.
          </p>
        </div>
      </div>
      <div className="home-topic-grid" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="home-topic-card home-topic-card-skeleton">
            <span className="loading-skeleton size-11 rounded-xl" />
            <span className="loading-skeleton mt-4 h-4 w-4/5" />
            <span className="loading-skeleton mt-2 h-3 w-2/5" />
          </div>
        ))}
      </div>
    </section>
  );
}

async function HomeHero() {
  // Headline statistics and category facets are fetched together so the counts
  // shown in the hero and category cards use one CKAN response per request.
  await connection();
  const [statsResult, facetsResult] = await Promise.all([
    getPublicPortalStatsResult(),
    getPublishedDatasetFacetsResult(),
  ]);
  const availableCategories = Array.isArray(facetsResult.data?.categories)
    ? facetsResult.data.categories
    : [];
  return (
    <>
      <HomeHeroContent
        stats={statsResult.data}
        availableCategories={availableCategories}
        facetsUnavailable={facetsResult.unavailable}
      />
      <div className="page-container home-content">
        <HomeCategoryCards
          categories={availableCategories}
          unavailable={facetsResult.unavailable}
        />
      </div>
    </>
  );
}

async function HomeLatestDatasetsSection() {
  const datasetResult = await getPublishedDatasetsResult({
    limit: 5,
    sort: "updated",
  });
  if (datasetResult.unavailable) await connection();
  const datasets = datasetResult.data;
  return (
    <section className="home-section home-latest-section">
      <div className="home-section-heading">
        <div>
          <p className="eyebrow">DATA TERBARU</p>
          <h2>Dataset terbaru</h2>
          <p>Dataset yang baru ditambahkan atau diperbarui.</p>
        </div>
        <Link href="/dataset" className="home-section-link">
          Lihat semua dataset <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
      {datasetResult.unavailable ? (
        <div className="home-empty-datasets" role="alert">
          <span className="home-empty-datasets-icon">
            <Database size={25} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="eyebrow">Katalog belum tersedia</p>
            <h3>Dataset terbaru belum dapat ditampilkan</h3>
            <p>
              Daftar dataset belum dapat dimuat saat ini. Silakan coba kembali
              beberapa saat lagi. Gangguan sementara ini tidak berarti data
              telah dihapus.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/" className="home-section-link">
                Coba lagi
              </Link>
              <Link href="/dataset" className="home-section-link">
                Buka katalog dataset <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      ) : datasets.length ? (
        <div className="home-dataset-grid">
          {datasets.map((dataset, index) => (
            <DatasetPreviewCard
              key={dataset.id}
              dataset={dataset}
              index={index}
            />
          ))}
        </div>
      ) : (
        <div className="home-empty-datasets">
          <span className="home-empty-datasets-icon">
            <Database size={25} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="eyebrow">Belum ada data yang dipublikasikan</p>
            <h3>Belum ada dataset yang diterbitkan</h3>
            <p>
              Dataset akan tampil setelah diperiksa dan dipublikasikan oleh
              perangkat daerah. Sementara itu, Anda dapat melihat profil
              perangkat daerah atau membaca panduan penggunaan portal.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                href="/organisasi"
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#1d5fa7] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#174f8b]"
              >
                Jelajahi perangkat daerah{" "}
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <Link
                href="/bantuan"
                className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-[#174f8b] transition hover:bg-[#eaf2ff]"
              >
                Panduan penggunaan <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function HomeIndicatorHighlights({ indicators = [] }) {
  return (
    <section
      className="home-section home-dynamic-section"
      aria-labelledby="home-indicator-heading"
    >
      <div className="home-section-heading">
        <div>
          <p className="eyebrow">RINGKASAN STATISTIK</p>
          <h2 id="home-indicator-heading">Sorotan statistik</h2>
          <p>Nilai terbaru dari indikator yang telah dipublikasikan.</p>
        </div>
        <Link href="/statistik" className="home-section-link">
          Lihat semua indikator <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
      {indicators.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {indicators.map((indicator) => {
            const latest = indicator.latest;
            const value =
              latest?.numericValue !== null &&
              latest?.numericValue !== undefined
                ? new Intl.NumberFormat("id-ID", {
                    maximumFractionDigits: 4,
                  }).format(latest.numericValue)
                : latest?.value !== null &&
                    latest?.value !== undefined &&
                    latest?.value !== ""
                  ? String(latest.value)
                  : "Belum tersedia";
            return (
              <article
                data-public-list-item="true"
                key={indicator.name}
                className="home-indicator-card group relative overflow-hidden rounded-2xl border border-line bg-white p-5 shadow-[0_5px_24px_rgb(23_51_75_/_0.04)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgb(23_51_75_/_0.09)] motion-reduce:transform-none motion-reduce:transition-none"
              >
                <span
                  className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-700 via-sky-500 to-cyan-300"
                  aria-hidden="true"
                />
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  {indicator.metadata?.periodicity || "Indikator statistik"}
                </p>
                <h3 className="mt-3 min-h-12 break-words text-base font-semibold leading-6 text-ink">
                  <Link
                    href={`/statistik/${encodeURIComponent(indicator.name)}`}
                    className="hover:text-primary hover:underline"
                  >
                    {indicator.title}
                  </Link>
                </h3>
                <div className="mt-5 flex items-end justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-3xl font-semibold tracking-tight text-ink tabular-nums">
                      {value}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {latest?.unit ||
                        indicator.metadata?.unit ||
                        "Satuan belum dicantumkan"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-xs text-muted">
                    <p>{latest?.period || "Periode belum dicantumkan"}</p>
                    <p className="mt-1 max-w-32 truncate">
                      {latest?.region || "Wilayah belum dicantumkan"}
                    </p>
                  </div>
                </div>
                {indicator.metadata?.source ? (
                  <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
                    Sumber: {indicator.metadata.source}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="home-dynamic-empty" role="status">
          Indikator statistik akan ditampilkan setelah data resmi tersedia untuk
          publik.
        </div>
      )}
    </section>
  );
}

function HomeEditorialHighlights({ infographics = [], publications = [] }) {
  return (
    <section
      className="home-section home-dynamic-section"
      aria-labelledby="home-editorial-heading"
    >
      <div className="home-section-heading">
        <div>
          <p className="eyebrow">VISUAL DAN RUJUKAN RESMI</p>
          <h2 id="home-editorial-heading">Lebih dari sekadar dataset</h2>
          <p>
            Infografik dan publikasi resmi yang melengkapi data dalam katalog.
          </p>
        </div>
        <Link href="/publikasi" className="home-section-link">
          Semua publikasi <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
      <div className="grid gap-6 xl:grid-cols-2 home-editorial-grid">
        <section
          className="home-editorial-panel min-w-0 rounded-2xl border border-line bg-white p-4 sm:p-5"
          aria-labelledby="home-infographic-heading"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3
              id="home-infographic-heading"
              className="flex items-center gap-2 text-base font-semibold"
            >
              <Images size={18} className="text-primary" aria-hidden="true" />{" "}
              Infografik terbaru
            </h3>
            <Link
              href="/infografik"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Lihat semua
            </Link>
          </div>
          {infographics.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {infographics.slice(0, 2).map((item) => {
                const imageUrl = safeHttpUrl(item.cover?.url);
                return (
                  <article
                    data-public-list-item="true"
                    key={item.name}
                    className="group min-w-0"
                  >
                    <Link
                      href={`/infografik/${encodeURIComponent(item.name)}`}
                      className="block overflow-hidden rounded-xl border border-line bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      <div className="relative aspect-[4/3]">
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={
                              item.cover?.description ||
                              item.cover?.name ||
                              item.title
                            }
                            fill
                            unoptimized
                            sizes="(min-width: 640px) 320px, 100vw"
                            className="object-contain transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted">
                            <Images size={28} aria-hidden="true" />
                          </div>
                        )}
                      </div>
                    </Link>
                    <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
                      {item.category || "Infografik"}
                      {item.period ? ` · ${item.period}` : ""}
                    </p>
                    <h4 className="mt-1 break-words text-sm font-semibold leading-5">
                      <Link
                        href={`/infografik/${encodeURIComponent(item.name)}`}
                        className="hover:text-primary hover:underline"
                      >
                        {item.title}
                      </Link>
                    </h4>
                    {item.attribution ? (
                      <p className="mt-1 truncate text-xs text-muted">
                        {item.attribution}
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="home-editorial-empty" role="status">
              Infografik terbaru akan tampil di sini setelah diterbitkan.
            </div>
          )}
        </section>
        <section
          className="home-editorial-panel min-w-0 rounded-2xl border border-line bg-white p-4 sm:p-5"
          aria-labelledby="home-publication-heading"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3
              id="home-publication-heading"
              className="flex items-center gap-2 text-base font-semibold"
            >
              <BookOpen size={18} className="text-primary" aria-hidden="true" />{" "}
              Publikasi terbaru
            </h3>
            <Link
              href="/publikasi"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Lihat semua
            </Link>
          </div>
          {publications.length ? (
            <div className="divide-y divide-line">
              {publications.slice(0, 3).map((item) => (
                <article
                  data-public-list-item="true"
                  key={item.name}
                  className="home-publication-row flex gap-3 py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-primary">
                    <FileText size={20} aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                      {item.category || "Publikasi"}
                      {item.period ? ` · ${item.period}` : ""}
                    </p>
                    <h4 className="mt-1 break-words text-sm font-semibold leading-5">
                      <Link
                        href={`/publikasi/${encodeURIComponent(item.name)}`}
                        className="hover:text-primary hover:underline"
                      >
                        {item.title}
                      </Link>
                    </h4>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
                      {item.notes || "Deskripsi belum tersedia."}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
                      {item.publicationDate ? (
                        <span>Rilis {formatDate(item.publicationDate)}</span>
                      ) : null}
                      {item.version ? <span>Versi {item.version}</span> : null}
                      {item.attribution ? (
                        <span>{item.attribution}</span>
                      ) : null}
                    </div>
                  </div>
                  <Link
                    href={`/publikasi/${encodeURIComponent(item.name)}`}
                    className="self-center rounded-lg p-2 text-muted transition hover:bg-accent hover:text-primary"
                    aria-label={`Baca publikasi ${item.title}`}
                  >
                    <ArrowUpRight size={17} aria-hidden="true" />
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="home-editorial-empty" role="status">
              Publikasi terbaru akan tampil di sini setelah diterbitkan.
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function HomeCKANHighlightsSkeleton() {
  return (
    <div
      className="space-y-12"
      aria-busy="true"
      aria-label="Memuat sorotan data publik"
    >
      <section className="home-section home-dynamic-section">
        <div className="home-section-heading">
          <div>
            <p className="eyebrow">RINGKASAN STATISTIK</p>
            <h2>Sorotan statistik</h2>
            <p>Nilai terbaru dari indikator yang telah dipublikasikan.</p>
          </div>
          <span className="home-section-link" aria-hidden="true">
            Lihat semua indikator <ArrowRight size={16} />
          </span>
        </div>
        <div className="public-loading-grid-sm grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <article
              key={index}
              className="home-indicator-card rounded-2xl border border-line bg-white p-5"
              aria-hidden="true"
            >
              <span className="loading-skeleton h-3 w-28" />
              <span className="loading-skeleton mt-4 h-6 w-4/5" />
              <span className="loading-skeleton mt-5 h-9 w-2/3" />
              <span className="loading-skeleton mt-3 h-3 w-1/3" />
              <span className="loading-skeleton mt-5 h-3 w-full" />
            </article>
          ))}
        </div>
      </section>
      <section className="home-section home-dynamic-section">
        <div className="home-section-heading">
          <div>
            <p className="eyebrow">VISUAL DAN RUJUKAN RESMI</p>
            <h2>Lebih dari sekadar dataset</h2>
            <p>
              Infografik dan publikasi resmi yang melengkapi data dalam katalog.
            </p>
          </div>
          <span className="home-section-link" aria-hidden="true">
            Semua publikasi <ArrowRight size={16} />
          </span>
        </div>
        <div className="grid gap-6 xl:grid-cols-2 home-editorial-grid">
          <section
            className="home-editorial-panel rounded-2xl border border-line bg-white p-4 sm:p-5"
            aria-hidden="true"
          >
            <span className="loading-skeleton h-5 w-40" />
            <div className="public-loading-grid-sm mt-4 grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 2 }, (_, index) => (
                <div key={index}>
                  <span className="loading-skeleton block aspect-[4/3] w-full rounded-xl" />
                  <span className="loading-skeleton mt-3 block h-3 w-2/3" />
                  <span className="loading-skeleton mt-2 block h-4 w-4/5" />
                </div>
              ))}
            </div>
          </section>
          <section
            className="home-editorial-panel rounded-2xl border border-line bg-white p-4 sm:p-5"
            aria-hidden="true"
          >
            <span className="loading-skeleton h-5 w-40" />
            <div className="mt-4 divide-y divide-line">
              {Array.from({ length: 1 }, (_, index) => (
                <div
                  key={index}
                  className="home-publication-row flex gap-3 py-4 first:pt-0"
                >
                  <span className="loading-skeleton size-11 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <span className="loading-skeleton block h-3 w-2/3" />
                    <span className="loading-skeleton mt-2 block h-4 w-4/5" />
                    <span className="loading-skeleton mt-2 block h-3 w-full" />
                    <span className="loading-skeleton mt-2 block h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

async function HomeCKANHighlightsSection() {
  await connection();
  const [indicatorsResult, infographicsResult, publicationsResult] =
    await Promise.all([
      getPublishedIndicatorsResult({ limit: 3, includeLatest: true }),
      getPublishedInfographicsResult({ limit: 2, page: 1 }),
      getPublishedPublicationsResult({ limit: 3, page: 1 }),
    ]);
  const indicators = indicatorsResult.data || [];
  const infographics = infographicsResult.data || [];
  const publications = publicationsResult.data || [];
  return (
    <div className="space-y-12">
      <HomeIndicatorHighlights indicators={indicators} />
      <HomeEditorialHighlights
        infographics={infographics}
        publications={publications}
      />
    </div>
  );
}

async function HomeCmsNewsHighlights() {
  await connection();
  const result = await getPublicCmsBlogPostsResult();
  const posts = (result.data || []).slice(0, 3);
  return (
    <section
      className="home-section home-dynamic-section home-news-section"
      aria-labelledby="home-cms-news-heading"
    >
      <div className="home-section-heading">
        <div>
          <p className="eyebrow">INFORMASI RESMI</p>
          <h2 id="home-cms-news-heading">Berita dan informasi daerah</h2>
          <p>
            Berita, pengumuman, dan artikel resmi seputar data serta pembangunan
            daerah.
          </p>
        </div>
        <Link href="/informasi" className="home-section-link">
          Pusat informasi <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
      {posts.length ? (
        <div className="grid gap-4 md:grid-cols-3">
          {posts.map((post) => (
            <CmsContentCard
              key={post.name}
              page={post}
              href={`/berita/${encodeURIComponent(post.name)}`}
              kind="Berita"
            />
          ))}
        </div>
      ) : (
        <div
          className="home-dynamic-empty"
          role={result.unavailable ? "alert" : "status"}
        >
          {result.unavailable
            ? "Berita belum dapat ditampilkan saat ini. Silakan coba kembali beberapa saat lagi."
            : "Berita dan artikel akan ditampilkan setelah diterbitkan oleh pengelola portal."}
        </div>
      )}
    </section>
  );
}

function HomeCmsNewsHighlightsSkeleton() {
  return (
    <section
      className="home-section home-dynamic-section home-news-section"
      aria-busy="true"
      aria-label="Memuat berita dan informasi daerah"
    >
      <div className="home-section-heading">
        <div>
          <p className="eyebrow">INFORMASI RESMI</p>
          <h2>Berita dan informasi daerah</h2>
          <p>
            Berita, pengumuman, dan artikel resmi seputar data serta pembangunan
            daerah.
          </p>
        </div>
        <span className="home-section-link" aria-hidden="true">
          Pusat informasi <ArrowRight size={16} />
        </span>
      </div>
      <div className="public-loading-grid-three grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <article
            key={index}
            className="home-news-card rounded-2xl border border-line bg-white p-5"
            aria-hidden="true"
          >
            <span className="loading-skeleton h-3 w-24" />
            <span className="loading-skeleton mt-4 h-5 w-4/5" />
            <span className="loading-skeleton mt-3 h-3 w-full" />
            <span className="loading-skeleton mt-2 h-3 w-5/6" />
            <span className="loading-skeleton mt-5 h-4 w-28" />
          </article>
        ))}
      </div>
    </section>
  );
}

function HomeLatestDatasetsSkeleton() {
  return (
    <section
      className="home-section home-latest-section"
      aria-busy="true"
      aria-label="Memuat dataset terbaru"
    >
      <div className="home-section-heading">
        <div>
          <p className="eyebrow">DATA TERBARU</p>
          <h2>Dataset terbaru</h2>
          <p>Dataset yang baru ditambahkan atau diperbarui.</p>
        </div>
        <Link href="/dataset" className="home-section-link">
          Lihat semua dataset <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
      <div className="home-dataset-grid public-loading-grid-sm">
        {Array.from({ length: 3 }, (_, index) => (
          <article
            className="home-dataset-card home-dataset-card-skeleton"
            key={index}
            aria-hidden="true"
          >
            <div className="home-dataset-art">
              <span className="loading-skeleton home-dataset-art-skeleton" />
            </div>
            <div className="home-dataset-body">
              <span className="loading-skeleton h-3 w-24" />
              <span className="loading-skeleton mt-3 h-5 w-4/5" />
              <span className="loading-skeleton mt-3 h-3 w-full" />
              <span className="loading-skeleton mt-2 h-3 w-5/6" />
              <span className="loading-skeleton mt-5 h-3 w-2/3" />
            </div>
          </article>
        ))}
      </div>
      <p className="sr-only" role="status">
        Sedang memuat dataset terbaru.
      </p>
    </section>
  );
}

export default function HomePage() {
  return (
    <main className="public-home">
      <Suspense
        fallback={
          <>
            <HomeHeroContent loading />
            <div className="page-container home-content">
              <HomeCategoryCardsSkeleton />
            </div>
          </>
        }
      >
        <HomeHero />
      </Suspense>
      <div className="page-container home-content">
        <Suspense fallback={<HomeLatestDatasetsSkeleton />}>
          <HomeLatestDatasetsSection />
        </Suspense>
        <Suspense fallback={<HomeCKANHighlightsSkeleton />}>
          <HomeCKANHighlightsSection />
        </Suspense>
        <Suspense fallback={<HomeCmsNewsHighlightsSkeleton />}>
          <HomeCmsNewsHighlights />
        </Suspense>
        <section className="home-feature-row" aria-label="Layanan data">
          <article className="home-feature home-feature-visualization">
            <div className="home-feature-copy">
              <span className="home-feature-icon">
                <BarChart3 size={21} aria-hidden="true" />
              </span>
              <p className="eyebrow">PAHAMI DATA</p>
              <h2>Data yang lebih mudah dipahami.</h2>
              <p>
                Jelajahi indikator statistik dan temukan konteks di balik angka
                melalui halaman statistik publik.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/statistik" className="home-feature-button">
                  Jelajahi statistik <ArrowRight size={16} aria-hidden="true" />
                </Link>
                <Link href="/infografik" className="home-format-link">
                  Lihat infografik <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </div>
            <div className="home-data-art" aria-hidden="true">
              <div className="home-data-art-tile home-data-art-tile-dataset">
                <Database size={22} strokeWidth={1.8} />
                <span className="home-data-art-line home-data-art-line-long" />
                <span className="home-data-art-line" />
              </div>
              <div className="home-data-art-tile home-data-art-tile-statistic">
                <FileChartColumn size={22} strokeWidth={1.8} />
                <span className="home-data-art-dots">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
              <div className="home-data-art-tile home-data-art-tile-map">
                <MapPinned size={22} strokeWidth={1.8} />
                <span className="home-data-art-line home-data-art-line-long" />
              </div>
            </div>
          </article>
          <article className="home-feature home-feature-formats">
            <span className="home-feature-icon">
              <FileText size={21} aria-hidden="true" />
            </span>
            <p className="eyebrow">DATA TERBUKA</p>
            <h2>Gunakan data sesuai kebutuhan.</h2>
            <p>
              Periksa informasi, periode, sumber, dan berkas pada setiap dataset
              untuk mengetahui format dan cakupan datanya.
            </p>
            <Link href="/dataset" className="home-format-link">
              Telusuri berkas dataset{" "}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <div className="home-format-badges" aria-label="Contoh format data">
              <span>CSV</span>
              <span>XLSX</span>
              <span>JSON</span>
              <span>GeoJSON</span>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
