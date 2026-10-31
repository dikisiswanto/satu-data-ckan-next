import { afterEach, describe, expect, it } from "vitest";
import { normalizeMarkdownHref } from "@/components/cms/markdown-content";

afterEach(() => {
  delete process.env.CKAN_ADMIN_URL;
  delete process.env.NEXT_PUBLIC_SITE_URL;
});

describe("public markdown link normalization", () => {
  it("keeps CKAN File API links on the public portal proxy", () => {
    process.env.CKAN_ADMIN_URL = "https://ckan.example.go.id";
    process.env.NEXT_PUBLIC_SITE_URL = "https://data.example.go.id";
    const fileId = "3c2e4f10-6c61-4a2c-a3db-b96db879889c";

    expect(normalizeMarkdownHref(`/file/${fileId}`)).toBe(
      `/api/public/ckan-file/${fileId}`,
    );
    expect(
      normalizeMarkdownHref(`https://ckan.example.go.id/file/${fileId}`),
    ).toBe(`/api/public/ckan-file/${fileId}`);
  });

  it("rewrites CKAN downloads to the public portal and rejects unknown admin paths", () => {
    process.env.CKAN_ADMIN_URL = "https://ckan.example.go.id";
    process.env.NEXT_PUBLIC_SITE_URL = "https://data.example.go.id";

    expect(
      normalizeMarkdownHref(
        "https://ckan.example.go.id/dataset/menara/resource/abc/download/data.xlsx",
      ),
    ).toBe(
      "https://data.example.go.id/dataset/menara/resource/abc/download/data.xlsx",
    );
    expect(
      normalizeMarkdownHref(
        "https://ckan.example.go.id/storage/private/file.bin",
      ),
    ).toBeNull();
  });

  it("retains safe external and local links while rejecting executable or API paths", () => {
    expect(normalizeMarkdownHref("https://example.test/publikasi.pdf")).toBe(
      "https://example.test/publikasi.pdf",
    );
    expect(normalizeMarkdownHref("/informasi/profil-wajo")).toBe(
      "/informasi/profil-wajo",
    );
    expect(
      normalizeMarkdownHref("/api/3/action/package_show?id=private"),
    ).toBeNull();
    expect(normalizeMarkdownHref("javascript:alert(1)")).toBeNull();
    expect(normalizeMarkdownHref("//evil.example/file")).toBeNull();
  });
});
