import { describe, expect, it } from "vitest";
import {
  buildDatasetCatalogHref,
  buildDatasetClearFiltersHref,
} from "@/lib/dataset-catalog-state";

const state = {
  query: "sekolah",
  category: "pendidikan",
  organizationId: "dinas-pendidikan",
  sort: "title",
  hasExplicitSort: true,
  year: 2024,
  format: "csv",
};

describe("dataset catalogue URL state", () => {
  it("preserves all active filters for pagination and layout preference return paths", () => {
    expect(buildDatasetCatalogHref(state, { pageNumber: 3 })).toBe(
      "/dataset?q=sekolah&kategori=pendidikan&organisasi=dinas-pendidikan&tahun=2024&format=csv&urut=title&halaman=3",
    );
  });

  it("removes only the selected filter and resets pagination", () => {
    expect(buildDatasetCatalogHref(state, { omit: ["kategori"] })).toBe(
      "/dataset?q=sekolah&organisasi=dinas-pendidikan&tahun=2024&format=csv&urut=title",
    );
  });

  it("does not preserve relevance sorting after the keyword is removed", () => {
    expect(
      buildDatasetCatalogHref({ ...state, sort: "relevance" }, { omit: ["q"] }),
    ).toBe(
      "/dataset?kategori=pendidikan&organisasi=dinas-pendidikan&tahun=2024&format=csv",
    );
  });

  it("keeps explicit alphabetical sorting when the keyword chip is removed", () => {
    expect(buildDatasetCatalogHref(state, { omit: ["q"] })).toContain(
      "urut=title",
    );
  });

  it("clear filters preserves keyword/sort but removes all facets and page", () => {
    expect(buildDatasetClearFiltersHref({ ...state, page: 8 })).toBe(
      "/dataset?q=sekolah&urut=title",
    );
  });

  it("keeps card/list out of bookmark URLs because it is a saved preference", () => {
    expect(buildDatasetCatalogHref(state, { pageNumber: 2 })).not.toContain(
      "tampilan=",
    );
  });
});
