import { describe, expect, it } from "vitest";
import { parseMarkdown } from "@/lib/markdown/parse-markdown";

describe("Markdown renderer parser", () => {
  it("supports GFM tables and column alignment", () => {
    const [table] = parseMarkdown(
      "| Nama | Nilai |\n| :--- | ---: |\n| Wajo | 42 |",
    );
    expect(table).toMatchObject({
      type: "table",
      headers: ["Nama", "Nilai"],
      alignments: ["left", "right"],
      rows: [["Wajo", "42"]],
    });
  });

  it("supports task lists, ordered lists, quotes and fenced code", () => {
    expect(
      parseMarkdown("- [x] Selesai\n- [ ] Berikutnya")[0].items.map(
        (item) => item.checked,
      ),
    ).toEqual([true, false]);
    expect(parseMarkdown("3. Tiga\n4. Empat")[0]).toMatchObject({
      type: "list",
      ordered: true,
      start: 3,
    });
    expect(parseMarkdown("> Kutipan")[0].type).toBe("blockquote");
    expect(parseMarkdown("```js\nconst a = 1;\n```")[0]).toMatchObject({
      type: "code",
      language: "js",
      value: "const a = 1;",
    });
  });

  it("supports reference links, bare links, strikethrough and hard breaks", () => {
    const blocks = parseMarkdown(
      "[Portal][data] and https://example.test\nbar  \nbaz\n\n[data]: https://data.example.test\n\n~~lama~~",
    );
    expect(
      blocks[0].children.some(
        (item) =>
          item.type === "link" && item.href === "https://data.example.test",
      ),
    ).toBe(true);
    expect(
      blocks[0].children.some(
        (item) => item.type === "link" && item.href === "https://example.test",
      ),
    ).toBe(true);
    expect(blocks[0].children.some((item) => item.type === "break")).toBe(true);
    expect(blocks[1].children.some((item) => item.type === "delete")).toBe(
      true,
    );
  });

  it("parses mixed unordered, ordered, task lists, tables and nested emphasis", () => {
    const blocks =
      parseMarkdown(`**aku** *asre* ~~*dodo*~~ [teks](https://fb.com/)

- teks
- teks 2

1. teks 2
2. teks 3

- [ ] teks
- [x] test

> teks

| Kolom 1 | Kolom 2 |
| --- | --- |
| Isi | Isi |

\`\`\`text
alooo
teks
\`\`\``);

    const lists = blocks.filter((block) => block.type === "list");
    expect(lists).toHaveLength(3);
    expect(lists[0]).toMatchObject({ ordered: false });
    expect(lists[1]).toMatchObject({ ordered: true, start: 1 });
    expect(lists[2].items.map((item) => item.checked)).toEqual([false, true]);
    expect(blocks.some((block) => block.type === "table")).toBe(true);
    expect(blocks.some((block) => block.type === "blockquote")).toBe(true);
    expect(blocks.some((block) => block.type === "code")).toBe(true);

    const strike = blocks[0].children.find((item) => item.type === "delete");
    expect(strike.children).toEqual([
      { type: "emphasis", children: [{ type: "text", value: "dodo" }] },
    ]);
  });

  it("keeps raw HTML inert and bounds overly large input", () => {
    const html = parseMarkdown("<script>alert(1)</script>")[0];
    expect(html.type).toBe("paragraph");
    expect(html.children[0].value).toContain("<script>");
    expect(parseMarkdown("x".repeat(300_000))[0].children[0].value.length).toBe(
      240_000,
    );
  });
});
