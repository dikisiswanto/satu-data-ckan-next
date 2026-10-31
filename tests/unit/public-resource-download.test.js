import { afterEach, describe, expect, it, vi } from "vitest";

const { ckanAction } = vi.hoisted(() => ({ ckanAction: vi.fn() }));
vi.mock("@/lib/ckan/client", () => ({ ckanAction }));

import { GET } from "@/app/(public)/dataset/[slug]/resource/[resourceId]/download/[filename]/route";

const datasetId = "9c70ae22-cd50-4e14-8887-d7574abfface";
const resourceId = "3c2e4f10-6c61-4a2c-a3db-b96db879889c";
const filename = "menara-telekomunikasi-di-kabupaten-wajo-tahun-2025.xlsx";
const downloadPath = `/dataset/${datasetId}/resource/${resourceId}/download/${filename}`;

function fixtures({
  privateDataset = false,
  privateResource = false,
  resourceUrl = `https://data.silirdev.com${downloadPath}`,
} = {}) {
  ckanAction.mockImplementation(async (action) => {
    if (action === "resource_show")
      return {
        id: resourceId,
        package_id: datasetId,
        name: filename,
        state: "active",
        private: privateResource,
        url: resourceUrl,
        mimetype:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    if (action === "file_show")
      return {
        id: "c45b4a89-ee8c-4ee0-8a58-3f5af84a708d",
        name: filename,
        state: "active",
        owner_info: { owner_type: "resource", owner_id: resourceId },
      };
    if (action === "package_show")
      return {
        id: datasetId,
        name: "data-menara-telekomunikasi",
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
  ckanAction.mockReset();
});

describe("public CKAN resource download", () => {
  it("serves the public 2025 XLSX resource via the internal CKAN origin", async () => {
    fixtures();
    const upstreamFetch = vi.fn(async (url, options) => {
      expect(String(url)).toBe(`http://ckan:5000${downloadPath}`);
      expect(options.redirect).toBe("manual");
      return new Response("xlsx-binary", {
        status: 200,
        headers: {
          "content-type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "content-length": "11",
          "accept-ranges": "bytes",
        },
      });
    });
    vi.stubGlobal("fetch", upstreamFetch);
    const response = await GET(
      new Request(`https://data.silirdev.com${downloadPath}`),
      {
        params: Promise.resolve({ slug: datasetId, resourceId, filename }),
      },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain(
      encodeURIComponent(filename),
    );
    expect(await response.text()).toBe("xlsx-binary");
    expect(ckanAction).toHaveBeenCalledTimes(2);
  });

  it.each([
    "/file/c45b4a89-ee8c-4ee0-8a58-3f5af84a708d",
    "/file/download/c45b4a89-ee8c-4ee0-8a58-3f5af84a708d",
  ])(
    "resolves FileStore-backed resource URLs through CKAN 2.12 file.download (%s)",
    async (filePath) => {
      fixtures({ resourceUrl: `https://ckan.example.test${filePath}` });
      const upstreamFetch = vi.fn(async (url) => {
        expect(String(url)).toBe(
          "http://ckan:5000/file/download/c45b4a89-ee8c-4ee0-8a58-3f5af84a708d",
        );
        return new Response("xlsx-binary", {
          status: 200,
          headers: {
            "content-type":
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          },
        });
      });
      vi.stubGlobal("fetch", upstreamFetch);
      const response = await GET(
        new Request(`https://data.silirdev.com${downloadPath}`),
        {
          params: Promise.resolve({ slug: datasetId, resourceId, filename }),
        },
      );
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("xlsx-binary");
      expect(ckanAction.mock.calls.map(([action]) => action)).toEqual([
        "resource_show",
        "package_show",
        "file_show",
      ]);
    },
  );

  it("rejects a FileStore ID whose owner does not match the requested resource", async () => {
    fixtures({
      resourceUrl:
        "https://ckan.example.test/file/c45b4a89-ee8c-4ee0-8a58-3f5af84a708d",
    });
    ckanAction.mockImplementation(async (action) => {
      if (action === "resource_show")
        return {
          id: resourceId,
          package_id: datasetId,
          name: filename,
          state: "active",
          url: "https://ckan.example.test/file/c45b4a89-ee8c-4ee0-8a58-3f5af84a708d",
          mimetype:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        };
      if (action === "package_show")
        return {
          id: datasetId,
          name: "data-menara-telekomunikasi",
          state: "active",
          resources: [{ id: resourceId, state: "active" }],
        };
      if (action === "file_show")
        return {
          id: "c45b4a89-ee8c-4ee0-8a58-3f5af84a708d",
          owner_info: {
            owner_type: "resource",
            owner_id: "another-resource-id",
          },
        };
      throw new Error(`unexpected action ${action}`);
    });
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const response = await GET(
      new Request(`https://data.silirdev.com${downloadPath}`),
      {
        params: Promise.resolve({ slug: datasetId, resourceId, filename }),
      },
    );
    expect(response.status).toBe(404);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("allows legitimate JSON and plain-text resources", async () => {
    fixtures();
    for (const [filenameValue, contentType] of [
      ["catalog.json", "application/json"],
      ["readme.txt", "text/plain; charset=utf-8"],
    ]) {
      const upstreamFetch = vi.fn(
        async () =>
          new Response("valid content", {
            status: 200,
            headers: { "content-type": contentType },
          }),
      );
      vi.stubGlobal("fetch", upstreamFetch);
      const response = await GET(
        new Request(`https://data.silirdev.com${downloadPath}`),
        {
          params: Promise.resolve({
            slug: datasetId,
            resourceId,
            filename: filenameValue,
          }),
        },
      );
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("valid content");
    }
  });

  it("rejects a filename that does not match the CKAN resource URL", async () => {
    fixtures();
    const response = await GET(
      new Request(`https://data.silirdev.com${downloadPath}`),
      {
        params: Promise.resolve({
          slug: datasetId,
          resourceId,
          filename: "other-file.xlsx",
        }),
      },
    );
    expect(response.status).toBe(404);
  });

  it("rejects a CKAN login page returned as a successful HTML download", async () => {
    fixtures();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("<html>Login</html>", {
            status: 200,
            headers: { "content-type": "text/html" },
          }),
      ),
    );
    const response = await GET(
      new Request(`https://data.silirdev.com${downloadPath}`),
      {
        params: Promise.resolve({ slug: datasetId, resourceId, filename }),
      },
    );
    expect(response.status).toBe(502);
  });

  it("does not expose private datasets or resources", async () => {
    fixtures({ privateDataset: true });
    const response = await GET(
      new Request("https://data.silirdev.com/download"),
      {
        params: Promise.resolve({ slug: datasetId, resourceId, filename }),
      },
    );
    expect(response.status).toBe(404);
  });

  it.each(["resource_show", "package_show"])(
    "normalizes CKAN %s permission-denied for an unpublished dataset to a quiet 404",
    async (deniedAction) => {
      ckanAction.mockImplementation(async (action) => {
        if (action === deniedAction) {
          throw Object.assign(
            new Error("Not authorized to read this dataset"),
            { status: 403 },
          );
        }
        if (action === "resource_show")
          return {
            id: resourceId,
            package_id: datasetId,
            name: filename,
            state: "active",
            private: false,
            url: `https://data.silirdev.com${downloadPath}`,
          };
        throw new Error(`unexpected action ${action}`);
      });
      const upstreamFetch = vi.fn();
      vi.stubGlobal("fetch", upstreamFetch);
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const response = await GET(
        new Request(`https://data.silirdev.com${downloadPath}`),
        {
          params: Promise.resolve({ slug: datasetId, resourceId, filename }),
        },
      );
      expect(response.status).toBe(404);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(upstreamFetch).not.toHaveBeenCalled();
      expect(consoleError).not.toHaveBeenCalled();
    },
  );
});
