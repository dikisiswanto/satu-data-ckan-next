import { describe, expect, it } from "vitest";
import {
  filterAndSortPublicOrganizations,
  summarizePublicOrganizations,
} from "@/lib/public-organizations";

const organizations = [
  {
    name: "bappeda-wajo",
    title: "Bappeda Wajo",
    description: "Perencanaan pembangunan",
    package_count: 2,
  },
  {
    name: "dinas-kesehatan",
    title: "Dinas Kesehatan Kabupaten Wajo",
    description: "Layanan kesehatan masyarakat",
    package_count: 1,
  },
  {
    name: "sekretariat-daerah",
    title: "Sekretariat Daerah",
    description: "Koordinasi pemerintahan",
    package_count: 0,
  },
];

describe("public organization directory", () => {
  it("summarizes organization and CKAN dataset counts", () => {
    expect(summarizePublicOrganizations(organizations)).toEqual({
      organizations: 3,
      datasets: 3,
      withDatasets: 2,
      withoutDatasets: 1,
    });
  });

  it("matches all meaningful search terms regardless of word order", () => {
    expect(
      filterAndSortPublicOrganizations(organizations, {
        query: "kesehatan dinas",
      }).map((item) => item.name),
    ).toEqual(["dinas-kesehatan"]);
    expect(
      filterAndSortPublicOrganizations(organizations, {
        query: "Wajo perencanaan",
      }).map((item) => item.name),
    ).toEqual(["bappeda-wajo"]);
  });

  it("does not match a query fragment inside an unrelated word", () => {
    expect(
      filterAndSortPublicOrganizations(organizations, { query: "dinas" }).map(
        (item) => item.name,
      ),
    ).toEqual(["dinas-kesehatan"]);
  });

  it("filters agencies by whether CKAN reports published datasets", () => {
    expect(
      filterAndSortPublicOrganizations(organizations, {
        datasetState: "with-data",
      }).map((item) => item.name),
    ).toEqual(["bappeda-wajo", "dinas-kesehatan"]);
    expect(
      filterAndSortPublicOrganizations(organizations, {
        datasetState: "without-data",
      }).map((item) => item.name),
    ).toEqual(["sekretariat-daerah"]);
  });

  it("sorts by CKAN package_count without mutating the source list", () => {
    const sorted = filterAndSortPublicOrganizations(organizations, {
      sort: "datasets-desc",
    });
    expect(sorted.map((item) => item.package_count)).toEqual([2, 1, 0]);
    expect(organizations.map((item) => item.package_count)).toEqual([2, 1, 0]);
  });
});
