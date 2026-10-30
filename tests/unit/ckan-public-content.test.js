import { afterEach, describe, expect, it, vi } from "vitest";
import {
  sanitizePublicActivity,
  sanitizePublicPackage,
  sanitizePublicSearchResult,
} from "@/lib/ckan/public-api-sanitize";

import {
  getIndicatorMetadata,
  getIndicatorResource,
  isPublicIndicatorPackage,
  normalizeObservation,
} from "@/lib/data/public-indicators";
import {
  getInfographicResources,
  isImageResource,
  isPublicInfographicPackage,
} from "@/lib/data/public-infographics";
import {
  ckanExtraValue,
  ckanPackageCategory,
  ckanResourceFormat,
  isGeospatialServiceResource,
} from "@/lib/ckan/client";
import {
  ckanResourceExtra,
  publicResourceUrl,
  rewriteCkanDownloadUrls,
} from "@/lib/ckan/public-resource-url";
import {
  getPublicationReleaseDate,
  isPublicPublicationPackage,
} from "@/lib/data/public-publications";
import {
  buildPublicCatalogQuery,
  getPublicPortalStatsResult,
  getPublishedDatasetFacetsResult,
} from "@/lib/data/public";
import { normalizePublicCategoryFacets } from "@/lib/public-categories";

const indicatorPackage = {
  id: "package-id-ipm",
  name: "indikator-ipm",
  title: "Indeks Pembangunan Manusia",
  notes: "Indeks pembangunan manusia Kabupaten Wajo.",
  state: "active",
  private: false,
  tags: [{ name: "portal-indikator", display_name: "portal-indikator" }],
  organization: { name: "bappeda-wajo", title: "Bappeda Wajo" },
  extras: [
    { key: "portal_unit", value: "poin" },
    { key: "portal_formula", value: "metode resmi" },
    { key: "portal_reference_period", value: "2024" },
  ],
  resources: [
    {
      id: "ipm-table",
      format: "CSV",
      state: "active",
      private: false,
      datastore_active: true,
    },
    { id: "ipm-raw", format: "PDF", state: "active", datastore_active: false },
  ],
};

const infographicPackage = {
  name: "infografik-stunting",
  title: "Situasi Stunting",
  state: "active",
  private: false,
  tags: [
    { name: "portal-infografik" },
    { name: "kesehatan", display_name: "Kesehatan" },
  ],
  extras: [
    { key: "portal_category", value: "Kesehatan" },
    { key: "portal_period", value: "2025" },
    { key: "portal_attribution", value: "Dinas Kesehatan Wajo" },
  ],
  resources: [
    {
      id: "image-1",
      name: "Infografik PNG",
      format: "PNG",
      url: "https://example.test/stunting.png",
      state: "active",
    },
    {
      id: "pdf-1",
      name: "Laporan PDF",
      format: "PDF",
      url: "https://example.test/stunting.pdf",
      state: "active",
    },
    {
      id: "private-image",
      format: "PNG",
      url: "https://example.test/private.png",
      private: true,
      state: "active",
    },
  ],
};

