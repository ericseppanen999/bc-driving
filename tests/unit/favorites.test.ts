import { beforeEach, describe, expect, it } from "vitest";
import { loadFavorites, saveFavorites, toggleFavorite } from "@/lib/storage/favorites";

describe("favorites storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists favorites locally", () => {
    saveFavorites(["a"]);
    expect(loadFavorites()).toEqual(["a"]);
    expect(toggleFavorite("b")).toEqual(["b", "a"]);
  });
});
