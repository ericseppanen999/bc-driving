import { describe, expect, it } from "vitest";
import { getEvents } from "@/lib/api/events-service";

describe("events service", () => {
  it("returns normalized events", async () => {
    const events = await getEvents({ roadName: "Highway 1", limit: 5 });
    expect(events.length).toBeGreaterThan(0);
    expect(events[0]).toHaveProperty("headline");
  });
});
