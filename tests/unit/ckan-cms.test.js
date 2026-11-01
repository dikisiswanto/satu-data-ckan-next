import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildCmsFooterLinks,
  getAbsoluteCmsImageUrl,
  getCmsFeatureImage,
  getCmsMarkdownImage,
  getPublicCmsFooterPagesResult,
  getCmsPageDescription,
  isCmsRecordPublished,
  normalizeCmsSlug,
  parseCmsBlocks,
  parseCmsBoolean,
  publicCmsImageUrl,
} from "@/lib/cms/pages";

afterEach(() => {
  delete process.env.CKAN_ADMIN_URL;
  delete process.env.PUBLIC_SITE_ORIGIN;
});

describe("CKAN Pages CMS normalization", () => {
  it("accepts safe CMS slugs and rejects path-like identifiers", () => {
    expect(normalizeCmsSlug("tentang-satu-data")).toBe("tentang-satu-data");
    expect(normalizeCmsSlug("wajo_2026")).toBe("wajo_2026");
    for (const value of [
      "",
      "../admin",
      "a/b",
      "-invalid",
      "invalid-",
      "a".repeat(101),
    ]) {
      expect(normalizeCmsSlug(value)).toBe("");
    }
  });

  it("normalizes boolean values returned by CKAN form extras", () => {
    expect(parseCmsBoolean(true)).toBe(true);
    expect(parseCmsBoolean("True")).toBe(true);
    expect(parseCmsBoolean("1")).toBe(true);
    expect(parseCmsBoolean("false")).toBe(false);
    expect(parseCmsBoolean(0)).toBe(false);
    expect(parseCmsBoolean(undefined)).toBe(false);
  });

  it("excludes private, incomplete, invalid-slug and future-published records", () => {
    const base = { name: "profil-wajo", title: "Profil Wajo", private: false };
    expect(isCmsRecordPublished(base, Date.parse("2026-10-30T00:00:00Z"))).toBe(
      true,
    );
    expect(isCmsRecordPublished({ ...base, private: true })).toBe(false);
    expect(isCmsRecordPublished({ ...base, name: "../private" })).toBe(false);
    expect(isCmsRecordPublished({ ...base, title: " " })).toBe(false);
    expect(
      isCmsRecordPublished(
        { ...base, publish_date: "2099-01-01" },
        Date.parse("2026-10-30T00:00:00Z"),
      ),
    ).toBe(false);
    expect(
      isCmsRecordPublished(
        { ...base, publish_date: "2026-10-30" },
        Date.parse("2026-10-29T20:00:00Z"),
      ),
    ).toBe(true);
    expect(
      isCmsRecordPublished(
        { ...base, publish_date: "2026-10-30T00:00:00" },
        Date.parse("2026-10-29T20:00:00Z"),
      ),
    ).toBe(true);
    expect(
      isCmsRecordPublished(
        { ...base, publish_date: "2026-10-31T00:00:00" },
        Date.parse("2026-10-29T20:00:00Z"),
      ),
    ).toBe(false);
    expect(
      isCmsRecordPublished(
        { ...base, publish_date: "2026-10-31" },
        Date.parse("2026-10-29T20:00:00Z"),
      ),
    ).toBe(false);
    expect(
      isCmsRecordPublished(
        { ...base, publish_date: "invalid-date" },
        Date.parse("2026-10-30T00:00:00Z"),
      ),
    ).toBe(false);
  });

  it("parses only a bounded array of structured content blocks", () => {
    expect(parseCmsBlocks('[{"type":"hero"},{"type":"cta"}]')).toHaveLength(2);
    expect(parseCmsBlocks("not-json")).toEqual([]);
    expect(parseCmsBlocks('{"type":"hero"}')).toEqual([]);
    expect(parseCmsBlocks([null, "invalid", { type: "divider" }])).toEqual([
      { type: "divider" },
    ]);
    expect(
      parseCmsBlocks(Array.from({ length: 30 }, (_, index) => ({ index }))),
    ).toHaveLength(16);
  });

  it("maps CKAN Pages uploads to a controlled same-origin media route", () => {
    process.env.CKAN_ADMIN_URL = "https://ckan.example.go.id";
    const origin = "https://data.example.go.id";
    expect(
      publicCmsImageUrl("/uploads/page_images/wajo-cover.webp", origin),
    ).toBe("/api/cms/media/wajo-cover.webp");
    expect(
      publicCmsImageUrl(
        "https://ckan.example.go.id/uploads/page_images/wajo-cover.webp",
        origin,
      ),
    ).toBe("/api/cms/media/wajo-cover.webp");
    expect(
      publicCmsImageUrl(
        "https://ckan.example.go.id/file/3c2e4f10-6c61-4a2c-a3db-b96db879889c",
        origin,
      ),
    ).toBe("/api/public/ckan-file/3c2e4f10-6c61-4a2c-a3db-b96db879889c");
    expect(
      publicCmsImageUrl("/file/3c2e4f10-6c61-4a2c-a3db-b96db879889c", origin),
    ).toBe("/api/public/ckan-file/3c2e4f10-6c61-4a2c-a3db-b96db879889c");
    expect(
      publicCmsImageUrl(
        "/file/download/3c2e4f10-6c61-4a2c-a3db-b96db879889c",
        origin,
      ),
    ).toBe("/api/public/ckan-file/3c2e4f10-6c61-4a2c-a3db-b96db879889c");
    expect(
      publicCmsImageUrl(
        "https://ckan.example.go.id/file/public-download/groups/logo-wajo.png",
        origin,
      ),
    ).toBe("/file/public-download/groups/logo-wajo.png");
    expect(
      publicCmsImageUrl(
        "https://ckan.example.go.id/uploads/group/logo-lama.png",
        origin,
      ),
    ).toBe("/uploads/group/logo-lama.png");
    expect(
      publicCmsImageUrl("https://cdn.example.test/wajo.webp", origin),
    ).toBe("https://cdn.example.test/wajo.webp");
    expect(publicCmsImageUrl("javascript:alert(1)", origin)).toBe("");
    expect(publicCmsImageUrl("http://cdn.example.test/wajo.webp", origin)).toBe(
      "",
    );
    expect(publicCmsImageUrl("//evil.example/wajo.webp", origin)).toBe("");
    expect(
      publicCmsImageUrl("/api/3/action/package_show?id=secret", origin),
    ).toBe("");
    expect(
      publicCmsImageUrl(
        "/api/editorial-media/226056e2-6f83-47c5-8bd2-102e2b82ab9a",
        origin,
      ),
    ).toBe("/api/editorial-media/226056e2-6f83-47c5-8bd2-102e2b82ab9a");
    expect(
      publicCmsImageUrl("/api/editorial-media/not-a-file-id", origin),
    ).toBe("");
  });

  it("uses the same Markdown cover parser for pages and blog posts without requiring image metadata", () => {
    process.env.CKAN_ADMIN_URL = "https://ckan.example.go.id";
    const page = {
      title: "Halooooo",
      image: "",
      ogImage: "",
      content:
        "Teks pembuka\n\n![Sampul Halooooo](/uploads/page_images/halooo.webp)",
    };
    expect(getCmsFeatureImage(page, "https://data.example.go.id")).toEqual({
      src: "/api/cms/media/halooo.webp",
      alt: "Sampul Halooooo",
    });
    expect(
      getCmsFeatureImage(
        { title: "Tanpa sampul", content: "Halaman tanpa gambar." },
        "https://data.example.go.id",
      ),
    ).toBeNull();
    expect(
      getCmsFeatureImage(
        { ...page, ogImage: "https://cdn.example.test/explicit.webp" },
        "https://data.example.go.id",
      ),
    ).toEqual({
      src: "https://cdn.example.test/explicit.webp",
      alt: "Halooooo",
    });
    expect(
      getCmsFeatureImage(
        {
          title: "Halaman dengan hero",
          templateType: "landing",
          content: "Teks tanpa gambar.",
          contentBlocks: [
            {
              type: "hero",
              image: "/uploads/page_images/hero-wajo.webp",
              imageAlt: "Hero Wajo",
            },
          ],
        },
        "https://data.example.go.id",
      ),
    ).toEqual({
      src: "/api/cms/media/hero-wajo.webp",
      alt: "Hero Wajo",
    });
    expect(
      getCmsFeatureImage(
        {
          title: "Halaman dengan galeri",
          content: "Teks tanpa gambar.",
          contentBlocks: [
            {
              type: "gallery",
              items: [
                {
                  src: "/uploads/page_images/galeri-wajo.webp",
                  alt: "Galeri Wajo",
                },
              ],
            },
          ],
        },
        "https://data.example.go.id",
      ),
    ).toEqual({
      src: "/api/cms/media/galeri-wajo.webp",
      alt: "Galeri Wajo",
    });
    expect(
      getCmsFeatureImage(
        {
          title: "Halaman rich text",
          content: "Teks tanpa gambar.",
          contentBlocks: [
            {
              type: "rich_text",
              markdown: "![Rich text](/uploads/page_images/rich-text.webp)",
            },
          ],
        },
        "https://data.example.go.id",
      ),
    ).toEqual({
      src: "/api/cms/media/rich-text.webp",
      alt: "Rich text",
    });
    expect(
      getCmsFeatureImage(
        {
          title: "Landing dengan urutan konten",
          templateType: "landing",
          content: "![Gambar Markdown](/uploads/page_images/markdown.webp)",
          contentBlocks: [
            {
              type: "image",
              src: "/uploads/page_images/block.webp",
              alt: "Gambar blok",
            },
          ],
        },
        "https://data.example.go.id",
      ),
    ).toEqual({
      src: "/api/cms/media/block.webp",
      alt: "Gambar blok",
    });
  });

  it("derives footer links from the same published page collection, including pages outside the header menu", async () => {
    const pageRecords = [
      {
        name: "halooo",
        title: "Halooooo",
        page_type: "page",
        private: false,
        publish_date: "2026-10-30",
        show_in_menu: false,
        content: "Halaman tanpa sampul.",
      },
      {
        name: "tentang",
        title: "Tentang Satu Data",
        page_type: "page",
        private: false,
        publish_date: "2026-10-01",
        show_in_menu: true,
        content: "Profil.",
      },
      {
        name: "halaman-pribadi",
        title: "Halaman privat",
        page_type: "page",
        private: true,
        publish_date: "2026-10-30",
        show_in_menu: false,
      },
    ];
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json({ success: true, result: pageRecords }));

    const result = await getPublicCmsFooterPagesResult();

    expect(result).toMatchObject({
      unavailable: false,
      data: [
        { href: "/informasi/halooo", title: "Halooooo" },
        { href: "/informasi/tentang", title: "Tentang Satu Data" },
      ],
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [input] = fetchSpy.mock.calls[0];
    const url = new URL(String(input));
    expect(url.pathname).toContain("/ckanext_pages_list");
    expect(url.searchParams.get("page_type")).toBe("page");
    expect(url.searchParams.get("private")).toBe("false");
    expect(url.searchParams.get("order_publish_date")).toBe("true");
  });

  it("lists recent public footer pages independently from the header menu, capped at five", () => {
    const pages = [
      {
        name: "menu-lama",
        title: "Menu lama",
        publishDate: "2026-10-01",
        showInMenu: true,
        menuOrder: 1,
      },
      {
        name: "halooo",
        title: "Halooooo",
        publishDate: "2026-10-30",
        showInMenu: false,
        menuOrder: 99,
      },
      {
        name: "panduan",
        title: "Panduan",
        publishDate: "2026-10-20",
        showInMenu: false,
        menuOrder: 90,
      },
      {
        name: "kebijakan",
        title: "Kebijakan",
        publishDate: "2026-10-18",
        showInMenu: false,
        menuOrder: 90,
      },
      {
        name: "unduh",
        title: "Cara mengunduh",
        publishDate: "2026-10-15",
        showInMenu: false,
        menuOrder: 90,
      },
      {
        name: "metadata",
        title: "Pedoman metadata",
        publishDate: "2026-10-12",
        showInMenu: false,
        menuOrder: 90,
      },
      {
        name: "kamus",
        title: "Kamus data",
        publishDate: "2026-10-10",
        showInMenu: false,
        menuOrder: 90,
      },
    ];
    const footer = buildCmsFooterLinks(pages, 20);
    expect(footer).toHaveLength(5);
    expect(footer[0]).toEqual({ href: "/informasi/halooo", title: "Halooooo" });
    expect(footer.map((item) => item.title)).toContain("Panduan");
    expect(footer.map((item) => item.title)).not.toContain("Menu lama");
    expect(footer.map((item) => item.title)).not.toContain("Kamus data");
  });

  it("uses the first safe Markdown image as an article cover", () => {
    process.env.CKAN_ADMIN_URL = "https://ckan.example.go.id";
    const page = {
      title: "Berita Wajo",
      content:
        "Teks pembuka\n\n![Kegiatan Wajo](https://ckan.example.go.id/uploads/page_images/kegiatan.webp)",
    };
    expect(getCmsMarkdownImage(page, "https://data.example.go.id")).toEqual({
      src: "/api/cms/media/kegiatan.webp",
      alt: "Kegiatan Wajo",
    });
    expect(
      getCmsMarkdownImage(
        { title: "Tanpa foto", content: "Artikel tanpa gambar." },
        "https://data.example.go.id",
      ),
    ).toBeNull();
    expect(
      getCmsMarkdownImage(
        { title: "URL berbahaya", content: "![x](javascript:alert(1))" },
        "https://data.example.go.id",
      ),
    ).toBeNull();
  });

  it("provides only absolute HTTPS image URLs to JSON-LD", () => {
    const origin = "https://data.example.go.id";
    expect(getAbsoluteCmsImageUrl("/images/wajo.webp", origin)).toBe(
      "https://data.example.go.id/images/wajo.webp",
    );
    expect(
      getAbsoluteCmsImageUrl("https://cdn.example.test/wajo.webp", origin),
    ).toBe("https://cdn.example.test/wajo.webp");
    expect(
      getAbsoluteCmsImageUrl("/images/wajo.webp", "http://localhost:3000"),
    ).toBe("");
  });

  it("prefers the editor's SEO description and falls back to the excerpt", () => {
    expect(
      getCmsPageDescription({
        seoDescription: "Deskripsi SEO",
        excerpt: "Ringkasan",
      }),
    ).toBe("Deskripsi SEO");
    expect(getCmsPageDescription({ excerpt: "Ringkasan" })).toBe("Ringkasan");
    expect(getCmsPageDescription({})).toBe("");
  });
});
