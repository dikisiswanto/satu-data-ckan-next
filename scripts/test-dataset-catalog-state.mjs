#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  buildDatasetCatalogHref,
  buildDatasetClearFiltersHref,
} from "../src/lib/dataset-catalog-state.js";

const state = {
  query: "sekolah",
  category: "pendidikan",
  organizationId: "dinas-pendidikan",
  sort: "title",
  hasExplicitSort: true,
  year: 2024,
  format: "csv",
};

assert.equal(
  buildDatasetCatalogHref(state, { pageNumber: 3 }),
  "/dataset?q=sekolah&kategori=pendidikan&organisasi=dinas-pendidikan&tahun=2024&format=csv&urut=title&halaman=3",
);
assert.equal(
  buildDatasetCatalogHref(state, { omit: ["kategori"] }),
  "/dataset?q=sekolah&organisasi=dinas-pendidikan&tahun=2024&format=csv&urut=title",
);
assert.equal(
  buildDatasetCatalogHref({ ...state, sort: "relevance" }, { omit: ["q"] }),
  "/dataset?kategori=pendidikan&organisasi=dinas-pendidikan&tahun=2024&format=csv",
);
assert.equal(
  buildDatasetClearFiltersHref({ ...state, page: 8 }),
  "/dataset?q=sekolah&urut=title",
);
assert.equal(
  buildDatasetCatalogHref(state, { omit: ["q", "kategori"] }).includes(
    "tampilan=",
  ),
  false,
);

process.stdout.write(
  "Dataset catalogue state passed: combined filter serialization, one-chip removal, keyword/sort dependency, full-filter reset, and pagination context.\n",
);