describe("native CKAN objects for indicators", () => {
  it("recognizes only active public packages tagged as indicators", () => {
    expect(isPublicIndicatorPackage(indicatorPackage)).toBe(true);
    expect(
      isPublicIndicatorPackage({ ...indicatorPackage, private: true }),
    ).toBe(false);
    expect(
      isPublicIndicatorPackage({ ...indicatorPackage, state: "deleted" }),
    ).toBe(false);
    expect(
      isPublicIndicatorPackage({ ...indicatorPackage, state: "draft" }),
    ).toBe(false);
    expect(
      isPublicIndicatorPackage({
        ...indicatorPackage,
        tags: [{ name: "pendidikan" }],
      }),
    ).toBe(false);
  });

  it("reads metadata from CKAN extras and native organization data", () => {
    const metadata = getIndicatorMetadata(indicatorPackage);
    expect(metadata.unit).toBe("poin");
    expect(metadata.formula).toBe("metode resmi");
    expect(metadata.referencePeriod).toBe("2024");
    expect(metadata.source).toBe("");
    expect(metadata.definition).toContain("Indeks pembangunan manusia");
  });

  it("does not infer a data source or geography from the owning CKAN organization", () => {
    const metadata = getIndicatorMetadata({ ...indicatorPackage, extras: [] });
    expect(metadata.source).toBe("");
    expect(metadata.geography).toBe("");
    expect(normalizeObservation({ period: 2024, value: 1 }).region).toBe(
      "Wilayah tidak dicantumkan",
    );
  });

  it("selects only a DataStore-active resource for chart/table observations and respects explicit data role", () => {
    expect(getIndicatorResource(indicatorPackage).id).toBe("ipm-table");
    const secondPreferred = {
      ...indicatorPackage,
      resources: [
        {
          id: "supporting-table",
          state: "active",
          private: false,
          datastore_active: true,
        },
        {
          id: "canonical-table",
          state: "active",
          private: false,
          datastore_active: true,
          extras: [{ key: "portal_resource_role", value: "data" }],
        },
      ],
    };
    expect(getIndicatorResource(secondPreferred).id).toBe("canonical-table");
    expect(
      getIndicatorResource({
        ...indicatorPackage,
        resources: [indicatorPackage.resources[1]],
      }),
    ).toBeNull();
    expect(
      getIndicatorResource({
        ...indicatorPackage,
        resources: [{ ...indicatorPackage.resources[0], state: "draft" }],
      }),
    ).toBeNull();
  });

  it("normalizes numerical observations without inventing a number", () => {
    expect(
      normalizeObservation({
        period: 2024,
        region: "Wajo",
        value: "75.42",
        unit: "poin",
      }),
    ).toMatchObject({
      period: "2024",
      region: "Wajo",
      value: "75.42",
      numericValue: 75.42,
      unit: "poin",
    });
    expect(
      normalizeObservation({ period: "2024", value: "tidak tersedia" })
        .numericValue,
    ).toBeNull();
    expect(
      normalizeObservation({ period: 2024, value: null }).value,
    ).toBeNull();
  });
});

describe("native CKAN objects for infographics", () => {
  it("recognizes a public infographic using its CKAN tag", () => {
    expect(isPublicInfographicPackage(infographicPackage)).toBe(true);
    expect(
      isPublicInfographicPackage({ ...infographicPackage, private: true }),
    ).toBe(false);
    expect(
      isPublicInfographicPackage({ ...infographicPackage, state: "draft" }),
    ).toBe(false);
    expect(
      isPublicInfographicPackage({
        ...infographicPackage,
        tags: [{ name: "kesehatan" }],
      }),
    ).toBe(false);
  });

  it("detects image MIME types and excludes private/deleted resources", () => {
    expect(isImageResource(infographicPackage.resources[0])).toBe(true);
    expect(
      isImageResource({
        format: "image/webp",
        url: "https://example.test/a.webp",
      }),
    ).toBe(true);
    expect(isImageResource(infographicPackage.resources[1])).toBe(false);
    expect(
      isImageResource({ ...infographicPackage.resources[0], private: true }),
    ).toBe(false);
    expect(
      isImageResource({ ...infographicPackage.resources[0], state: "draft" }),
    ).toBe(false);
    expect(
      getInfographicResources(infographicPackage).map(
        (resource) => resource.id,
      ),
    ).toEqual(["image-1", "pdf-1"]);
  });
});

