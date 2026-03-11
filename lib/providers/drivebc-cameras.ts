import { env } from "@/lib/config/env";
import { memoryCache } from "@/lib/cache/memory-cache";
import { fetchText } from "@/lib/api/fetch-json";
import { Camera, ProviderHealth } from "@/lib/types/domain";
import {
  ProviderAdapter,
  buildHealth,
  recordProviderFailure,
  recordProviderSuccess
} from "@/lib/providers/shared";
import { bboxContainsPoint } from "@/lib/utils/query";
import { sanitizeText, sanitizeUrl } from "@/lib/utils/sanitize";
import { mockDriveBcCameras } from "@/lib/providers/mock-data";

const CACHE_KEY = "provider:drivebc:cameras";
const DETAIL_CACHE_PREFIX = "provider:drivebc:detail:";
const DATASET_URL = "https://www.drivebc.ca/api/highwaycams/webcams.csv";

function buildDriveBcSnippet(record: Record<string, string>) {
  const pieces = [
    sanitizeText(record.highway ?? record.road_name),
    sanitizeText(record.direction ?? record.orientation),
    sanitizeText(record.area ?? record.region),
    sanitizeText(record.description ?? record.location ?? record.comment)
  ].filter(Boolean);

  return pieces.join(" | ") || undefined;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseCsv(csv: string): Camera[] {
  const [headerLine, ...lines] = csv.split(/\r?\n/).filter(Boolean);
  if (!headerLine) {
    return [];
  }

  const headers = parseCsvLine(headerLine).map((part) => part.replace(/^"|"$/g, ""));
  return lines
    .map((line, index) => {
      const values = parseCsvLine(line).map((part) => part.replace(/^"|"$/g, ""));
      const record = Object.fromEntries(headers.map((header, headerIndex) => [header, values[headerIndex] ?? ""]));
      const latitude = Number(record.latitude ?? record.lat);
      const longitude = Number(record.longitude ?? record.lng);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
      }

      const sourceId = record.id ?? record.cameraid ?? String(index);
      const name = sanitizeText(record.name ?? record.description ?? record.label) ?? "DriveBC camera";
      const pageUrl = sanitizeUrl(record.pageurl ?? record.url ?? record.link);
      const imageUrl = sanitizeUrl(record.imageurl ?? record.image);

      return {
        id: `drivebc-${sourceId}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
        provider: "drivebc" as const,
        sourceId,
        name,
        latitude,
        longitude,
        area: sanitizeText(record.area ?? record.region),
        roadName: sanitizeText(record.highway ?? record.road_name),
        orientation: sanitizeText(record.orientation ?? record.direction),
        snippet: buildDriveBcSnippet(record),
        pageUrl,
        imageUrl,
        updateIntervalSeconds: Number(record.updateseconds ?? record.update_frequency_seconds) || 300,
        attribution: sanitizeText(record.credit) ?? "DriveBC",
        raw: record
      } satisfies Camera;
    })
    .filter(Boolean) as Camera[];
}

export function parseDriveBcCameraPage(html: string, pageUrl: string): Pick<Camera, "imageUrls" | "imageUrl"> {
  const imageMatches = Array.from(html.matchAll(/<img[^>]+src="([^"]+\.(?:jpg|jpeg|png))"/gi));
  const imageUrls = imageMatches
    .map((match) => sanitizeUrl(new URL(match[1], pageUrl).toString()))
    .filter(Boolean)
    .map((url) => ({ url: url as string }));

  return {
    imageUrls,
    imageUrl: imageUrls[0]?.url
  };
}

async function fetchDriveBcCameras(): Promise<Camera[]> {
  const cached = memoryCache.get<Camera[]>(CACHE_KEY);
  if (cached.value) {
    return cached.value;
  }

  try {
    const csv = await fetchText(DATASET_URL, { timeoutMs: 8000 });
    const parsed = parseCsv(csv);
    if (parsed.length > 0) {
      recordProviderSuccess("drivebc-cameras");
      return memoryCache.set(CACHE_KEY, parsed, env.CACHE_TTL_DRIVEBC_CAMERAS_SECONDS);
    }
  } catch {
    recordProviderFailure("drivebc-cameras");
  }

  const stale = memoryCache.getStale<Camera[]>(CACHE_KEY);
  if (stale.value) {
    return stale.value;
  }

  return memoryCache.set(CACHE_KEY, mockDriveBcCameras, env.CACHE_TTL_DRIVEBC_CAMERAS_SECONDS);
}

export const driveBcCameraAdapter: ProviderAdapter<Camera> = {
  name: "drivebc-cameras",
  async healthcheck(): Promise<ProviderHealth> {
    const cached = memoryCache.getStale<Camera[]>(CACHE_KEY);
    return buildHealth(
      "drivebc-cameras",
      cached.value
        ? "DriveBC highway cameras available from cache or upstream."
        : "DriveBC highway cameras unavailable; serving fallback camera metadata when needed.",
      { cacheKey: CACHE_KEY, down: !cached.value }
    );
  },
  async fetchAll() {
    return fetchDriveBcCameras();
  },
  async fetchByBbox(bbox) {
    const cameras = await fetchDriveBcCameras();
    return cameras.filter((camera) => bboxContainsPoint(bbox, camera.latitude, camera.longitude));
  },
  async fetchById(id) {
    const cameras = await fetchDriveBcCameras();
    const found = cameras.find((camera) => camera.id === id) ?? null;
    if (!found?.pageUrl) {
      return found;
    }

    const cacheKey = `${DETAIL_CACHE_PREFIX}${id}`;
    const detailCached = memoryCache.get<Camera>(cacheKey);
    if (detailCached.value) {
      return detailCached.value;
    }

    try {
      const html = await fetchText(found.pageUrl, { timeoutMs: 5000 });
      const details = parseDriveBcCameraPage(html, found.pageUrl);
      const enriched = {
        ...found,
        imageUrls: details.imageUrls?.length ? details.imageUrls : found.imageUrls,
        imageUrl: details.imageUrl ?? found.imageUrl
      };
      return memoryCache.set(cacheKey, enriched, env.CACHE_TTL_DRIVEBC_CAMERAS_SECONDS);
    } catch {
      return found;
    }
  }
};
