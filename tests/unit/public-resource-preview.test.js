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
  it("allows an authorized CKAN session to preview a private resource through the same URL", async () => {
    ckanAction.mockImplementation(async (action, _params, options) => {
      expect(options.sessionCookie).toBe("signed-organization-member");
      if (action === "resource_show")
        return {
          id: resourceId,
          package_id: "private-dataset",
          state: "active",
          private: true,
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
