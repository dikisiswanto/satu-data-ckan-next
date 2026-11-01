import { afterEach, describe, expect, it, vi } from "vitest";

const { ckanAction } = vi.hoisted(() => ({ ckanAction: vi.fn() }));
vi.mock("@/lib/ckan/client", () => ({ ckanAction }));

import { GET } from "@/app/api/3/action/[...action]/route";

afterEach(() => ckanAction.mockReset());

function request(action, id, cookie = "") {
  return GET(
    new Request(
      `https://data.silirdev.com/api/3/action/${action}?id=${encodeURIComponent(id)}`,
      {
        headers: cookie ? { Cookie: cookie } : {},
      },
    ),
    {
      params: Promise.resolve({ action: [action] }),
    },
  );
}

describe("CKAN visibility facade: public vs session-authorized", () => {
  it("returns the same 404 for an anonymous caller when CKAN denies a private package", async () => {
    ckanAction.mockRejectedValue(
      Object.assign(new Error("Not authorized"), { status: 403 }),
    );
    const response = await request("package_show", "dataset-private");
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.__type).toBe("Not Found");
  });

  it("fails closed for legacy string-valued private dataset markers", async () => {
    ckanAction.mockResolvedValue({
      id: "dataset-private",
      name: "dataset-private",
      state: "active",
      private: "true",
    });
    const response = await request("package_show", "dataset-private");
    expect(response.status).toBe(404);
    expect(ckanAction).toHaveBeenCalledWith(
      "package_show",
      { id: "dataset-private" },
      { revalidate: 0 },
    );
  });

  it("returns 404 when CKAN denies resource metadata to an anonymous caller", async () => {
    ckanAction.mockRejectedValue(
      Object.assign(new Error("Not authorized"), { status: 403 }),
    );
    const response = await request("resource_show", "resource-private");
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.__type).toBe("Not Found");
  });

  it("verifies the parent package before exposing an anonymous resource", async () => {
    ckanAction.mockImplementation(async (action) => {
      if (action === "resource_show")
        return { id: "resource-1", package_id: "dataset-1", state: "active" };
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

  it("allows an authorized CKAN session to read a private dataset and strips unsupported resource-private markers", async () => {
    ckanAction.mockImplementation(async (action, params, options) => {
      expect(options.sessionCookie).toBe("signed-admin-session");
      expect(action).toBe("package_show");
      expect(params.id).toBe("dataset-private");
      return {
        id: "dataset-private",
        name: "dataset-private",
        state: "active",
        private: true,
        resources: [
          { id: "resource-public", state: "active" },
          { id: "resource-private-marker", state: "active", private: true },
        ],
      };
    });
    const response = await request(
      "package_show",
      "dataset-private",
      "analytics=ignored; wajo_ckan_session=signed-admin-session; other=ignored",
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const body = await response.json();
    expect(body.result.private).toBe(true);
    expect(body.result.resources.map((resource) => resource.id)).toEqual([
      "resource-public",
    ]);
    expect(ckanAction).toHaveBeenCalledTimes(1);
  });

  it("allows resource metadata for a CKAN-authorized private parent dataset only when no unsupported resource-private marker is set", async () => {
    ckanAction.mockImplementation(async (action, params, options) => {
      expect(options.sessionCookie).toBe("signed-member-session");
      if (action === "resource_show")
        return {
          id: "resource-1",
          package_id: "dataset-private",
          state: "active",
        };
      if (action === "package_show")
        return {
          id: "dataset-private",
          name: "dataset-private",
          state: "active",
          private: true,
        };
      throw new Error(`unexpected action ${action}`);
    });
    const response = await request(
      "resource_show",
      "resource-1",
      "wajo_ckan_session=signed-member-session",
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("does not let an authenticated session bypass the unsupported resource.private marker", async () => {
    ckanAction.mockImplementation(async (action, _params, options) => {
      expect(options.sessionCookie).toBe("signed-member-session");
      if (action === "resource_show")
        return {
          id: "resource-private",
          package_id: "dataset-private",
          state: "active",
          private: true,
        };
      throw new Error(`unexpected action ${action}`);
    });
    const response = await request(
      "resource_show",
      "resource-private",
      "wajo_ckan_session=signed-member-session",
    );
    expect(response.status).toBe(404);
    expect(ckanAction.mock.calls.map(([action]) => action)).toEqual([
      "resource_show",
    ]);
  });

  it("does not let a present but invalid session bypass CKAN authorization", async () => {
    ckanAction.mockRejectedValue(
      Object.assign(new Error("Not authorized"), { status: 403 }),
    );
    const response = await request(
      "package_show",
      "dataset-private",
      "wajo_ckan_session=forged-or-expired-cookie",
    );
    expect(response.status).toBe(404);
  });

  it("does not cache package_search responses where dataset visibility can change", async () => {
    ckanAction.mockResolvedValue({
      count: 1,
      results: [
        { id: "dataset-public", name: "dataset-public", resources: [] },
      ],
    });
    const response = await GET(
      new Request(
        "https://data.silirdev.com/api/3/action/package_search?q=dataset&rows=10",
      ),
      {
        params: Promise.resolve({ action: ["package_search"] }),
      },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(ckanAction).toHaveBeenCalledWith(
      "package_search",
      expect.objectContaining({
        q: '"dataset"',
        rows: 10,
        include_private: false,
      }),
      { revalidate: 0, sessionCookie: null },
    );
  });

  it("strips per-resource private markers instead of querying resource_show as a false per-resource ACL", async () => {
    ckanAction.mockImplementation(async (action) => {
      if (action === "package_show")
        return {
          id: "dataset-public",
          name: "dataset-public",
          private: false,
          state: "active",
          resources: [
            { id: "resource-public", state: "active" },
            { id: "resource-private", private: true, state: "active" },
          ],
        };
      throw new Error(`unexpected action ${action}`);
    });
    const response = await request(
      "package_show",
      "dataset-public",
      "wajo_ckan_session=signed-but-not-resource-authorized",
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.result.resources.map((resource) => resource.id)).toEqual([
      "resource-public",
    ]);
    expect(ckanAction.mock.calls.map(([action]) => action)).toEqual([
      "package_show",
    ]);
  });
});
