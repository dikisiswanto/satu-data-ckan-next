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

  it("uses a CSRF-safe GET for package_search while forwarding private-dataset sessions", async () => {
    const fetcher = vi.fn(async (url, options) => {
      expect(options.method).toBe("GET");
      expect(options.body).toBeUndefined();
      expect(url.searchParams.get("include_private")).toBe("true");
      expect(url.searchParams.get("fq")).toBe("state:active");
      expect(url.searchParams.getAll("facet.field")).toEqual([
        "groups",
        "organization",
      ]);
      expect(options.headers.get("cookie")).toBe(
        "wajo_ckan_session=signed.session",
      );
      expect(options.cache).toBe("no-store");
      return Response.json({
        success: true,
        result: { count: 1, results: [{ id: "private-dataset" }] },
      });
    });
    vi.stubGlobal("fetch", fetcher);
    const { ckanAction } = await import("@/lib/ckan/client");
    await ckanAction(
      "package_search",
      {
        q: "*:*",
        include_private: true,
        fq: "state:active",
        "facet.field": ["groups", "organization"],
      },
      { sessionCookie: "signed.session", revalidate: 0 },
    );
    expect(fetcher).toHaveBeenCalledOnce();
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

describe("CKAN public Data Cache policy", () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    "package_search",
    "package_show",
    "resource_show",
    "resource_search",
    "datastore_search",
  ])(
    "caches public %s reads with the shared invalidation tag",
    async (action) => {
      const fetcher = vi.fn(async (_url, options) => {
        expect(options.cache).toBeUndefined();
        expect(options.next).toMatchObject({
          revalidate: 60,
          tags: ["ckan-public", `ckan-action:${action}`],
        });
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
      const params =
        action === "package_search"
          ? { q: "*:*", include_private: false }
          : action === "datastore_search"
            ? { resource_id: "resource-1", limit: 10 }
            : action === "resource_search"
              ? { query: "url:", limit: 10 }
              : { id: "record-1" };
      await ckanAction(action, params, { revalidate: 60 });
      expect(fetcher).toHaveBeenCalledOnce();
    },
  );

  it("never caches a package_search request that can include private records", async () => {
    const fetcher = vi.fn(async (_url, options) => {
      expect(options.cache).toBe("no-store");
      expect(options.next).toBeUndefined();
      return Response.json({
        success: true,
        result: { count: 1, results: [{ id: "private-record" }] },
      });
    });
    vi.stubGlobal("fetch", fetcher);
    const { ckanAction } = await import("@/lib/ckan/client");
    await ckanAction(
      "package_search",
      { q: "*:*", include_private: true },
      { revalidate: 60 },
    );
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it.each(["organization_list", "group_list"])(
    "does not cache %s when include_private is enabled without a session",
    async (action) => {
      const fetcher = vi.fn(async (_url, options) => {
        expect(options.cache).toBe("no-store");
        expect(options.next).toBeUndefined();
        return Response.json({ success: true, result: [] });
      });
      vi.stubGlobal("fetch", fetcher);
      const { ckanAction } = await import("@/lib/ckan/client");
      await ckanAction(action, { include_private: "YES" }, { revalidate: 60 });
      expect(fetcher).toHaveBeenCalledOnce();
    },
  );

  it.each(["package_activity_list", "file_show"])(
    "does not cache %s because it may contain private activity/file metadata",
    async (action) => {
      const fetcher = vi.fn(async (_url, options) => {
        expect(options.cache).toBe("no-store");
        expect(options.next).toBeUndefined();
        return Response.json({
          success: true,
          result: { id: "record-1", state: "active" },
        });
      });
      vi.stubGlobal("fetch", fetcher);
      const { ckanAction } = await import("@/lib/ckan/client");
      await ckanAction(action, { id: "record-1" }, { revalidate: 60 });
      expect(fetcher).toHaveBeenCalledOnce();
    },
  );

  it("keeps authenticated reads out of the shared Data Cache", async () => {
    const fetcher = vi.fn(async (_url, options) => {
      expect(options.cache).toBe("no-store");
      expect(options.next).toBeUndefined();
      return Response.json({
        success: true,
        result: { id: "private-record", private: true },
      });
    });
    vi.stubGlobal("fetch", fetcher);
    const { ckanAction } = await import("@/lib/ckan/client");
    await ckanAction(
      "package_show",
      { id: "private-record" },
      { sessionCookie: "signed.session", revalidate: 60 },
    );
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
