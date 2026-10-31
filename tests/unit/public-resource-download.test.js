import { afterEach, describe, expect, it, vi } from "vitest";

const { ckanAction } = vi.hoisted(() => ({ ckanAction: vi.fn() }));
vi.mock("@/lib/ckan/client", () => ({ ckanAction }));

import { GET } from "@/app/(public)/dataset/[slug]/resource/[resourceId]/download/[filename]/route";

const datasetId = "9c70ae22-cd50-4e14-8887-d7574abfface";
const resourceId = "3c2e4f10-6c61-4a2c-a3db-b96db879889c";
const filename = "menara-telekomunikasi-di-kabupaten-wajo-tahun-2025.xlsx";
const downloadPath = `/dataset/${datasetId}/resource/${resourceId}/download/${filename}`;

function fixtures({ privateDataset = false, privateResource = false } = {}) {
  ckanAction.mockImplementation(async (action) => {
    if (action === "resource_show")
      return {
        id: resourceId,
        package_id: datasetId,
        name: filename,
        state: "active",
        private: privateResource,
        url: `https://data.silirdev.com${downloadPath}`,
        mimetype:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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
});
