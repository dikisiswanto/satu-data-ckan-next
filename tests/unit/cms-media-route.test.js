import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getPublicCmsBlogPostsResult, getPublicCmsPagesResult } = vi.hoisted(
  () => ({
    getPublicCmsBlogPostsResult: vi.fn(),
    getPublicCmsPagesResult: vi.fn(),
  }),
);
vi.mock("@/lib/cms/pages", () => ({
  getPublicCmsBlogPostsResult,
  getPublicCmsPagesResult,
}));

import { GET } from "@/app/api/cms/media/[filename]/route";

const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);

beforeEach(() => {
  vi.stubEnv("CKAN_API_INTERNAL_URL", "http://ckan:5000/api/3/action");
  getPublicCmsPagesResult.mockResolvedValue({
    data: [{ content: "![foto](/uploads/page_images/portal.png)" }],
    unavailable: false,
  });
  getPublicCmsBlogPostsResult.mockResolvedValue({
    data: [],
    unavailable: false,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  getPublicCmsBlogPostsResult.mockReset();
  getPublicCmsPagesResult.mockReset();
});

describe("public CMS page media proxy", () => {
  it("follows a same-origin redirect and detects generic image MIME", async () => {
    const fetchMock = vi.fn(async (url) => {
      if (String(url) === "http://ckan:5000/uploads/page_images/portal.png")
        return new Response(null, {
          status: 302,
          headers: { location: "/uploads/page_images/portal.png?download=1" },
        });
      expect(String(url)).toBe(
        "http://ckan:5000/uploads/page_images/portal.png?download=1",
      );
      return new Response(png, {
        status: 200,
        headers: { "content-type": "application/octet-stream" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const response = await GET(new Request("https://data.example.test/image"), {
      params: Promise.resolve({ filename: "portal.png" }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not follow a CMS media redirect to another origin", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(null, {
          status: 302,
          headers: { location: "https://untrusted.example/image.png" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const response = await GET(new Request("https://data.example.test/image"), {
      params: Promise.resolve({ filename: "portal.png" }),
    });
    expect(response.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
