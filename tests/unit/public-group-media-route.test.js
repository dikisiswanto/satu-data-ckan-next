import { afterEach, describe, expect, it, vi } from "vitest";

import { GET, HEAD } from "@/app/file/[...path]/route";

const filename =
  "2026-10-31-012710.133105Komdigi-Logo---Colored---353x256---zonalogo.com.png";
const params = {
  params: Promise.resolve({ path: ["public-download", "groups", filename] }),
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CKAN public group image proxy", () => {
  it("fetches the native CKAN FileStore public-download URL and streams the image", async () => {
    const upstreamFetch = vi.fn(async (url, options) => {
      expect(String(url)).toBe(
        `http://ckan:5000/file/public-download/groups/${filename}`,
      );
      expect(options.redirect).toBe("manual");
      return new Response("png-bytes", {
        status: 200,
        headers: { "content-type": "image/png", "content-length": "9" },
      });
    });
    vi.stubGlobal("fetch", upstreamFetch);
    const response = await GET(
      new Request(
        `https://data.silirdev.com/file/public-download/groups/${filename}`,
      ),
      params,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await response.text()).toBe("png-bytes");
  });

  it("supports HEAD without returning an image body", async () => {
    const upstreamFetch = vi.fn(async (_url, options) => {
      expect(options.method).toBe("HEAD");
      return new Response(null, {
        status: 200,
        headers: { "content-type": "image/png", "content-length": "128" },
      });
    });
    vi.stubGlobal("fetch", upstreamFetch);
    const response = await HEAD(
      new Request(
        "https://data.silirdev.com/file/public-download/groups/logo.png",
        { method: "HEAD" },
      ),
      params,
    );
    expect(response.status).toBe(200);
    expect(response.body).toBeNull();
    expect(response.headers.get("content-length")).toBe("128");
  });

  it("does not proxy resource/user storage or unsafe filenames", async () => {
    const upstreamFetch = vi.fn();
    vi.stubGlobal("fetch", upstreamFetch);
    const response = await GET(
      new Request(
        "https://data.silirdev.com/file/public-download/resources/private.png",
      ),
      {
        params: Promise.resolve({
          path: ["public-download", "resources", "private.png"],
        }),
      },
    );
    expect(response.status).toBe(404);
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it("rejects non-image content and upstream redirects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("<html>login</html>", {
            status: 200,
            headers: { "content-type": "text/html" },
          }),
      ),
    );
    const htmlResponse = await GET(
      new Request(
        "https://data.silirdev.com/file/public-download/groups/${filename}",
      ),
      params,
    );
    expect(htmlResponse.status).toBe(415);
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(null, {
            status: 302,
            headers: { location: "https://evil.example/image.png" },
          }),
      ),
    );
    const redirectResponse = await GET(
      new Request(
        "https://data.silirdev.com/file/public-download/groups/${filename}",
      ),
      params,
    );
    expect(redirectResponse.status).toBe(404);
  });
});
