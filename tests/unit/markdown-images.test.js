import { describe, expect, it } from "vitest";
import { findFirstMarkdownImage } from "@/lib/markdown/markdown-images";

describe("Markdown article images", () => {
  it("finds the first image in article Markdown", () => {
    expect(
      findFirstMarkdownImage(
        "# Berita\n\n![Foto kegiatan](/uploads/page_images/kegiatan.webp)\n\nTeks berita",
      ),
    ).toEqual({
      href: "/uploads/page_images/kegiatan.webp",
      alt: "Foto kegiatan",
      title: "",
    });
  });

  it("finds images nested in lists and blockquotes", () => {
    expect(
      findFirstMarkdownImage(
        "> Foto dokumentasi\n>\n> ![Dokumentasi](https://cdn.example.test/wajo.jpg)",
      ),
    ).toMatchObject({
      href: "https://cdn.example.test/wajo.jpg",
      alt: "Dokumentasi",
    });
    expect(
      findFirstMarkdownImage(
        "- Item\n  - ![Lampiran](/uploads/page_images/lampiran.png)",
      ),
    ).toMatchObject({ href: "/uploads/page_images/lampiran.png" });
  });

  it("returns null when Markdown has no image and ignores code examples", () => {
    expect(findFirstMarkdownImage("Artikel tanpa foto.")).toBeNull();
    expect(
      findFirstMarkdownImage(
        "```md\n![contoh](https://example.test/foto.jpg)\n```",
      ),
    ).toBeNull();
  });
});
