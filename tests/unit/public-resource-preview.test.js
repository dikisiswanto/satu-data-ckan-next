import { afterEach, describe, expect, it, vi } from "vitest";

const { ckanAction } = vi.hoisted(() => ({ ckanAction: vi.fn() }));
vi.mock("@/lib/ckan/client", () => ({ ckanAction }));

import { GET } from "@/app/api/public/resource-preview/route";

const resourceId = "3e87a017-1db8-44c4-a790-0d298169127c";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  ckanAction.mockReset();
});

describe("CKAN CSV preview session authorization", () => {
  it("allows an authorized CKAN session to preview a resource in a private dataset", async () => {
    ckanAction.mockImplementation(async (action, _params, options) => {
      expect(options.sessionCookie).toBe("signed-organization-member");
      if (action === "resource_show")
        return {
          id: resourceId,
          package_id: "private-dataset",
          state: "active",
          format: "CSV",
          url: `https://data.silirdev.com/dataset/private-dataset/resource/${resourceId}/download/data.csv`,
        };
      if (action === "package_show")
        return { id: "private-dataset", state: "active", private: true };
      throw new Error(`unexpected action ${action}`);
    });
    const fetcher = vi.fn(async (_url, options) => {
      expect(options.headers.Cookie).toBe(
        "wajo_ckan_session=signed-organization-member",
      );
      return new Response("name,value\nA,1\nB,2\n", {
        status: 200,
        headers: { "content-type": "text/csv" },
      });
    });
    vi.stubGlobal("fetch", fetcher);

    const response = await GET(
      new Request(
        `https://data.silirdev.com/api/public/resource-preview?resource_id=${resourceId}`,
        {
          headers: { Cookie: "wajo_ckan_session=signed-organization-member" },
        },
      ),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect((await response.json()).result.state).toBe("ready");
  });

  it("does not let a CKAN session bypass an unsupported resource.private marker", async () => {
    ckanAction.mockImplementation(async (action, _params, options) => {
      expect(options.sessionCookie).toBe("signed-organization-member");
      if (action === "resource_show")
        return {
          id: resourceId,
          package_id: "private-dataset",
          state: "active",
          private: true,
          format: "CSV",
        };
      throw new Error(`unexpected action ${action}`);
    });
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const response = await GET(
      new Request(
        `https://data.silirdev.com/api/public/resource-preview?resource_id=${resourceId}`,
        {
          headers: { Cookie: "wajo_ckan_session=signed-organization-member" },
        },
      ),
    );
    expect(response.status).toBe(404);
    expect(fetcher).not.toHaveBeenCalled();
    expect(ckanAction.mock.calls.map(([action]) => action)).toEqual([
      "resource_show",
    ]);
  });

  it("fails closed for string-valued resource.private markers despite a valid session", async () => {
    ckanAction.mockImplementation(async (action) => {
      if (action === "resource_show")
        return {
          id: resourceId,
          package_id: "private-dataset",
          state: "active",
          private: "true",
          format: "CSV",
        };
      throw new Error(`unexpected action ${action}`);
    });
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const response = await GET(
      new Request(
        `https://data.silirdev.com/api/public/resource-preview?resource_id=${resourceId}`,
        {
          headers: { Cookie: "wajo_ckan_session=signed-organization-member" },
        },
      ),
    );
    expect(response.status).toBe(404);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("keeps an anonymous request hidden when CKAN denies private resource metadata", async () => {
    ckanAction.mockRejectedValue(
      Object.assign(new Error("Not authorized"), { status: 403 }),
    );
    const response = await GET(
      new Request(
        `https://data.silirdev.com/api/public/resource-preview?resource_id=${resourceId}`,
      ),
    );
    expect(response.status).toBe(404);
  });
});
