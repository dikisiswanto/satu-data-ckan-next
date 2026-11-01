import { describe, expect, it } from "vitest";
import {
  sanitizePublicPackage,
  sanitizePublicSearchResult,
} from "@/lib/ckan/public-api-sanitize";

describe("CKAN public response sanitizer", () => {
  it("keeps CKAN package visibility intact while fail-closing unsupported resource-private markers", () => {
    const input = {
      id: "dataset-private",
      private: true,
      resources: [
        { id: "active-public-resource", state: "active" },
        { id: "legacy-active-resource", state: "active", private: false },
        {
          id: "string-false-is-not-private",
          state: "active",
          private: "false",
        },
        { id: "custom-private-resource", state: "active", private: true },
        {
          id: "legacy-string-private-resource",
          state: "active",
          private: "true",
        },
        { id: "deleted-resource", state: "deleted" },
      ],
    };

    const result = sanitizePublicPackage(input);

    expect(result.private).toBe(true);
    expect(result.resources.map((resource) => resource.id)).toEqual([
      "active-public-resource",
      "legacy-active-resource",
      "string-false-is-not-private",
    ]);
    expect(input.resources).toHaveLength(6);
  });

  it("applies the same rule to every result in package_search", () => {
    const result = sanitizePublicSearchResult({
      count: 1,
      results: [
        {
          id: "dataset-1",
          resources: [
            { id: "public-resource", state: "active" },
            { id: "private-resource", state: "active", private: true },
          ],
        },
      ],
    });
    expect(result.results[0].resources.map((resource) => resource.id)).toEqual([
      "public-resource",
    ]);
  });
});
