import { BBox } from "@/lib/types/domain";

export function parseNumber(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseLimit(value: string | null, defaultValue = 200, max = 500) {
  const parsed = parseNumber(value);
  if (!parsed) {
    return defaultValue;
  }

  return Math.max(1, Math.min(max, parsed));
}

export function parseBBox(value: string | null): BBox | undefined {
  if (!value) {
    return undefined;
  }

  const parts = value.split(",").map((part) => Number(part.trim()));
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
    return undefined;
  }

  return {
    xmin: parts[0],
    ymin: parts[1],
    xmax: parts[2],
    ymax: parts[3]
  };
}

export function bboxContainsPoint(
  bbox: BBox,
  latitude: number | undefined,
  longitude: number | undefined
) {
  if (latitude === undefined || longitude === undefined) {
    return false;
  }

  return (
    longitude >= bbox.xmin &&
    longitude <= bbox.xmax &&
    latitude >= bbox.ymin &&
    latitude <= bbox.ymax
  );
}
