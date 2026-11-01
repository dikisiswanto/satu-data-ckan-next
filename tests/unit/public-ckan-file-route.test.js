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
  privateFile = false,
  mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
} = {}) {
  ckanAction.mockImplementation(async (action) => {
    if (action === "file_show")
      return {
        id: fileId,
        name: "data-menara-wajo.xlsx",
        content_type: mime,
        private: privateFile,
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

  it("allows a CKAN-authorized private dataset and disables shared caching", async () => {
    fixtures({ privateDataset: true });
    const fetcher = vi.fn(async (_url, options) => {
      expect(options.headers.get("cookie")).toBe(
        "wajo_ckan_session=signed-editor-session",
      );
      return new Response("private-file", {
        status: 200,
        headers: {
          "content-type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      });
    });
    vi.stubGlobal("fetch", fetcher);
    const response = await GET(
      new Request(`https://data.silirdev.com/api/public/ckan-file/${fileId}`, {
        headers: { Cookie: "wajo_ckan_session=signed-editor-session" },
      }),
      params,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.text()).toBe("private-file");
    expect(
      ckanAction.mock.calls.every(
        ([, , options]) => options.sessionCookie === "signed-editor-session",
      ),
    ).toBe(true);
  });

  it("does not treat a present session cookie as permission when CKAN denies the parent dataset", async () => {
    ckanAction.mockImplementation(async (action) => {
      if (action === "file_show")
        return {
          id: fileId,
          name: "data-menara-wajo.xlsx",
          content_type:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          owner_info: { owner_type: "resource", owner_id: resourceId },
        };
      if (action === "resource_show")
        return {
          id: resourceId,
          package_id: datasetId,
          state: "active",
        };
      if (action === "package_show") {
        throw Object.assign(new Error("Not authorized"), { status: 403 });
      }
      throw new Error(`unexpected action ${action}`);
    });
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);

    const response = await GET(
      new Request(`https://data.silirdev.com/api/public/ckan-file/${fileId}`, {
        headers: { Cookie: "wajo_ckan_session=forged-or-expired-session" },
      }),
      params,
    );

    expect(response.status).toBe(404);
    expect(fetcher).not.toHaveBeenCalled();
    expect(ckanAction.mock.calls.map(([action]) => action)).toEqual([
      "file_show",
      "resource_show",
      "package_show",
    ]);
  });

  it("allows a CKAN-authorized private dataset when package_show omits its embedded resource summary", async () => {
    fixtures({ privateDataset: true });
    ckanAction.mockImplementation(async (action) => {
      if (action === "file_show")
        return {
          id: fileId,
          name: "data-menara-wajo.xlsx",
          content_type:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          owner_info: { owner_type: "resource", owner_id: resourceId },
        };
      if (action === "resource_show")
        return {
          id: resourceId,
          package_id: datasetId,
          state: "active",
        };
      if (action === "package_show")
        return {
          id: datasetId,
          state: "active",
          private: true,
          resources: [],
        };
      throw new Error(`unexpected action ${action}`);
    });
    const fetcher = vi.fn(async (_url, options) => {
      expect(options.headers.get("cookie")).toBe(
        "wajo_ckan_session=signed-editor-session",
      );
      return new Response("private-file", {
        status: 200,
        headers: {
          "content-type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      });
    });
    vi.stubGlobal("fetch", fetcher);
    const response = await GET(
      new Request(`https://data.silirdev.com/api/public/ckan-file/${fileId}`, {
        headers: { Cookie: "wajo_ckan_session=signed-editor-session" },
      }),
      params,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.text()).toBe("private-file");
  });

  it("allows a package-owned FileStore file only for the exact CKAN-authorized package", async () => {
    ckanAction.mockImplementation(async (action) => {
      if (action === "file_show")
        return {
          id: fileId,
          name: "package-attachment.pdf",
          content_type: "application/pdf",
          owner_info: { owner_type: "package", owner_id: datasetId },
        };
      if (action === "package_show")
        return {
          id: datasetId,
          name: "dataset-private",
          state: "active",
          private: true,
        };
      throw new Error(`unexpected action ${action}`);
    });
    const fetcher = vi.fn(async (_url, options) => {
      expect(options.headers.get("cookie")).toBe(
        "wajo_ckan_session=signed-editor-session",
      );
      return new Response("package-file", {
        status: 200,
        headers: { "content-type": "application/pdf" },
      });
    });
    vi.stubGlobal("fetch", fetcher);
    const response = await GET(
      new Request(`https://data.silirdev.com/api/public/ckan-file/${fileId}`, {
        headers: { Cookie: "wajo_ckan_session=signed-editor-session" },
      }),
      params,
    );
    expect(response.status).toBe(200);
    expect(ckanAction.mock.calls.map(([action]) => action)).toEqual([
      "file_show",
      "package_show",
    ]);
  });

  it("rejects a package-owned FileStore file when package_show returns a different owner ID", async () => {
    ckanAction.mockImplementation(async (action) => {
      if (action === "file_show")
        return {
          id: fileId,
          content_type: "application/pdf",
          owner_info: { owner_type: "package", owner_id: "another-package" },
        };
      if (action === "package_show")
        return { id: "different-package", state: "active", private: false };
      throw new Error(`unexpected action ${action}`);
    });
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const response = await GET(
      new Request(`https://data.silirdev.com/api/public/ckan-file/${fileId}`),
      params,
    );
    expect(response.status).toBe(404);
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

  it("does not treat a CKAN session as authorization for a non-core resource.private marker", async () => {
    fixtures({ privateDataset: true, privateResource: true });
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const response = await GET(
      new Request(`https://data.silirdev.com/api/public/ckan-file/${fileId}`, {
        headers: { Cookie: "wajo_ckan_session=signed-editor-session" },
      }),
      params,
    );
    expect(response.status).toBe(404);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("does not let a CKAN session bypass an unsupported file.private marker", async () => {
    fixtures({ privateDataset: true, privateFile: true });
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const response = await GET(
      new Request(`https://data.silirdev.com/api/public/ckan-file/${fileId}`, {
        headers: { Cookie: "wajo_ckan_session=signed-editor-session" },
      }),
      params,
    );
    expect(response.status).toBe(404);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("fails closed for string-valued private FileStore and Resource markers", async () => {
    fixtures({ privateDataset: true });
    ckanAction.mockImplementation(async (action) => {
      if (action === "file_show")
        return {
          id: fileId,
          content_type: "application/pdf",
          private: "true",
          owner_info: { owner_type: "resource", owner_id: resourceId },
        };
      throw new Error(`unexpected action ${action}`);
    });
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const response = await GET(
      new Request(`https://data.silirdev.com/api/public/ckan-file/${fileId}`, {
        headers: { Cookie: "wajo_ckan_session=signed-editor-session" },
      }),
      params,
    );
    expect(response.status).toBe(404);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("never caches successful public FileStore bytes in a shared cache", async () => {
    fixtures();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("public-file", {
            status: 200,
            headers: {
              "content-type":
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            },
          }),
      ),
    );
    const response = await GET(
      new Request(`https://data.silirdev.com/api/public/ckan-file/${fileId}`),
      params,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("fails closed when FileStore owner metadata is missing or unsupported", async () => {
    ckanAction.mockResolvedValue({
      id: fileId,
      content_type: "application/pdf",
      resource_id: resourceId,
    });
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const response = await GET(
      new Request(`https://data.silirdev.com/api/public/ckan-file/${fileId}`),
      params,
    );
    expect(response.status).toBe(404);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([401, 403, 404, 410])(
    "normalizes CKAN FileStore %s responses to 404 after metadata authorization",
    async (status) => {
      fixtures({ privateDataset: true });
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response("denied", { status })),
      );
      const response = await GET(
        new Request(
          `https://data.silirdev.com/api/public/ckan-file/${fileId}`,
          {
            headers: { Cookie: "wajo_ckan_session=signed-editor-session" },
          },
        ),
        params,
      );
      expect(response.status).toBe(404);
      expect(response.headers.get("cache-control")).toBe("no-store");
    },
  );

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
