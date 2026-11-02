import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/public/preferences/dataset-view/route";
import {
  DATASET_VIEW_COOKIE_MAX_AGE,
  DATASET_VIEW_COOKIE_NAME,
  getDatasetViewPreference,
  getSafeDatasetReturnPath,
  normalizeDatasetView,
} from "@/lib/dataset-view-preference";

describe("dataset view preference", () => {
  it("normalizes unsupported values to the safe card default", () => {
    expect(normalizeDatasetView("list")).toBe("list");
    expect(normalizeDatasetView("cards")).toBe("cards");
    expect(normalizeDatasetView("table")).toBe("cards");
    expect(normalizeDatasetView(null)).toBe("cards");
  });

  it("reads the persisted cookie without depending on browser storage", () => {
    const cookieStore = {
      get(name) {
        return name === DATASET_VIEW_COOKIE_NAME
          ? { value: "list" }
          : undefined;
      },
    };
    expect(getDatasetViewPreference(cookieStore)).toBe("list");
    expect(getDatasetViewPreference({ get: () => undefined })).toBe("cards");
    expect(DATASET_VIEW_COOKIE_MAX_AGE).toBe(31_536_000);
  });

  it("only returns same-origin dataset paths and preserves their query state", () => {
    const origin =
      "https://data.wajokab.go.id/api/public/preferences/dataset-view";
    expect(
      getSafeDatasetReturnPath(
        "/dataset?q=sekolah&tampilan=list&kategori=pendidikan",
        origin,
      ),
    ).toBe("/dataset?q=sekolah&kategori=pendidikan");
    expect(getSafeDatasetReturnPath("https://evil.test/steal", origin)).toBe(
      "/dataset",
    );
    expect(getSafeDatasetReturnPath("//evil.test/steal", origin)).toBe(
      "/dataset",
    );
    expect(getSafeDatasetReturnPath("/admin", origin)).toBe("/dataset");
    expect(getSafeDatasetReturnPath("/dataset/../admin", origin)).toBe(
      "/dataset",
    );
  });

  it("redirects to a relative public path instead of leaking the internal proxy origin", async () => {
    const form = new URLSearchParams({
      view: "list",
      returnTo: "/dataset?q=sekolah&kategori=pendidikan",
    });
    const request = new Request(
      "http://0.0.0.0:3000/api/public/preferences/dataset-view",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form,
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "/dataset?q=sekolah&kategori=pendidikan",
    );
    expect(response.headers.get("location")).not.toContain("0.0.0.0");
    expect(response.headers.get("set-cookie")).toContain(
      `${DATASET_VIEW_COOKIE_NAME}=list`,
    );
  });
});
