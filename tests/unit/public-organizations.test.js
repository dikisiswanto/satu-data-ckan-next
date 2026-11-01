import { describe, expect, it } from "vitest";
import { buildOrganizationFilter } from "@/lib/data/portal-content-types";
import {
  filterAndSortPublicOrganizations,
  organizationContentCount,
  organizationDatasetCount,
  organizationTotalContentCount,
  summarizePublicOrganizations,
} from "@/lib/public-organizations";

const organizations = [
  {
    name: "bappeda-wajo",
    title: "Bappeda Wajo",
    description: "Perencanaan pembangunan",
    package_count: 9,
    public_dataset_count: 1,
    public_content_counts: {
      datasets: 1,
      indicators: 2,
      infographics: 3,
      publications: 4,
    },
  },
  {
    name: "dinas-kesehatan",
    title: "Dinas Kesehatan Kabupaten Wajo",
    description: "Layanan kesehatan masyarakat",
    package_count: 4,
    public_dataset_count: 0,
    public_content_counts: {
      datasets: 0,
      indicators: 1,
      infographics: 0,
      publications: 1,
    },
  },
  {
    name: "sekretariat-daerah",
    title: "Sekretariat Daerah",
    description: "Koordinasi pemerintahan",
    package_count: 0,
    public_dataset_count: 0,
    public_content_counts: {
      datasets: 0,
      indicators: 0,
      infographics: 0,
      publications: 0,
    },
  },
];

describe("public organization directory", () => {
  it("summarizes each public catalog family independently", () => {
    expect(summarizePublicOrganizations(organizations)).toEqual({
      organizations: 3,
      datasets: 1,
      indicators: 3,
      infographics: 3,
      publications: 5,
      totalPublicItems: 12,
      withContent: 2,
      withoutContent: 1,
      countsAvailable: true,
    });
  });

  it("never substitutes CKAN mixed package_count for public dataset count", () => {
    const record = { name: "opd-a", package_count: 8 };
    expect(organizationDatasetCount(record)).toBeNull();
    expect(organizationContentCount(record, "infographics")).toBeNull();
  });

  it("allows an organization with only infographic records to be discovered", () => {
    const record = {
      name: "opd-infografik",
      title: "OPD Penerbit Infografik",
      package_count: 1,
      public_dataset_count: 0,
      public_content_counts: {
        datasets: 0,
        indicators: 0,
        infographics: 1,
        publications: 0,
      },
    };
    expect(organizationDatasetCount(record)).toBe(0);
    expect(organizationTotalContentCount(record)).toBe(1);
    expect(
      filterAndSortPublicOrganizations([record], {
        contentType: "infographics",
      }),
    ).toEqual([record]);
    expect(
      filterAndSortPublicOrganizations([record], { contentType: "datasets" }),
    ).toEqual([]);
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

  it("filters organizations with any publication family and by an exact family", () => {
    expect(
      filterAndSortPublicOrganizations(organizations, {
        contentState: "with-content",
      }).map((item) => item.name),
    ).toEqual(["bappeda-wajo", "dinas-kesehatan"]);
    expect(
      filterAndSortPublicOrganizations(organizations, {
        contentState: "without-content",
      }).map((item) => item.name),
    ).toEqual(["sekretariat-daerah"]);
    expect(
      filterAndSortPublicOrganizations(organizations, {
        contentType: "publications",
      }).map((item) => item.name),
    ).toEqual(["bappeda-wajo", "dinas-kesehatan"]);
  });

  it("sorts by total public content without mutating the source list", () => {
    const sorted = filterAndSortPublicOrganizations(organizations, {
      sort: "content-desc",
    });
    expect(sorted.map((item) => item.name)).toEqual([
      "bappeda-wajo",
      "dinas-kesehatan",
      "sekretariat-daerah",
    ]);
    expect(organizations.map((item) => item.name)).toEqual([
      "bappeda-wajo",
      "dinas-kesehatan",
      "sekretariat-daerah",
    ]);
  });

  it("keeps unavailable category counts unknown instead of inventing zeroes", () => {
    const summary = summarizePublicOrganizations([
      {
        name: "opd-a",
        public_content_counts: {
          datasets: null,
          indicators: 0,
          infographics: 0,
          publications: 0,
        },
      },
    ]);
    expect(summary.datasets).toBeNull();
    expect(summary.indicators).toBe(0);
    expect(summary.withContent).toBeNull();
    expect(summary.countsAvailable).toBe(false);
  });
});

describe("public content organization filter", () => {
  it("creates an exact CKAN organization filter for a valid slug", () => {
    expect(buildOrganizationFilter("dinas-kesehatan-wajo")).toBe(
      "organization:dinas-kesehatan-wajo",
    );
  });

  it("rejects malformed or query-injected organization identifiers", () => {
    expect(buildOrganizationFilter("dinas-kesehatan OR *:*")).toBeNull();
    expect(buildOrganizationFilter("../admin")).toBeNull();
    expect(buildOrganizationFilter("")).toBeNull();
  });
});
