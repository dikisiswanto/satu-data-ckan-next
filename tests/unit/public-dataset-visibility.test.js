import { afterEach, describe, expect, it, vi } from "vitest";

const { ckanAction } = vi.hoisted(() => ({ ckanAction: vi.fn() }));
vi.mock("@/lib/ckan/client", () => ({ ckanAction, searchPackages: vi.fn() }));
vi.mock("@/lib/ckan/public-api-sanitize", () => ({
  sanitizePublicPackage: (value) => value,
  sanitizePublicSearchResult: (value) => value,
  sanitizePublicActivity: (value) => value,
}));
vi.mock("@/lib/data/public-indicators", () => ({
  getPublishedIndicatorsResult: vi.fn(),
}));
vi.mock("react", () => ({ cache: (callback) => callback }));

import { getPublishedDatasetBySlugResult } from "@/lib/data/public";

afterEach(() => ckanAction.mockReset());

describe("public dataset detail visibility", () => {
  it.each([403, 404])(
    "treats CKAN %s for a private/unpublished package as not found",
    async (status) => {
      ckanAction.mockRejectedValue(
        Object.assign(new Error("Not authorized"), { status }),
      );
      await expect(
        getPublishedDatasetBySlugResult("dataset-private"),
      ).resolves.toEqual({
        data: null,
        unavailable: false,
      });
    },
  );

  it("keeps actual upstream failures distinct from unpublished records", async () => {
    ckanAction.mockRejectedValue(
      Object.assign(new Error("Upstream unavailable"), { status: 502 }),
    );
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    await expect(
      getPublishedDatasetBySlugResult("dataset-temporary-error"),
    ).resolves.toEqual({
      data: null,
      unavailable: true,
    });
    expect(consoleError).toHaveBeenCalledWith(
      "ckan_public_dataset_detail_failed",
      { status: 502 },
    );
  });

  it("rejects a package returned as private even when CKAN allows metadata read", async () => {
    ckanAction.mockResolvedValue({
      id: "private-id",
      name: "dataset-private",
      private: true,
      state: "active",
    });
    await expect(
      getPublishedDatasetBySlugResult("dataset-private"),
    ).resolves.toEqual({
      data: null,
      unavailable: false,
    });
  });
});
