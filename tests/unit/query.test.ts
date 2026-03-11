import { describe, expect, it } from "vitest";
import { parseBBox, parseLimit } from "@/lib/utils/query";

describe("query helpers", () => {
  it("parses bbox strings", () => {
    expect(parseBBox("-123,49,-122,50")).toEqual({
      xmin: -123,
      ymin: 49,
      xmax: -122,
      ymax: 50
    });
  });

  it("caps limits", () => {
    expect(parseLimit("999", 50, 500)).toBe(500);
  });
});
