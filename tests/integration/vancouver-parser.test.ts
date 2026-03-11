import { describe, expect, it } from "vitest";
import { parseVancouverCameraPage } from "@/lib/providers/vancouver-cameras";

describe("Vancouver scrape parser", () => {
  it("extracts title and image variants", () => {
    const parsed = parseVancouverCameraPage(
      '<html><head><title>Cambie & Broadway</title></head><body><img src="/cam-n.jpg" alt="North" /></body></html>',
      "https://trafficcams.vancouver.ca/cambie.htm"
    );

    expect(parsed.name).toContain("Cambie");
    expect(parsed.imageUrls?.[0]).toEqual({
      label: "North",
      url: "https://trafficcams.vancouver.ca/cam-n.jpg"
    });
  });

  it("ignores logo assets and prefers likely camera frames", () => {
    const parsed = parseVancouverCameraPage(
      '<html><head><title>Granville & Smithe</title></head><body><img src="/images/logo.png" alt="City of Vancouver" /><img src="/images/cam123.jpg" alt="West" /></body></html>',
      "https://trafficcams.vancouver.ca/granville.htm"
    );

    expect(parsed.imageUrls).toEqual([
      {
        label: "West",
        url: "https://trafficcams.vancouver.ca/images/cam123.jpg"
      }
    ]);
  });
});