describe("CKAN field helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.CKAN_ADMIN_URL;
    delete process.env.NEXT_PUBLIC_CKAN_ADMIN_URL;
  });

  it("supports CKAN extras, direct Scheming fields, tags and resource formats", () => {
    expect(ckanExtraValue(indicatorPackage, ["portal_formula"])).toBe(
      "metode resmi",
    );
    expect(ckanExtraValue({ portal_unit: "persen" }, ["portal_unit"])).toBe(
      "persen",
    );
    expect(ckanPackageCategory({ groups: [{ title: "Kesehatan" }] })).toBe(
      "Kesehatan",
    );
    expect(ckanResourceFormat({ mimetype: "image/png" })).toBe("png");
    expect(
      isGeospatialServiceResource({
        format: "WMS",
        url: "https://maps.example.test/service",
      }),
    ).toBe(true);
    expect(
      isGeospatialServiceResource({
        format: "CSV",
        url: "https://data.example.test/file.csv",
      }),
    ).toBe(false);
    expect(
      isGeospatialServiceResource({
        url_type: "api",
        url: "https://api.example.test/features",
      }),
    ).toBe(true);
    expect(
      ckanResourceExtra(
        { extras: [{ key: "portal_resource_period", value: "2025" }] },
        "portal_resource_period",
      ),
    ).toBe("2025");
  });

  it("rewrites CKAN admin resource-download URLs to the single public origin only", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://data.example.go.id";
    process.env.CKAN_ADMIN_URL = "https://ckan.example.go.id";
    expect(
      publicResourceUrl(
        "https://ckan.example.go.id/dataset/data-x/resource/res-x/download/data.csv",
      ),
    ).toBe(
      "https://data.example.go.id/dataset/data-x/resource/res-x/download/data.csv",
    );
    expect(publicResourceUrl("https://cdn.example.test/file.csv")).toBe(
      "https://cdn.example.test/file.csv",
    );
    expect(
      publicResourceUrl(
        "https://ckan.example.go.id/storage/f/unsafe-internal-path.csv",
      ),
    ).toBeNull();
    expect(publicResourceUrl("http://ckan:5000/files/internal.csv")).toBeNull();
    expect(publicResourceUrl("javascript:alert(1)")).toBeNull();
  });

  it("rewrites download URLs nested in CKAN Action API results without changing external URLs", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://data.example.go.id";
    process.env.CKAN_ADMIN_URL = "https://ckan.example.go.id";
    const result = rewriteCkanDownloadUrls({
      name: "dataset-a",
      resources: [
        {
          url: "https://ckan.example.go.id/dataset/dataset-a/resource/res-a/download/a.csv",
        },
      ],
      external: { url: "https://cdn.example.test/file.csv" },
    });
    expect(result.resources[0].url).toBe(
      "https://data.example.go.id/dataset/dataset-a/resource/res-a/download/a.csv",
    );
    expect(result.external.url).toBe("https://cdn.example.test/file.csv");
  });

  it("recognizes only active public publication packages with the configured tag", () => {
    const item = {
      state: "active",
      private: false,
      tags: [{ name: "portal-publikasi" }],
    };
    expect(isPublicPublicationPackage(item)).toBe(true);
    expect(isPublicPublicationPackage({ ...item, private: true })).toBe(false);
    expect(isPublicPublicationPackage({ ...item, state: "draft" })).toBe(false);
    expect(
      isPublicPublicationPackage({ ...item, tags: [{ name: "laporan" }] }),
    ).toBe(false);
  });

  it("never infers the official publication release date from CKAN metadata timestamps", () => {
    expect(
      getPublicationReleaseDate({
        metadata_created: "2025-03-01",
        metadata_modified: "2025-04-01",
      }),
    ).toBe("");
    expect(
      getPublicationReleaseDate({
        extras: [{ key: "portal_publication_date", value: "2025-03-09" }],
      }),
    ).toBe("2025-03-09");
  });
});

describe("flexible public CKAN search", () => {
  it("maps multiple meaningful terms with OR semantics across CKAN searchable fields", () => {
    const query = buildPublicCatalogQuery("data puskesmas dan sekolah");
    expect(query).toContain('title:"puskesmas"');
    expect(query).toContain('title:"sekolah"');
    expect(query).toContain('res_description:"sekolah"');
    expect(query).toContain(" OR ");
    expect(query).not.toContain('title:"dan"');
  });

  it("falls back to the complete catalog query for stopword-only input", () => {
    expect(buildPublicCatalogQuery("dan atau yang di")).toBe("*:*");
  });
});

