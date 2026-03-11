import { describe, expect, it } from "vitest";
import { deriveDriveBcImageUrl, parseDriveBcCameraPage } from "@/lib/providers/drivebc-cameras";

describe("DriveBC camera page parser", () => {
  it("extracts image urls from camera pages", () => {
    const parsed = parseDriveBcCameraPage(
      '<html><body><img src="/cam.jpg" /></body></html>',
      "https://images.drivebc.ca/bchighwaycam/pub/html/www/1.html"
    );

    expect(parsed.imageUrl).toBe("https://images.drivebc.ca/cam.jpg");
  });

  it("derives direct image urls from drivebc image and page ids", () => {
    expect(
      deriveDriveBcImageUrl([
        "https://www.drivebc.ca/images/623.jpg?t=1773204937",
        undefined,
        "https://images.drivebc.ca/bchighwaycam/pub/html/www/18.html"
      ])
    ).toBe("https://www.drivebc.ca/images/623.jpg");

    expect(deriveDriveBcImageUrl([undefined, undefined, "https://images.drivebc.ca/bchighwaycam/pub/html/www/20.html"])).toBe(
      "https://www.drivebc.ca/images/20.jpg"
    );
  });
});
