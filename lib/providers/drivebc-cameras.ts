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
const DATASET_URL =
  "https://catalogue.data.gov.bc.ca/dataset/6b39a910-6c77-476f-ac96-7b4f18849b1c/resource/a9d52d85-8402-4ce7-b2ac-a2779837c48a/download/webcams.csv";

const CRITICAL_CAMERA_OVERRIDES: Camera[] = [
  {
    id: "drivebc-18",
    provider: "drivebc",
    sourceId: "18",
    name: "LGB North End 1",
    latitude: 49.3171,
    longitude: -123.1392,
    area: "Lions Gate",
    roadName: "Highway 99",
    orientation: "South",
    snippet: "Lions Gate Bridge north end, looking south.",
    pageUrl: "https://images.drivebc.ca/bchighwaycam/pub/html/www/18.html",
    imageUrl: "https://www.drivebc.ca/images/18.jpg",
    imageUrls: [{ url: "https://www.drivebc.ca/images/18.jpg" }],
    updateIntervalSeconds: 300,
    attribution: "DriveBC"
  },
  {
    id: "drivebc-20",
    provider: "drivebc",
    sourceId: "20",
    name: "LGB North End 2",
    latitude: 49.3174,
    longitude: -123.1386,
    area: "Lions Gate",
    roadName: "Highway 99",
    orientation: "North",
    snippet: "Lions Gate Bridge north end, looking north.",
    pageUrl: "https://images.drivebc.ca/bchighwaycam/pub/html/www/20.html",
    imageUrl: "https://www.drivebc.ca/images/20.jpg",
    imageUrls: [{ url: "https://www.drivebc.ca/images/20.jpg" }],
    updateIntervalSeconds: 300,
    attribution: "DriveBC"
  },
  {
    id: "drivebc-21",
    provider: "drivebc",
    sourceId: "21",
    name: "Taylor Way",
    latitude: 49.3252,
    longitude: -123.1409,
    area: "Lions Gate",
    roadName: "Highway 99",
    orientation: "North",
    snippet: "Taylor Way at Marine Drive, looking north on Taylor Way.",
    pageUrl: "https://images.drivebc.ca/bchighwaycam/pub/html/www/21.html",
    imageUrl: "https://www.drivebc.ca/images/21.jpg",
    imageUrls: [{ url: "https://www.drivebc.ca/images/21.jpg" }],
    updateIntervalSeconds: 300,
    attribution: "DriveBC"
  }
];

