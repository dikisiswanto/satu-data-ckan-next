import "server-only";
import { cache } from "react";
import { ckanAction } from "@/lib/ckan/client";

const PAGE_SLUG_PATTERN = /^[a-z0-9][a-z0-9_-]{0,98}[a-z0-9]$|^[a-z0-9]$/i;
const MAX_CONTENT_LENGTH = 240_000;
const MAX_BLOCKS_LENGTH = 80_000;
const MAX_LIST_ITEMS = 300;

function asText(value, maxLength = 20_000) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/\u0000/g, "")
    .slice(0, maxLength)
    .trim();
}

export function normalizeCmsSlug(value) {
  const slug = asText(value, 100);
  return PAGE_SLUG_PATTERN.test(slug) ? slug : "";
}

export function parseCmsBoolean(value) {
  if (value === true || value === 1) return true;
  if (
    value === false ||
    value === 0 ||
    value === null ||
    value === undefined ||
    value === ""
  )
    return false;
  return ["true", "1", "yes", "on"].includes(
    String(value).trim().toLowerCase(),
  );
}

export function isCmsRecordPublished(record, now = Date.now()) {
  if (!record || typeof record !== "object") return false;
  if (parseCmsBoolean(record.private)) return false;
  if (!normalizeCmsSlug(record.name) || !asText(record.title, 300))
    return false;
  if (record.publish_date) {
    const publishDate = String(record.publish_date).trim();
    if (
      /^\d{4}-\d{2}-\d{2}(?:T00:00:00(?:\.0+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(
        publishDate,
      )
    ) {
      // CKAN Pages stores its date picker as a calendar date, not a UTC
      // timestamp. Compare date-only values in the portal's configured local
      // timezone so a page scheduled for today is not delayed until 08:00 WITA.
      const timeZone = process.env.NEXT_PUBLIC_TIME_ZONE || "Asia/Makassar";
      let localDate;
      try {
        const parts = new Intl.DateTimeFormat("en-CA", {
          timeZone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).formatToParts(new Date(now));
        const today = Object.fromEntries(
          parts.map((part) => [part.type, part.value]),
        );
        localDate = `${today.year}-${today.month}-${today.day}`;
      } catch {
        // A malformed custom timezone must not make all public CMS routes fail.
        localDate = new Date(now).toISOString().slice(0, 10);
      }
      if (publishDate > localDate) return false;
    } else {
      const publishTimestamp = Date.parse(publishDate);
      if (Number.isNaN(publishTimestamp) || publishTimestamp > now)
        return false;
    }
  }
  return true;
}

export function parseCmsBlocks(value) {
  if (Array.isArray(value))
    return value
      .slice(0, 16)
      .filter(
        (item) => item && typeof item === "object" && !Array.isArray(item),
      );
  const source = asText(value, MAX_BLOCKS_LENGTH);
  if (!source) return [];
  try {
    const blocks = JSON.parse(source);
    if (!Array.isArray(blocks)) return [];
    return blocks
      .slice(0, 16)
      .filter(
        (item) => item && typeof item === "object" && !Array.isArray(item),
      );
  } catch {
    return [];
  }
}

function normalizeCmsRecord(record, expectedType) {
  if (!isCmsRecordPublished(record)) return null;
  const pageType = asText(record.page_type, 24) || "page";
  if (expectedType && pageType !== expectedType) return null;

  const content = asText(record.content, MAX_CONTENT_LENGTH);
  const excerpt =
    asText(record.excerpt, 500) ||
    content
      .replace(/[#>*_`\[\]()!~-]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 240);
  const menuOrderValue = Number.parseInt(String(record.menu_order ?? ""), 10);
  const menuOrder = Number.isFinite(menuOrderValue)
    ? Math.min(Math.max(menuOrderValue, 1), 99)
    : 99;

  return {
    name: normalizeCmsSlug(record.name),
    title: asText(record.title, 300),
    content,
    excerpt,
    category: asText(record.category, 100),
    pageType,
    publishDate: asText(record.publish_date, 64),
    templateType: [
      "standard",
      "landing",
      "policy",
      "guide",
      "article",
    ].includes(record.template_type)
      ? record.template_type
      : pageType === "blog"
        ? "article"
        : "standard",
    featured: parseCmsBoolean(record.featured),
    showInMenu: parseCmsBoolean(record.show_in_menu),
    menuLabel: asText(record.menu_label, 64),
    menuOrder,
    seoTitle: asText(record.seo_title, 100),
    seoDescription: asText(record.seo_description, 200),
    ogImage: asText(record.og_image, 2048),
    image: asText(record.image, 2048),
    contentBlocks: parseCmsBlocks(record.content_blocks),
  };
}

async function queryCmsPages(pageType) {
  const params = {
    private: false,
    page_type: pageType,
    ...(pageType === "blog" ? { order_publish_date: true } : {}),
  };
  const result = await ckanAction("ckanext_pages_list", params, {
    revalidate: 0,
  });
  if (!Array.isArray(result))
    throw new Error("ckan_pages_invalid_list_response");
  return result
    .slice(0, MAX_LIST_ITEMS)
    .map((record) => normalizeCmsRecord(record, pageType))
    .filter(Boolean);
}

const getCmsPagesByType = cache(async (pageType) => {
  try {
    const items = await queryCmsPages(pageType);
    if (pageType === "blog") {
      items.sort((left, right) => {
        const leftDate = Date.parse(left.publishDate || "") || 0;
        const rightDate = Date.parse(right.publishDate || "") || 0;
        return rightDate - leftDate;
      });
    }
    return { data: items, unavailable: false };
  } catch (error) {
    console.error("ckan_public_pages_list_failed", {
      pageType,
      status: error?.status || null,
    });
    return { data: [], unavailable: true };
  }
});

export function getPublicCmsPagesResult() {
  return getCmsPagesByType("page");
}

export function getPublicCmsBlogPostsResult() {
  return getCmsPagesByType("blog");
}

const getCmsPageBySlug = cache(async (slug) => {
  if (!normalizeCmsSlug(slug)) return { data: null, unavailable: false };
  try {
    // ckanext-pages itself checks private-page access for anonymous users.
    // Do not expose the admin token or proxy this action through the browser API.
    const result = await ckanAction(
      "ckanext_pages_show",
      { page: slug },
      { revalidate: 0 },
    );
    const normalized = normalizeCmsRecord(result, null);
    return { data: normalized, unavailable: false };
  } catch (error) {
    if ([401, 403, 404].includes(Number(error?.status)))
      return { data: null, unavailable: false };
    console.error("ckan_public_page_detail_failed", {
      status: error?.status || null,
    });
    return { data: null, unavailable: true };
  }
});

export async function getPublicCmsPageBySlugResult(slug) {
  const result = await getCmsPageBySlug(slug);
  return result.data?.pageType === "page"
    ? result
    : { data: null, unavailable: result.unavailable };
}

export async function getPublicCmsBlogPostBySlugResult(slug) {
  const result = await getCmsPageBySlug(slug);
  return result.data?.pageType === "blog"
    ? result
    : { data: null, unavailable: result.unavailable };
}

export async function getPublicCmsNavigationResult() {
  const result = await getPublicCmsPagesResult();
  return {
    data: result.data
      .filter((page) => page.showInMenu)
      .sort(
        (left, right) =>
          left.menuOrder - right.menuOrder ||
          left.title.localeCompare(right.title, "id"),
      )
      .slice(0, 8)
      .map((page) => ({
        href: `/informasi/${encodeURIComponent(page.name)}`,
        label: page.menuLabel || page.title,
      })),
    unavailable: result.unavailable,
  };
}

export function publicCmsImageUrl(
  value,
  siteOrigin = process.env.PUBLIC_SITE_ORIGIN,
) {
  const candidate = asText(value, 2048);
  if (!candidate || candidate.startsWith("//") || candidate.includes("\\"))
    return "";
  const mapPageUpload = (pathname) => {
    const match = pathname.match(
      /^\/uploads\/page_images\/([A-Za-z0-9][A-Za-z0-9._-]{0,179})$/,
    );
    return match ? `/api/cms/media/${encodeURIComponent(match[1])}` : null;
  };
  const isEditorialMedia = (pathname) =>
    /^\/api\/editorial-media\/[a-f0-9-]{32,36}$/i.test(pathname);
  const mapPublicFile = (pathname) => {
    const match = pathname.match(
      /^\/file\/(?:download\/)?([a-f0-9-]{32,36})\/?$/i,
    );
    return match
      ? `/api/public/ckan-file/${encodeURIComponent(match[1])}`
      : null;
  };
  const isPublicGroupImage = (pathname) =>
    /^\/file\/public-download\/groups\/[A-Za-z0-9][A-Za-z0-9._-]{0,240}\.(?:png|jpe?g|gif|webp)$/i.test(
      pathname,
    );
  const mapLegacyGroupImage = (pathname) => {
    const match = pathname.match(
      /^\/uploads\/group\/([A-Za-z0-9][A-Za-z0-9._-]{0,240}\.(?:png|jpe?g|gif|webp))$/i,
    );
    return match ? `/uploads/group/${encodeURIComponent(match[1])}` : null;
  };
  if (candidate.startsWith("/")) {
    const pathname = candidate.split(/[?#]/, 1)[0];
    if (isEditorialMedia(pathname)) return candidate;
    if (/^\/(?:api|_next)\//.test(candidate)) return "";
    return (
      mapPageUpload(pathname) ||
      mapPublicFile(pathname) ||
      mapLegacyGroupImage(pathname) ||
      (isPublicGroupImage(pathname) ? candidate : candidate)
    );
  }
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" || url.username || url.password) return "";
    const expectedOrigins = new Set(
      [siteOrigin, process.env.CKAN_ADMIN_URL].filter(Boolean).map((item) => {
        try {
          return new URL(item).origin;
        } catch {
          return "";
        }
      }),
    );
    const pageUpload = mapPageUpload(url.pathname);
    const publicFile = mapPublicFile(url.pathname);
    const publicGroupImage = isPublicGroupImage(url.pathname);
    const legacyGroupImage = mapLegacyGroupImage(url.pathname);
    const isTrustedCkanOrigin = expectedOrigins.has(url.origin);
    if (pageUpload && (!expectedOrigins.size || isTrustedCkanOrigin))
      return pageUpload;
    if (
      (publicFile || publicGroupImage || legacyGroupImage) &&
      isTrustedCkanOrigin
    ) {
      return (
        publicFile ||
        legacyGroupImage ||
        `${url.pathname}${url.search}${url.hash}`
      );
    }
    if (siteOrigin && url.origin === new URL(siteOrigin).origin) {
      if (isEditorialMedia(url.pathname))
        return `${url.pathname}${url.search}${url.hash}`;
      if (publicFile) return publicFile;
      if (publicGroupImage) return `${url.pathname}${url.search}${url.hash}`;
      if (legacyGroupImage)
        return `${legacyGroupImage}${url.search}${url.hash}`;
      return /^\/(?:api|_next)\//.test(url.pathname)
        ? ""
        : `${url.pathname}${url.search}${url.hash}`;
    }
    return url.toString();
  } catch {
    return "";
  }
}

export function getCmsPageDescription(page) {
  return (page?.seoDescription || page?.excerpt || "").slice(0, 180);
}

/** Return an absolute HTTPS image URL for metadata/JSON-LD, or an empty string. */
export function getAbsoluteCmsImageUrl(
  value,
  siteOrigin = process.env.PUBLIC_SITE_ORIGIN,
) {
  const image = publicCmsImageUrl(value, siteOrigin);
  if (!image) return "";
  try {
    const absolute = new URL(image, siteOrigin || undefined);
    return absolute.protocol === "https:" ? absolute.toString() : "";
  } catch {
    return "";
  }
}