describe("public portal summary sourced from CKAN", () => {
  afterEach(() => vi.restoreAllMocks());

  it("counts indicators using the configured CKAN tag instead of hiding the indicator feature", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input) => {
        const url = new URL(String(input));
        const action = url.pathname.split("/").at(-1);
        let result;
        if (action === "organization_list")
          result = [
            { name: "bappeda-wajo", state: "active" },
            { name: "old", state: "deleted" },
          ];
        else if (
          url.searchParams.getAll("fq").includes("tags:portal-indikator")
        )
          result = { count: 2, results: [] };
        else result = { count: 37, results: [] };
        return new Response(JSON.stringify({ success: true, result }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      });

    const response = await getPublicPortalStatsResult();
    expect(response).toMatchObject({
      data: { datasets: 37, organizations: 1, indicators: 2 },
      unavailable: false,
    });
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(
      fetchSpy.mock.calls.some(([input]) =>
        new URL(String(input)).searchParams
          .getAll("fq")
          .includes("tags:portal-indikator"),
      ),
    ).toBe(true);
  });
});

describe("public CKAN API response sanitization", () => {
  it("removes private and inactive resources embedded in otherwise public datasets", () => {
    const pkg = {
      name: "public-dataset",
      resources: [
        { id: "public-resource", private: false, state: "active" },
        {
          id: "private-resource",
          private: true,
          state: "active",
          url: "http://ckan:5000/private.csv",
        },
        { id: "deleted-resource", private: false, state: "deleted" },
      ],
    };
    expect(
      sanitizePublicPackage(pkg).resources.map((resource) => resource.id),
    ).toEqual(["public-resource"]);
    expect(pkg.resources).toHaveLength(3);
  });

  it("sanitizes embedded search results without changing counts or facet metadata", () => {
    const result = {
      count: 12,
      results: [
        { name: "dataset", resources: [{ id: "private", private: true }] },
      ],
      search_facets: { groups: { items: [] } },
    };
    expect(sanitizePublicSearchResult(result)).toMatchObject({
      count: 12,
      results: [{ name: "dataset", resources: [] }],
      search_facets: { groups: { items: [] } },
    });
  });

  it("redacts CKAN actor identifiers from public activity records", () => {
    expect(
      sanitizePublicActivity([
        {
          id: "activity",
          user: "staff-admin",
          user_id: "internal-user-id",
          activity_user_id: "user-123",
          activity_type: "changed package",
          data: { private_snapshot: true },
        },
      ]),
    ).toEqual([{ id: "activity", activity_type: "changed package" }]);
  });
});

describe("CKAN-driven public category cards", () => {
  afterEach(() => vi.restoreAllMocks());

  it("keeps CKAN group IDs and exact public dataset counts, ordered by count", () => {
    expect(
      normalizePublicCategoryFacets([
        { id: "pendidikan", name: "Pendidikan", count: 8 },
        { id: "kesehatan", name: "Kesehatan", count: "14" },
        { id: "ekonomi", name: "Ekonomi", count: 0 },
      ]),
    ).toEqual([
      { id: "kesehatan", name: "Kesehatan", count: 14 },
      { id: "pendidikan", name: "Pendidikan", count: 8 },
      { id: "ekonomi", name: "Ekonomi", count: 0 },
    ]);
  });

  it("rejects invalid category identifiers and normalizes missing counts", () => {
    expect(
      normalizePublicCategoryFacets([
        { id: "../admin", name: "Tidak valid", count: 999 },
        { id: "kependudukan", name: "Kependudukan" },
        null,
      ]),
    ).toEqual([{ id: "kependudukan", name: "Kependudukan", count: 0 }]);
  });

  it("reads dataset counts from CKAN package_search group facets", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          result: {
            results: [],
            search_facets: {
              groups: {
                items: [
                  { name: "kesehatan", display_name: "Kesehatan", count: 12 },
                  { name: "pendidikan", display_name: "Pendidikan", count: 7 },
                ],
              },
              organization: { items: [] },
              extras_portal_reference_period: { items: [] },
            },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const response = await getPublishedDatasetFacetsResult();
    expect(response.unavailable).toBe(false);
    expect(response.data.categories).toEqual([
      { id: "kesehatan", name: "Kesehatan", count: 12 },
      { id: "pendidikan", name: "Pendidikan", count: 7 },
    ]);
  });
});
