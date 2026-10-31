import { afterEach, describe, expect, it, vi } from "vitest";

const { ckanAction } = vi.hoisted(() => ({ ckanAction: vi.fn() }));
vi.mock("@/lib/ckan/client", () => ({ ckanAction }));

import { GET } from "@/app/api/3/action/[...action]/route";

afterEach(() => ckanAction.mockReset());

function request(action, id) {
  return GET(
    new Request(
      `https://data.silirdev.com/api/3/action/${action}?id=${encodeURIComponent(id)}`,
    ),
    {
      params: Promise.resolve({ action: [action] }),
    },
  );
}

describe("public CKAN visibility facade", () => {
  it("returns the same 404 for an unpublished package denied by CKAN", async () => {
    ckanAction.mockRejectedValue(
      Object.assign(new Error("Not authorized"), { status: 403 }),
    );
    const response = await request("package_show", "dataset-private");
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.__type).toBe("Not Found");
  });

  it("returns 404 when CKAN denies resource metadata after a dataset is unpublished", async () => {
    ckanAction.mockRejectedValue(
      Object.assign(new Error("Not authorized"), { status: 403 }),
    );
    const response = await request("resource_show", "resource-private");
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.__type).toBe("Not Found");
  });

  it("verifies the parent package before exposing a resource", async () => {
    ckanAction.mockImplementation(async (action) => {
      if (action === "resource_show")
        return {
          id: "resource-1",
          package_id: "dataset-1",
          state: "active",
          private: false,
        };
      if (action === "package_show")
        throw Object.assign(new Error("Not authorized"), { status: 403 });
      throw new Error(`unexpected action ${action}`);
    });
    const response = await request("resource_show", "resource-1");
    expect(response.status).toBe(404);
    expect(ckanAction.mock.calls.map(([action]) => action)).toEqual([
      "resource_show",
      "package_show",
    ]);
  });
});
