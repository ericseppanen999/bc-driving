"use client";

import { z } from "zod";

const favoritesSchema = z.array(z.string()).default([]);
const STORAGE_KEY = "bc-driving:favorites";

export function loadFavorites(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = favoritesSchema.safeParse(raw ? JSON.parse(raw) : []);
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function saveFavorites(favorites: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favoritesSchema.parse(favorites)));
}

export function toggleFavorite(cameraId: string): string[] {
  const favorites = loadFavorites();
  const next = favorites.includes(cameraId)
    ? favorites.filter((id) => id !== cameraId)
    : [cameraId, ...favorites];
  saveFavorites(next);
  return next;
}
