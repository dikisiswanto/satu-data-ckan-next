import { describe, expect, it } from "vitest";
import { getPaginationItems, normalizePageNumber } from "@/lib/pagination";

describe("public pagination helpers", () => {
  it("returns all pages for a short catalog", () => {
    expect(getPaginationItems(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("marks a compact range around the current page and both boundaries", () => {
    expect(getPaginationItems(8, 20)).toEqual([
      1,
      "start-ellipsis",
      7,
      8,
      9,
      "end-ellipsis",
      20,
    ]);
  });

  it("expands a one-page gap rather than showing an ellipsis", () => {
    expect(getPaginationItems(4, 8)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("clamps page-range inputs to valid bounds", () => {
    expect(getPaginationItems(99, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(normalizePageNumber("-4")).toBe(1);
    expect(normalizePageNumber("9", 1, 4)).toBe(4);
    expect(normalizePageNumber("abc")).toBe(1);
  });
});
