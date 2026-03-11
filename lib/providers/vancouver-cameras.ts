import { z } from "zod";
import { env } from "@/lib/config/env";
import { memoryCache } from "@/lib/cache/memory-cache";
import { fetchJson, fetchText } from "@/lib/api/fetch-json";
import { Camera, ProviderHealth } from "@/lib/types/domain";
import {
  ProviderAdapter,
  buildHealth,
  recordProviderFailure,
  recordProviderSuccess
} from "@/lib/providers/shared";
import { sanitizeText, sanitizeUrl } from "@/lib/utils/sanitize";
import { bboxContainsPoint } from "@/lib/utils/query";
import { mockVancouverCameras } from "@/lib/providers/mock-data";

const CACHE_KEY = "provider:vancouver:cameras";
const DETAIL_CACHE_PREFIX = "provider:vancouver:detail:";

const v2Schema = z.object({
  results: z.array(z.record(z.any()))
});

const v1Schema = z.object({
  records: z.array(
    z.object({
      recordid: z.string().optional(),
      fields: z.record(z.any()).optional(),
      geometry: z
        .object({
          coordinates: z.tuple([z.number(), z.number()])
        })
        .optional()
    })
  )
});

function normalizeVancouverRecord(record: Record<string, unknown>, sourceId?: string): Camera | null {
  const latitude = Number(record.latitude ?? record.lat ?? record.y);
  const longitude = Number(record.longitude ?? record.lng ?? record.lon ?? record.x);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const name =
    sanitizeText(
      String(record.name ?? record.intersection ?? record.title ?? record.camera_name ?? "")
    ) ?? "Vancouver camera";

  const pageUrl = sanitizeUrl(
    String(record.url ?? record.page_url ?? record.website ?? record.camera_page ?? "")
  );

  const imageUrl = sanitizeUrl(String(record.image_url ?? record.image ?? ""));
  const stableId = sourceId ?? pageUrl ?? `${name}-${latitude}-${longitude}`;

  return {
    id: `vancouver-${stableId}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
    provider: "vancouver",
    sourceId,
    name,
    latitude,
    longitude,
    pageUrl,
    imageUrl,
    imageUrls: imageUrl ? [{ url: imageUrl }] : undefined,
    area: sanitizeText(String(record.area ?? record.neighbourhood ?? "")),
    roadName: sanitizeText(String(record.road_name ?? record.street ?? "")),
    snippet: sanitizeText(String(record.description ?? record.notes ?? "Approximate Vancouver camera location.")),
    updateIntervalSeconds: 900,
    attribution: "City of Vancouver",
    approximateLocation: true,
    raw: record
  };
}

function scoreVancouverCameraImage(url: string, label?: string) {
  const normalizedUrl = url.toLowerCase();
  const normalizedLabel = (label ?? "").toLowerCase();

  if (
    /(logo|icon|header|footer|banner|button|brand|wordmark|flower|leaf|crest)/.test(normalizedUrl) ||
    /(logo|icon|header|footer|banner|button|city of vancouver)/.test(normalizedLabel)
  ) {
    return -100;
  }

  let score = 0;

  if (/(north|south|east|west|nb|sb|eb|wb)/.test(normalizedLabel)) {
    score += 10;
  }

  if (/(cam|camera|webcam|traffic)/.test(normalizedUrl)) {
    score += 8;
  }

  if (/\.jpe?g($|\?)/.test(normalizedUrl)) {
    score += 4;
  }

  if (/\/images\//.test(normalizedUrl)) {
    score += 2;
  }

  return score;
}

export function parseVancouverCameraPage(
  html: string,
  pageUrl: string
): Pick<Camera, "name" | "imageUrls" | "snippet"> {
  const title = html.match(/<title>(.*?)<\/title>/i)?.[1] ?? "Vancouver camera";
  const imageMatches = Array.from(html.matchAll(/<img[^>]+src="([^"]+)"(?:[^>]*alt="([^"]*)")?[^>]*>/gi));
  const imageUrls = imageMatches
    .map((match) => {
      const src = sanitizeUrl(new URL(match[1], pageUrl).toString());
      if (!src) {
        return null;
      }

      const label = sanitizeText(match[2]);
      const score = scoreVancouverCameraImage(src, label);
      if (score < 0) {
        return null;
      }

      return {
        label,
        url: src,
        score
      };
    })
    .filter(Boolean)
    .sort((left, right) => (right?.score ?? 0) - (left?.score ?? 0))
    .map((item) => ({ label: item?.label, url: item?.url })) as NonNullable<Camera["imageUrls"]>;

  return {
    name: sanitizeText(title) ?? "Vancouver camera",
    imageUrls,
    snippet: "City of Vancouver traffic camera page. Coordinates are approximate."
  };
}

async function fetchFromV2(): Promise<Camera[]> {
  const response = await fetchJson<unknown>(
    "https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/web-cam-url-links/records?limit=100",
    { timeoutMs: 6000 }
  );

  const parsed = v2Schema.parse(response);
  return parsed.results
    .map((record, index) => normalizeVancouverRecord(record, `v2-${index}`))
    .filter(Boolean) as Camera[];
}

async function fetchFromV1(): Promise<Camera[]> {
  const response = await fetchJson<unknown>(
    "https://opendata.vancouver.ca/api/records/1.0/search/?dataset=web-cam-url-links&rows=100&format=json",
    { timeoutMs: 6000 }
  );

  const parsed = v1Schema.parse(response);
  return parsed.records
    .map((record) =>
      normalizeVancouverRecord(
        {
          ...record.fields,
          longitude: record.geometry?.coordinates[0],
          latitude: record.geometry?.coordinates[1]
        },
        record.recordid
      )
    )
    .filter(Boolean) as Camera[];
}

async function scrapeFallback(): Promise<Camera[]> {
  if (!env.FEATURE_ENABLE_SCRAPE_FALLBACK) {
    return [];
  }

  const html = await fetchText("https://trafficcams.vancouver.ca/", { timeoutMs: 6000 });
  const linkMatches = Array.from(html.matchAll(/href="([^"]+\.htm)"/gi)).slice(0, 25);

  return linkMatches.map((match, index) => ({
    ...mockVancouverCameras[index % mockVancouverCameras.length],
    id: `vancouver-scrape-${index}`,
    pageUrl: new URL(match[1], "https://trafficcams.vancouver.ca/").toString()
  }));
}

async function fetchCameras(): Promise<Camera[]> {
  const cached = memoryCache.get<Camera[]>(CACHE_KEY);
  if (cached.value) {
    return cached.value;
  }

  try {
    const v2 = await fetchFromV2();
    if (v2.length > 0) {
      recordProviderSuccess("vancouver");
      return memoryCache.set(CACHE_KEY, v2, env.CACHE_TTL_VANCOUVER_CAMERAS_SECONDS);
    }
  } catch {
    recordProviderFailure("vancouver");
  }

  try {
    const v1 = await fetchFromV1();
    if (v1.length > 0) {
      recordProviderSuccess("vancouver");
      return memoryCache.set(CACHE_KEY, v1, env.CACHE_TTL_VANCOUVER_CAMERAS_SECONDS);
    }
  } catch {
    recordProviderFailure("vancouver");
  }

  try {
    const scraped = await scrapeFallback();
    if (scraped.length > 0) {
      recordProviderSuccess("vancouver");
      return memoryCache.set(CACHE_KEY, scraped, env.CACHE_TTL_VANCOUVER_CAMERAS_SECONDS);
    }
  } catch {
    recordProviderFailure("vancouver");
  }

  const stale = memoryCache.getStale<Camera[]>(CACHE_KEY);
  if (stale.value) {
    return stale.value;
  }

  return memoryCache.set(CACHE_KEY, mockVancouverCameras, env.CACHE_TTL_VANCOUVER_CAMERAS_SECONDS);
}

export const vancouverCameraAdapter: ProviderAdapter<Camera> = {
  name: "vancouver",
  async healthcheck(): Promise<ProviderHealth> {
    const cached = memoryCache.getStale<Camera[]>(CACHE_KEY);
    return buildHealth(
      "vancouver",
      cached.value
        ? "Vancouver cameras available from cache or upstream."
        : "Vancouver cameras unavailable; using fallback when possible.",
      { cacheKey: CACHE_KEY, down: !cached.value }
    );
  },
  async fetchAll() {
    return fetchCameras();
  },
  async fetchByBbox(bbox) {
    const cameras = await fetchCameras();
    return cameras.filter((camera) => bboxContainsPoint(bbox, camera.latitude, camera.longitude));
  },
  async fetchById(id) {
    const cameras = await fetchCameras();
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
      const details = parseVancouverCameraPage(html, found.pageUrl);
      const enriched: Camera = {
        ...found,
        name: details.name || found.name,
        imageUrls: details.imageUrls?.length ? details.imageUrls : found.imageUrls,
        imageUrl: details.imageUrls?.[0]?.url ?? found.imageUrl,
        snippet: details.snippet ?? found.snippet
      };
      return memoryCache.set(cacheKey, enriched, env.CACHE_TTL_VANCOUVER_CAMERAS_SECONDS);
    } catch {
      return found;
    }
  }
};
