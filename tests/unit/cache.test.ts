import { describe, expect, it } from "vitest";
import { MemoryCache } from "@/lib/cache/memory-cache";

describe("memory cache", () => {
  it("stores and reads values", () => {
    const cache = new MemoryCache();
    cache.set("a", { ok: true }, 60);
    expect(cache.get<{ ok: boolean }>("a").value).toEqual({ ok: true });
  });
});
