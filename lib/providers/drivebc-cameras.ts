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

function deriveDriveBcImageUrl(sourceId: string, pageUrl?: string) {
  const numericSourceId = sourceId.match(/^\d+$/)?.[0];
  if (numericSourceId) {
    return `https://www.drivebc.ca/images/${numericSourceId}.jpg`;
  }

  const numericPageId = pageUrl?.match(/\/(\d+)\.html/i)?.[1];
  if (numericPageId) {
    return `https://www.drivebc.ca/images/${numericPageId}.jpg`;
  }

  return undefined;
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
      const name = sanitizeText(record.camName ?? record.name ?? record.description ?? record.label) ?? "DriveBC camera";
      const pageUrl = sanitizeUrl(record.links_bchighwaycam ?? record.pageurl ?? record.url ?? record.link);
      const imageUrl = deriveDriveBcImageUrl(sourceId, pageUrl);

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
