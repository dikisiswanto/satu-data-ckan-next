import { describe, expect, it } from "vitest";
import { isPrivateMarker } from "@/lib/ckan/privacy";

describe("CKAN custom privacy marker normalization", () => {
  it.each([
    true,
    1,
    "true",
    "TRUE",
    "1",
    "yes",
    "YES",
    "on",
    "private",
    " Private ",
  ])("treats %p as a private marker", (value) =>
    expect(isPrivateMarker(value)).toBe(true),
  );

  it.each([
    false,
    0,
    "false",
    "FALSE",
    "0",
    "no",
    "off",
    "",
    null,
    undefined,
    {},
    [],
  ])("does not treat %p as a private marker", (value) =>
    expect(isPrivateMarker(value)).toBe(false),
  );
});
