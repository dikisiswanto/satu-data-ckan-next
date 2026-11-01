import { describe, expect, it } from "vitest";
import {
  buildPublicCatalogQuery,
  normalizePublicCatalogSort,
} from "@/lib/data/catalog-query";

describe("public thematic catalog search", () => {
  it("searches title, content, organization, tags and category metadata", () => {
    const query = buildPublicCatalogQuery("Indeks Pembangunan Manusia", [
      "extras_portal_category",
      "extras_portal_definition",
    ]);
    expect(query).toContain('title:"indeks"');
    expect(query).toContain('extras_portal_category:"pembangunan"');
    expect(query).toContain('extras_portal_definition:"manusia"');
    expect(query).toContain(" OR ");
  });

  it("bounds token count and returns match-all for empty/stopword-only queries", () => {
    expect(buildPublicCatalogQuery("yang dan untuk")).toBe("*:*");
    expect(buildPublicCatalogQuery("")).toBe("*:*");
    const boundedQuery = buildPublicCatalogQuery(
      Array.from({ length: 20 }, (_, index) => `token${index}`).join(" "),
    );
    const matchedTokens = [...new Set(boundedQuery.match(/token\d+/g) || [])];
    expect(matchedTokens).toHaveLength(12);
    expect(matchedTokens).toContain("token11");
    expect(matchedTokens).not.toContain("token12");
  });

  it("uses safe, fixed sort contracts", () => {
    expect(normalizePublicCatalogSort("judul")).toBe("title_string asc");
    expect(normalizePublicCatalogSort("relevansi", "dinas kesehatan")).toBe(
      "score desc, metadata_modified desc",
    );
    expect(normalizePublicCatalogSort("metadata_modified desc; DROP")).toBe(
      "metadata_modified desc",
    );
  });
});
