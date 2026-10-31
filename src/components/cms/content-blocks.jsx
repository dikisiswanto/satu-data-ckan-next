import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Database, FileText } from "lucide-react";
import { getPublishedDatasetBySlugResult } from "@/lib/data/public";
import { getPublishedPublicationsResult } from "@/lib/data/public-publications";
import { publicCmsImageUrl } from "@/lib/cms/pages";
import { getPublicSiteOrigin } from "@/lib/site-config";
import { MarkdownContent } from "@/components/cms/markdown-content";
import { ImageLightbox } from "@/components/ui/image-lightbox";

function text(value, max = 1000) {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim().slice(0, max)
    : "";
}

function safePageHref(value) {
  const candidate = text(value, 2048);
  if (!candidate || candidate.startsWith("//") || candidate.includes("\\"))
    return null;
  if (
    candidate.startsWith("/") &&
    !candidate.startsWith("/api/") &&
    !candidate.startsWith("/_next/")
  )
    return candidate;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function CtaLink({ href, children }) {
  if (!href) return null;
  const className =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90";
  return href.startsWith("/") ? (
    <Link href={href} className={className}>
      {children}
    </Link>
  ) : (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  );
}

async function DatasetLinks({ block }) {
  const entries = Array.isArray(block.items) ? block.items.slice(0, 8) : [];
  const datasets = await Promise.all(
    entries.map(async (entry) => {
      const slug = text(entry?.slug, 100);
      if (!/^[a-z0-9][a-z0-9_-]{0,98}$/i.test(slug)) return null;
      const result = await getPublishedDatasetBySlugResult(slug);
      if (result.unavailable || !result.data) return null;
      return { ...result.data, linkLabel: text(entry.label, 80) };
    }),
  );
  const available = datasets.filter(Boolean);
  if (!available.length) return null;
  return (
    <section className="my-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Database size={19} className="text-primary" aria-hidden="true" />
        <h2 className="text-lg font-semibold">
          {text(block.title, 120) || "Dataset terkait"}
        </h2>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {available.map((item) => (
          <Link
            key={item.name}
            href={`/dataset/${encodeURIComponent(item.name)}`}
            className="group rounded-xl border border-line p-4 transition hover:border-primary/40 hover:bg-accent/40"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">
              {item.organization?.title || "Dataset publik"}
            </span>
            <span className="mt-2 block font-semibold leading-6 text-ink group-hover:text-primary">
              {item.title || item.name}
            </span>
            <span className="mt-2 line-clamp-2 block text-sm leading-6 text-muted">
              {item.notes || "Deskripsi dataset belum tersedia."}
            </span>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
              {item.linkLabel || "Lihat dataset"}{" "}
              <ArrowUpRight size={14} aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

async function PublicationList({ block }) {
  const requested = Number.parseInt(String(block.limit ?? "3"), 10);
  const limit = Number.isFinite(requested)
    ? Math.min(Math.max(requested, 1), 6)
    : 3;
  const result = await getPublishedPublicationsResult({ limit, page: 1 });
  const items = result.data || [];
  if (!items.length) return null;
  return (
    <section className="my-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText size={19} className="text-primary" aria-hidden="true" />
          <h2 className="text-lg font-semibold">
            {text(block.title, 120) || "Publikasi terkait"}
          </h2>
        </div>
        <Link
          href="/publikasi"
          className="text-sm font-semibold text-primary hover:underline"
        >
          Semua publikasi
        </Link>
      </div>
      <div className="divide-y divide-line">
        {items.map((item) => (
          <article
            key={item.name}
            className="flex items-start gap-3 py-4 first:pt-0 last:pb-0"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-primary">
              <FileText size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold leading-6">
                <Link
                  href={`/publikasi/${encodeURIComponent(item.name)}`}
                  className="hover:text-primary hover:underline"
                >
                  {item.title}
                </Link>
              </h3>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">
                {item.notes}
              </p>
            </div>
            <ArrowUpRight
              size={16}
              className="mt-1 shrink-0 text-muted"
              aria-hidden="true"
            />
          </article>
        ))}
      </div>
    </section>
  );
}

async function ContentBlock({ block, index }) {
  const type = text(block.type, 32).toLowerCase();
  if (type === "hero") {
    const image = publicCmsImageUrl(block.image, getPublicSiteOrigin());
    const href = safePageHref(block.primaryHref);
    return (
      <section
        key={index}
        className="relative isolate my-7 overflow-hidden rounded-3xl bg-slate-950 px-6 py-10 text-white sm:px-10 sm:py-14"
      >
        {image ? (
          <Image
            src={image}
            alt={text(block.imageAlt, 180) || ""}
            fill
            unoptimized
            sizes="100vw"
            className="-z-10 object-cover opacity-35"
          />
        ) : null}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-slate-950/40" />
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">
            {text(block.eyebrow, 100)}
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            {text(block.title, 180)}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-100">
            {text(block.description, 1000)}
          </p>
          {href ? (
            <div className="mt-7">
              <CtaLink href={href}>
                {text(block.primaryLabel, 80) || "Selengkapnya"}
                <ArrowRight size={16} aria-hidden="true" />
              </CtaLink>
            </div>
          ) : null}
        </div>
      </section>
    );
  }
  if (type === "rich_text") {
    return (
      <section key={index} className="my-7">
        <h2 className="mb-3 text-xl font-semibold">{text(block.title, 180)}</h2>
        <MarkdownContent content={text(block.markdown, 20_000)} />
      </section>
    );
  }
  if (type === "image") {
    const src = publicCmsImageUrl(block.src, getPublicSiteOrigin());
    if (!src) return null;
    return (
      <figure
        key={index}
        className="my-8 overflow-hidden rounded-2xl border border-line bg-white p-3 sm:p-4"
      >
        <ImageLightbox
          src={src}
          alt={text(block.alt, 180) || "Ilustrasi konten"}
          className="rounded-xl bg-slate-50"
        >
          <Image
            src={src}
            alt={text(block.alt, 180) || "Ilustrasi konten"}
            width={1800}
            height={1200}
            unoptimized
            className="mx-auto h-auto max-h-[42rem] w-auto max-w-full rounded-xl object-contain"
          />
        </ImageLightbox>
        {text(block.caption, 300) ? (
          <figcaption className="px-2 pt-3 text-sm leading-6 text-muted">
            {text(block.caption, 300)}
          </figcaption>
        ) : null}
      </figure>
    );
  }
  if (type === "stats") {
    const items = Array.isArray(block.items) ? block.items.slice(0, 6) : [];
    if (!items.length) return null;
    return (
      <section key={index} className="my-8">
        <h2 className="mb-4 text-xl font-semibold">
          {text(block.title, 180) || "Ringkasan"}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item, itemIndex) => (
            <article
              key={itemIndex}
              className="rounded-2xl border border-line bg-white p-5"
            >
              <p className="text-sm text-muted">{text(item?.label, 100)}</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-ink">
                {text(item?.value, 80) || "—"}
                <span className="ml-1 text-base font-medium text-muted">
                  {text(item?.unit, 32)}
                </span>
              </p>
              {text(item?.source, 120) ? (
                <p className="mt-2 text-xs text-muted">
                  Sumber: {text(item.source, 120)}
                </p>
              ) : null}
            </article>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          Angka ini merupakan ringkasan informasi. Untuk rincian dan konteks,
          periksa dataset sumber yang tercantum pada halaman terkait.
        </p>
      </section>
    );
  }
  if (type === "dataset_links")
    return <DatasetLinks key={index} block={block} />;
  if (type === "publication_list")
    return <PublicationList key={index} block={block} />;
  if (type === "cta") {
    const href = safePageHref(block.href);
    if (!href) return null;
    return (
      <section
        key={index}
        className="my-8 flex flex-col items-start justify-between gap-5 rounded-2xl border border-emerald-900/10 bg-emerald-50 p-6 sm:flex-row sm:items-center sm:p-8"
      >
        <div>
          <h2 className="text-xl font-semibold text-emerald-950">
            {text(block.title, 180)}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-950/75">
            {text(block.description, 500)}
          </p>
        </div>
        <CtaLink href={href}>
          {text(block.label, 80) || "Buka"}
          <ArrowRight size={16} aria-hidden="true" />
        </CtaLink>
      </section>
    );
  }
  if (type === "divider")
    return <hr key={index} className="my-8 border-line" />;
  if (type === "gallery") {
    const items = Array.isArray(block.items) ? block.items.slice(0, 6) : [];
    const validItems = items
      .map((item) => ({
        ...item,
        src: publicCmsImageUrl(item?.src, getPublicSiteOrigin()),
      }))
      .filter((item) => item.src);
    if (!validItems.length) return null;
    return (
      <section key={index} className="my-8">
        <h2 className="mb-4 text-xl font-semibold">
          {text(block.title, 180) || "Galeri"}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {validItems.map((item, itemIndex) => (
            <figure
              key={itemIndex}
              className="rounded-xl border border-line bg-white p-2"
            >
              <ImageLightbox
                src={item.src}
                alt={text(item.alt, 160) || "Dokumentasi"}
                className="rounded-lg bg-slate-50"
              >
                <Image
                  src={item.src}
                  alt={text(item.alt, 160) || "Dokumentasi"}
                  width={1200}
                  height={800}
                  unoptimized
                  className="h-auto max-h-80 w-full rounded-lg object-cover"
                />
              </ImageLightbox>
              {text(item.caption, 220) ? (
                <figcaption className="px-2 py-2 text-xs text-muted">
                  {text(item.caption, 220)}
                </figcaption>
              ) : null}
            </figure>
          ))}
        </div>
      </section>
    );
  }
  return null;
}

export async function CmsContentBlocks({ blocks = [] }) {
  const safeBlocks = Array.isArray(blocks) ? blocks.slice(0, 16) : [];
  return (
    <div className="cms-content-blocks">
      {safeBlocks.map((block, index) => (
        <ContentBlock key={index} block={block} index={index} />
      ))}
    </div>
  );
}

export function CmsPageBody({ page }) {
  const blocks = <CmsContentBlocks blocks={page.contentBlocks} />;
  const markdown = <MarkdownContent content={page.content} />;
  const templateType = [
    "standard",
    "landing",
    "policy",
    "guide",
    "article",
  ].includes(page.templateType)
    ? page.templateType
    : "standard";
  const body =
    templateType === "landing" || templateType === "guide" ? (
      <>
        {blocks}
        {markdown}
      </>
    ) : (
      <>
        {markdown}
        {blocks}
      </>
    );
  return (
    <div
      className={`cms-page-body cms-page-body-${templateType}`}
      data-template-type={templateType}
    >
      {body}
    </div>
  );
}
