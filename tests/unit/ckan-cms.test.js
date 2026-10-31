import { afterEach, describe, expect, it } from "vitest";
import {
  getAbsoluteCmsImageUrl,
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
