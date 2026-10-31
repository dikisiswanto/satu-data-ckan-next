import { afterEach, describe, expect, it, vi } from "vitest";

const { ckanAction } = vi.hoisted(() => ({ ckanAction: vi.fn() }));
vi.mock("@/lib/ckan/client", () => ({ ckanAction }));

import { GET, HEAD } from "@/app/api/public/ckan-file/[fileId]/route";

const fileId = "3c2e4f10-6c61-4a2c-a3db-b96db879889c";
const resourceId = "8c2e4f10-6c61-4a2c-a3db-b96db879889c";
const datasetId = "9c70ae22-cd50-4e14-8887-d7574abfface";
const params = { params: Promise.resolve({ fileId }) };

function fixtures({
  privateDataset = false,
  privateResource = false,
  mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
} = {}) {
  ckanAction.mockImplementation(async (action) => {
    if (action === "file_show")
      return {
        id: fileId,
        name: "data-menara-wajo.xlsx",
        content_type: mime,
        owner_info: { owner_type: "resource", owner_id: resourceId },
      };
    if (action === "resource_show")
      return {
        id: resourceId,
        package_id: datasetId,
        state: "active",
        private: privateResource,
      };
    if (action === "package_show")
      return {
        id: datasetId,
        state: "active",
        private: privateDataset,
        resources: [
          { id: resourceId, state: "active", private: privateResource },
        ],
      };
    throw new Error(`unexpected action ${action}`);
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  ckanAction.mockReset();
  delete process.env.CKAN_API_INTERNAL_URL;
});

describe("public CKAN File API proxy", () => {
  it("streams a file only after its resource and parent dataset are verified as public", async () => {
    fixtures();
    const upstreamFetch = vi.fn(async (url, options) => {
      expect(String(url)).toBe(`http://ckan:5000/file/download/${fileId}`);
      expect(options.redirect).toBe("manual");
      return new Response("xlsx-content", {
        status: 200,
        headers: {
          "content-type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "content-length": "12",
        },
      });
    });
    vi.stubGlobal("fetch", upstreamFetch);

    const response = await GET(
      new Request(`https://data.silirdev.com/api/public/ckan-file/${fileId}`),
      params,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await response.text()).toBe("xlsx-content");
    expect(ckanAction.mock.calls.map(([action]) => action)).toEqual([
      "file_show",
      "resource_show",
      "package_show",
    ]);
  });

  it("hides file ids that belong to private resources or private datasets", async () => {
    fixtures({ privateDataset: true });
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const response = await GET(
      new Request("https://data.silirdev.com/file"),
      params,
    );
    expect(response.status).toBe(404);
    expect(fetcher).not.toHaveBeenCalled();

    fixtures({ privateResource: true });
    const privateResourceResponse = await GET(
      new Request("https://data.silirdev.com/file"),
      params,
    );
    expect(privateResourceResponse.status).toBe(404);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects non-public CKAN ownership types and unsupported active content", async () => {
    ckanAction.mockResolvedValue({
      id: fileId,
      content_type: "image/svg+xml",
      owner_info: {
        owner_type: "wajo_media",
        owner_id: "public-editorial-media",
      },
    });
    const response = await GET(
      new Request("https://data.silirdev.com/file"),
      params,
    );
    expect(response.status).toBe(404);

    fixtures({ mime: "text/html" });
    const htmlResponse = await GET(
      new Request("https://data.silirdev.com/file"),
      params,
    );
    expect(htmlResponse.status).toBe(415);
  });

  it("preserves range requests and supports HEAD", async () => {
    fixtures();
    const fetcher = vi.fn(async (_url, options) => {
      expect(options.method).toBe("HEAD");
      expect(options.headers.get("Range")).toBe("bytes=0-99");
      return new Response(null, {
        status: 206,
        headers: {
          "content-type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "content-length": "100",
          "content-range": "bytes 0-99/1000",
        },
      });
    });
    vi.stubGlobal("fetch", fetcher);
    const response = await HEAD(
      new Request("https://data.silirdev.com/file", {
        method: "HEAD",
        headers: { Range: "bytes=0-99" },
      }),
      params,
    );
    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe("bytes 0-99/1000");
    expect(response.body).toBeNull();
  });
});
