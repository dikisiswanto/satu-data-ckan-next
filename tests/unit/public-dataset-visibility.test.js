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

  it("returns a private dataset only when CKAN authorizes its package and private resources", async () => {
    ckanAction.mockImplementation(async (action, params, options) => {
      expect(options.sessionCookie).toBe("signed-member-session");
      if (action === "package_show")
        return {
          id: "private-id",
          name: "dataset-private",
          private: true,
          state: "active",
          resources: [
            { id: "private-resource", private: true, state: "active" },
          ],
        };
      if (action === "resource_show")
        return {
          id: "private-resource",
          package_id: "private-id",
          private: true,
          state: "active",
        };
      throw new Error(`unexpected action ${action}`);
    });
    const result = await getPublishedDatasetBySlugResult(
      "dataset-private",
      "signed-member-session",
    );
    expect(result.data.private).toBe(true);
    expect(result.data.resources).toHaveLength(1);
    expect(ckanAction).toHaveBeenCalledWith(
      "package_show",
      { id: "dataset-private" },
      {
        revalidate: 0,
        sessionCookie: "signed-member-session",
      },
    );
    expect(ckanAction).toHaveBeenCalledWith(
      "resource_show",
      { id: "private-resource" },
      {
        revalidate: 0,
        sessionCookie: "signed-member-session",
      },
    );
  });

  it("omits private resources the current session cannot read from a public dataset", async () => {
    ckanAction.mockImplementation(async (action) => {
      if (action === "package_show")
        return {
          id: "public-id",
          name: "dataset-public",
          private: false,
          state: "active",
          resources: [
            { id: "public-resource", private: false, state: "active" },
            { id: "private-resource", private: true, state: "active" },
          ],
        };
      if (action === "resource_show")
        throw Object.assign(new Error("Not authorized"), { status: 403 });
      throw new Error(`unexpected action ${action}`);
    });
    const result = await getPublishedDatasetBySlugResult(
      "dataset-public",
      "forged-session-cookie",
    );
    expect(result.data.resources.map((resource) => resource.id)).toEqual([
      "public-resource",
    ]);
  });
});
