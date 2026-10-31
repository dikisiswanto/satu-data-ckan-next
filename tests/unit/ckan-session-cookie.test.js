import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CKAN_SESSION_COOKIE_NAME,
  buildCkanSessionCookieHeader,
  getCkanSessionCookieValue,
  normalizeCkanSessionCookieValue,
} from "@/lib/ckan/session";

afterEach(() => vi.unstubAllGlobals());

describe("CKAN session cookie forwarding", () => {
  it("extracts only the CKAN session cookie from a browser Cookie header", () => {
    expect(
      getCkanSessionCookieValue(
        "next-auth=not-forwarded; wajo_ckan_session=signed.value-123; analytics=also-not-forwarded",
      ),
    ).toBe("signed.value-123");
    expect(buildCkanSessionCookieHeader("signed.value-123")).toBe(
      `${CKAN_SESSION_COOKIE_NAME}=signed.value-123`,
    );
  });

  it("rejects empty, overlong and header-injection cookie values", () => {
    expect(normalizeCkanSessionCookieValue("")).toBeNull();
    expect(normalizeCkanSessionCookieValue("valid; injected=1")).toBeNull();
    expect(normalizeCkanSessionCookieValue("valid\r\nX-Evil: 1")).toBeNull();
    expect(normalizeCkanSessionCookieValue("x".repeat(4097))).toBeNull();
    expect(
      getCkanSessionCookieValue(
        "wajo_ckan_session=valid; wajo_ckan_session=second",
      ),
    ).toBe("valid");
  });

  it("forwards the CKAN cookie to CKAN but never forwards arbitrary browser cookies", async () => {
    const fetcher = vi.fn(async (_url, options) => {
      expect(options.headers.get("cookie")).toBe(
        "wajo_ckan_session=signed.session",
      );
      expect(options.headers.get("authorization")).toBeNull();
      expect(options.cache).toBe("no-store");
      return Response.json({
        success: true,
        result: { id: "private-dataset", private: true },
      });
    });
    vi.stubGlobal("fetch", fetcher);
    const { ckanAction } = await import("@/lib/ckan/client");
    const result = await ckanAction(
      "package_show",
      { id: "private-dataset" },
      {
        sessionCookie: "signed.session",
        revalidate: 60,
      },
    );
    expect(result.private).toBe(true);
    expect(fetcher).toHaveBeenCalledOnce();
  });
});

describe("CKAN visibility-sensitive Data Cache policy", () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    "package_search",
    "package_show",
    "package_activity_list",
    "resource_show",
    "file_show",
    "datastore_search",
  ])(
    "does not cache %s even when a caller requests revalidation",
    async (action) => {
      const fetcher = vi.fn(async (_url, options) => {
        expect(options.cache).toBe("no-store");
        expect(options.next).toBeUndefined();
        return Response.json({
          success: true,
          result:
            action === "package_search"
              ? { count: 0, results: [] }
              : { id: "record-1", state: "active" },
        });
      });
      vi.stubGlobal("fetch", fetcher);
      const { ckanAction } = await import("@/lib/ckan/client");
      await ckanAction(
        action,
        action === "package_search" ? { q: "*:*" } : { id: "record-1" },
        { revalidate: 60 },
      );
      expect(fetcher).toHaveBeenCalledOnce();
    },
  );

  it("keeps the short shared cache for non-visibility metadata actions", async () => {
    const fetcher = vi.fn(async (_url, options) => {
      expect(options.cache).toBeUndefined();
      expect(options.next).toMatchObject({ revalidate: 60 });
      return Response.json({ success: true, result: [] });
    });
    vi.stubGlobal("fetch", fetcher);
    const { ckanAction } = await import("@/lib/ckan/client");
    await ckanAction("organization_list", {}, { revalidate: 60 });
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
