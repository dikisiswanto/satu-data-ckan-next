import { afterEach, describe, expect, it, vi } from "vitest";

const { ckanAction, searchPackages } = vi.hoisted(() => ({
  ckanAction: vi.fn(),
  searchPackages: vi.fn(),
}));
vi.mock("@/lib/ckan/client", () => ({ ckanAction, searchPackages }));
vi.mock("@/lib/data/public-indicators", () => ({
  getPublishedIndicatorsResult: vi.fn(),
}));
vi.mock("react", () => ({ cache: (callback) => callback }));

import {
  getPublishedDatasetBySlugResult,
  getPublishedDatasetsResult,
} from "@/lib/data/public";

afterEach(() => {
  ckanAction.mockReset();
  searchPackages.mockReset();
});

describe("public dataset visibility", () => {
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
      { status: 502, detail: null },
    );
  });

  it("rejects a private package returned to an anonymous caller", async () => {
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

  it("rejects legacy string-valued private package markers for anonymous detail requests", async () => {
    ckanAction.mockResolvedValue({
      id: "private-id",
      name: "dataset-private",
      private: "true",
      state: "active",
    });
    await expect(
      getPublishedDatasetBySlugResult("dataset-private"),
    ).resolves.toEqual({
      data: null,
      unavailable: false,
    });
  });

  it("keeps string false package markers public instead of treating non-empty strings as private", async () => {
    ckanAction.mockResolvedValue({
      id: "public-id",
      name: "dataset-public",
      private: "false",
      state: "active",
    });
    const result = await getPublishedDatasetBySlugResult("dataset-public");
    expect(result.data).toMatchObject({ id: "public-id", private: "false" });
    expect(result.unavailable).toBe(false);
  });

  it("returns a CKAN-authorized private dataset but strips unsupported per-resource private markers", async () => {
    ckanAction.mockImplementation(async (action, params, options) => {
      expect(options.sessionCookie).toBe("signed-member-session");
      expect(action).toBe("package_show");
      expect(params).toEqual({ id: "dataset-private" });
      return {
        id: "private-id",
        name: "dataset-private",
        private: true,
        state: "active",
        resources: [
          { id: "public-resource", state: "active" },
          {
            id: "unsupported-private-resource",
            private: true,
            state: "active",
          },
        ],
      };
    });
    const result = await getPublishedDatasetBySlugResult(
      "dataset-private",
      "signed-member-session",
    );
    expect(result.data.private).toBe(true);
    expect(result.data.resources.map((resource) => resource.id)).toEqual([
      "public-resource",
    ]);
    expect(ckanAction).toHaveBeenCalledTimes(1);
  });

  it("shows CKAN-authorized private datasets in the authenticated catalogue without treating a cookie as resource ACL", async () => {
    searchPackages.mockResolvedValue({
      count: 1,
      results: [
        {
          id: "private-id",
          name: "dataset-private",
          private: true,
          state: "active",
          resources: [
            { id: "public-resource", state: "active" },
            {
              id: "unsupported-private-resource",
              private: true,
              state: "active",
            },
          ],
        },
      ],
    });

    const result = await getPublishedDatasetsResult(
      { limit: 12 },
      "signed-admin-session",
    );

    expect(result.unavailable).toBe(false);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].private).toBe(true);
    expect(result.data[0].resources.map((resource) => resource.id)).toEqual([
      "public-resource",
    ]);
    expect(searchPackages).toHaveBeenCalledWith(
      expect.objectContaining({ sessionCookie: "signed-admin-session" }),
    );
    expect(searchPackages.mock.calls[0][0]).not.toHaveProperty(
      "includePrivateResources",
    );
    expect(ckanAction).not.toHaveBeenCalled();
  });

  it("strips unsupported private resource markers from catalogue results even when a session exists", async () => {
    searchPackages.mockResolvedValue({
      count: 1,
      results: [
        {
          id: "public-id",
          name: "dataset-public",
          private: false,
          state: "active",
          resources: [
            { id: "public-resource", state: "active" },
            {
              id: "unsupported-private-resource",
              private: true,
              state: "active",
            },
          ],
        },
      ],
    });

    const result = await getPublishedDatasetsResult(
      { limit: 12 },
      "signed-but-unauthorized-session",
    );

    expect(result.data[0].resources.map((resource) => resource.id)).toEqual([
      "public-resource",
    ]);
    expect(ckanAction).not.toHaveBeenCalled();
  });
});