function buildDriveBcSnippet(record: Record<string, string>) {
  const pieces = [
    sanitizeText(record.highway_number ?? record.highway ?? record.road_name),
    sanitizeText(record.orientation ?? record.direction),
    sanitizeText(record.highway_locationDescription ?? record.location ?? record.area ?? record.region),
    sanitizeText(record.caption ?? record.description ?? record.comment)
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

export function deriveDriveBcImageUrl(candidateFields: Array<string | undefined>) {
  for (const candidate of candidateFields) {
    if (!candidate) {
      continue;
    }

    const imageUrl = sanitizeUrl(candidate);
    if (imageUrl && /\/images\/\d+\.jpg(?:$|\?)/i.test(imageUrl)) {
      return imageUrl.replace(/\?.*$/, "");
    }

    const numericMatch = candidate.match(/(?:^|\D)(\d{1,6})(?:\.jpg|\.html|\D|$)/i);
    if (numericMatch?.[1]) {
      return `https://www.drivebc.ca/images/${numericMatch[1]}.jpg`;
    }
  }

  return undefined;
}

function mergeCriticalCameras(cameras: Camera[]) {
  const byId = new Map(cameras.map((camera) => [camera.id, camera]));

  CRITICAL_CAMERA_OVERRIDES.forEach((override) => {
    const existing = byId.get(override.id);
    byId.set(override.id, {
      ...override,
      ...existing,
      latitude: existing?.latitude ?? override.latitude,
      longitude: existing?.longitude ?? override.longitude,
      pageUrl: existing?.pageUrl ?? override.pageUrl,
      imageUrl: existing?.imageUrl ?? override.imageUrl,
      imageUrls: existing?.imageUrls?.length ? existing.imageUrls : override.imageUrls,
      snippet: existing?.snippet ?? override.snippet,
      area: existing?.area ?? override.area,
      roadName: existing?.roadName ?? override.roadName,
      orientation: existing?.orientation ?? override.orientation
    });
  });

  return Array.from(byId.values());
}

function parseCsv(csv: string): Camera[] {
  const [headerLine, ...lines] = csv.split(/\r?\n/).filter(Boolean);
  if (!headerLine) {
    return [];
  }

  const headers = parseCsvLine(headerLine).map((part) => part.replace(/^"|"$/g, ""));
  const cameras = lines
    .map((line, index) => {
      const values = parseCsvLine(line).map((part) => part.replace(/^"|"$/g, ""));
      const record = Object.fromEntries(headers.map((header, headerIndex) => [header, values[headerIndex] ?? ""]));
      const latitude = Number(record.latitude ?? record.lat);
      const longitude = Number(record.longitude ?? record.lng);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
      }

      const sourceId = record.id ?? record.cameraid ?? String(index);
      const name = sanitizeText(record.camName ?? record.name ?? record.description ?? record.label) ?? "DriveBC camera";
      const pageUrl = sanitizeUrl(record.links_bchighwaycam ?? record.pageurl ?? record.url ?? record.link);
      const imageUrl = deriveDriveBcImageUrl([
        record.links_imageDisplay,
        record.links_imageThumbnail,
        record.links_bchighwaycam,
        pageUrl,
        record.cameraid,
        record.id
      ]);

      return {
        id: `drivebc-${sourceId}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
        provider: "drivebc" as const,
        sourceId,
        name,
        latitude,
        longitude,
        area: sanitizeText(record.highway_locationDescription ?? record.area ?? record.region),
        roadName: sanitizeText(record.highway_number ?? record.highway ?? record.road_name),
        orientation: sanitizeText(record.orientation ?? record.direction),
        snippet: buildDriveBcSnippet(record),
        pageUrl,
        imageUrl,
        imageUrls: imageUrl ? [{ url: imageUrl }] : undefined,
        updateIntervalSeconds: Number(record.updateseconds ?? record.update_frequency_seconds) || 300,
        attribution: sanitizeText(record.credit) ?? "DriveBC",
        raw: record
      } satisfies Camera;
    })
    .filter(Boolean) as Camera[];

  return mergeCriticalCameras(cameras);
}

function looksLikeUnavailableDriveBcHtml(html: string) {
  const normalized = html.toLowerCase();
  return (
    normalized.includes("images from this service are no longer available") ||
    normalized.includes("for current highway cam images")
  );
}

function isPlaceholderDriveBcImage(url: string) {
  const normalized = url.toLowerCase();
  return /(?:placeholder|unavailable|notavailable|noimage|blank|comingsoon)/.test(normalized);
}

export function parseDriveBcCameraPage(html: string, pageUrl: string): Pick<Camera, "imageUrls" | "imageUrl"> {
  if (looksLikeUnavailableDriveBcHtml(html)) {
    return {
      imageUrls: [],
      imageUrl: undefined
    };
  }

  const imageMatches = Array.from(html.matchAll(/<img[^>]+src="([^"]+\.(?:jpg|jpeg|png))"/gi));
  const imageUrls = imageMatches
    .map((match) => sanitizeUrl(new URL(match[1], pageUrl).toString()))
    .filter(Boolean)
    .filter((url) => !isPlaceholderDriveBcImage(url as string))
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

  return mergeCriticalCameras(
    memoryCache.set(CACHE_KEY, mockDriveBcCameras, env.CACHE_TTL_DRIVEBC_CAMERAS_SECONDS)
  );
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
    if (!found) {
      return found;
    }

    if (found.imageUrl) {
      return found;
    }

    if (!found.pageUrl) {
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
        imageUrl: details.imageUrl,
        snippet: details.imageUrl ? found.snippet : `${found.snippet ?? "DriveBC highway camera"} | Live image unavailable from current source.`
      };
      return memoryCache.set(cacheKey, enriched, env.CACHE_TTL_DRIVEBC_CAMERAS_SECONDS);
    } catch {
      return found;
    }
  }
};
