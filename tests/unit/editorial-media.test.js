import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { ckanAction } = vi.hoisted(() => ({ ckanAction: vi.fn() }));
vi.mock("@/lib/ckan/client", () => ({ ckanAction }));

import { GET, HEAD } from "@/app/api/editorial-media/[fileId]/route";

const fileId = "226056e2-6f83-47c5-8bd2-102e2b82ab9a";
const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);

beforeEach(() => {
  // CI uses 127.0.0.1:8010 for integration smoke tests; unit mocks
  // deliberately target the stable in-network CKAN service origin.
  vi.stubEnv("CKAN_API_INTERNAL_URL", "http://ckan:5000/api/3/action");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  ckanAction.mockReset();
});

describe("public editorial media proxy", () => {
  it("only serves a CKAN file owned by the public editorial media owner", async () => {
    ckanAction.mockResolvedValue({
      id: fileId,
      content_type: "image/png",
      size: png.byteLength,
      owner_info: {
        owner_type: "wajo_media",
        owner_id: "public-editorial-media",
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url) => {
        expect(String(url)).toBe(`http://ckan:5000/file/download/${fileId}`);
        return new Response(png, {
          status: 200,
          headers: { "content-type": "image/png" },
        });
      }),
    );
    const response = await GET(
      new Request(`https://data.example.test/api/editorial-media/${fileId}`),
      { params: Promise.resolve({ fileId }) },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(png);
  });

  it("does not expose other CKAN files even if their MIME type is an image", async () => {
    ckanAction.mockResolvedValue({
      id: fileId,
      content_type: "image/png",
      size: png.byteLength,
      owner_info: { owner_type: "resource", owner_id: "resource-1" },
    });
    const response = await GET(new Request("https://data.example.test/media"), {
      params: Promise.resolve({ fileId }),
    });
    expect(response.status).toBe(404);
  });

  it("responds to HEAD without streaming file contents", async () => {
    ckanAction.mockResolvedValue({
      id: fileId,
      content_type: "image/png",
      size: png.byteLength,
      owner_info: {
        owner_type: "wajo_media",
        owner_id: "public-editorial-media",
      },
    });
    const response = await HEAD(
      new Request("https://data.example.test/media", { method: "HEAD" }),
      { params: Promise.resolve({ fileId }) },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-length")).toBe(String(png.byteLength));
  });
});
