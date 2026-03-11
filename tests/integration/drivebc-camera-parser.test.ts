import { describe, expect, it } from "vitest";
import { parseDriveBcCameraPage } from "@/lib/providers/drivebc-cameras";

describe("DriveBC camera page parser", () => {
  it("extracts image urls from camera pages", () => {
    const parsed = parseDriveBcCameraPage(
      '<html><body><img src="/cam.jpg" /></body></html>',
      "https://images.drivebc.ca/bchighwaycam/pub/html/www/1.html"
    );

    expect(parsed.imageUrl).toBe("https://images.drivebc.ca/cam.jpg");
  });
});
