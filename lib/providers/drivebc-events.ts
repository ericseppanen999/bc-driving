import { z } from "zod";
import { env } from "@/lib/config/env";
import { memoryCache } from "@/lib/cache/memory-cache";
import { fetchJson } from "@/lib/api/fetch-json";
import { BBox, ProviderHealth, TrafficEvent } from "@/lib/types/domain";
import {
  ProviderAdapter,
  buildHealth,
  recordProviderFailure,
  recordProviderSuccess
} from "@/lib/providers/shared";
import { bboxContainsPoint } from "@/lib/utils/query";
import { mockEvents } from "@/lib/providers/mock-data";
import { sanitizeText, sanitizeUrl } from "@/lib/utils/sanitize";

const CACHE_KEY = "provider:drivebc:events";
const DEFAULT_HEALTH_CACHE_KEY = `${CACHE_KEY}:status=ACTIVE&limit=500`;

const eventSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  headline: z.string().optional(),
  description: z.string().optional(),
  event_type: z.string().optional(),
  event_subtype: z.string().optional(),
  severity: z.string().optional(),
  status: z.string().optional(),
  road_name: z.string().optional(),
  area_id: z.string().optional(),
  created: z.string().optional(),
  updated: z.string().optional(),
  schedule: z
    .object({
      intervals: z
        .array(
          z.object({
            start: z.string().optional(),
            end: z.string().optional()
          })
        )
        .optional()
    })
    .optional(),
  url: z.string().optional(),
  geographies: z
    .array(
      z.object({
        type: z.string(),
        coordinates: z.any()
      })
    )
    .optional(),
  geometry: z
    .object({
      type: z.string(),
      coordinates: z.any()
    })
    .optional()
});

const responseSchema = z.object({
  events: z.array(eventSchema).default([])
});

function normalizeEvent(raw: z.infer<typeof eventSchema>, index: number): TrafficEvent {
  const geometry = raw.geometry ?? raw.geographies?.[0];
  const coordinates =
    geometry?.type === "Point" && Array.isArray(geometry.coordinates) ? geometry.coordinates : undefined;

  return {
    id: `drivebc-event-${raw.id ?? index}`,
    provider: "drivebc",
    sourceId: String(raw.id ?? index),
    headline: sanitizeText(raw.headline) ?? "DriveBC event",
    description: sanitizeText(raw.description),
    eventType:
      (raw.event_type as TrafficEvent["eventType"]) ||
      (raw.event_subtype?.includes("WEATHER") ? "WEATHER_CONDITION" : "INCIDENT"),
    eventSubtype: sanitizeText(raw.event_subtype),
    severity: sanitizeText(raw.severity),
    status: raw.status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE",
    roadName: sanitizeText(raw.road_name),
    areaId: sanitizeText(raw.area_id),
    latitude: coordinates?.[1],
    longitude: coordinates?.[0],
    geometry: geometry ? { type: geometry.type, coordinates: geometry.coordinates } : undefined,
    created: raw.created,
    updated: raw.updated,
    start: raw.schedule?.intervals?.[0]?.start,
    end: raw.schedule?.intervals?.[0]?.end,
    url: sanitizeUrl(raw.url),
    raw
  };
}

function buildParams(filters?: {
  bbox?: BBox;
  lat?: number;
  lng?: number;
  radiusMeters?: number;
  severity?: string;
  roadName?: string;
  eventType?: string;
  limit?: number;
}) {
  const params = new URLSearchParams({
    status: "ACTIVE",
    limit: String(filters?.limit ?? 200)
  });

  if (filters?.bbox) {
    params.set(
      "bbox",
      `${filters.bbox.xmin},${filters.bbox.ymin},${filters.bbox.xmax},${filters.bbox.ymax}`
    );
  }

  if (filters?.lat !== undefined && filters.lng !== undefined) {
    params.set("geography", `POINT(${filters.lat} ${filters.lng})`);
    params.set("tolerance", String(Math.min(filters.radiusMeters ?? 10000, 10000)));
  }

  if (filters?.severity) {
    params.set("severity", filters.severity);
  }

  if (filters?.roadName) {
    params.set("road_name", filters.roadName);
  }

  if (filters?.eventType) {
    params.set("event_type", filters.eventType);
  }

  return params;
}

export async function fetchDriveBcEvents(filters?: {
  bbox?: BBox;
  lat?: number;
  lng?: number;
  radiusMeters?: number;
  severity?: string;
  roadName?: string;
  eventType?: string;
  limit?: number;
}) {
  const params = buildParams(filters);
  const cacheKey = `${CACHE_KEY}:${params.toString()}`;
  const cached = memoryCache.get<TrafficEvent[]>(cacheKey);
  if (cached.value) {
    return cached.value;
  }

  try {
    const response = await fetchJson<unknown>(
      `https://api.open511.gov.bc.ca/events?${params.toString()}`,
      { timeoutMs: 7000 }
    );
    const parsed = responseSchema.parse(response);
    const normalized = parsed.events.map(normalizeEvent);
    recordProviderSuccess("drivebc-events");
    return memoryCache.set(cacheKey, normalized, env.CACHE_TTL_EVENTS_SECONDS);
  } catch {
    recordProviderFailure("drivebc-events");
    const stale = memoryCache.getStale<TrafficEvent[]>(cacheKey);
    if (stale.value) {
      return stale.value;
    }
    return memoryCache.set(cacheKey, mockEvents, env.CACHE_TTL_EVENTS_SECONDS);
  }
}

export const driveBcEventsAdapter: ProviderAdapter<TrafficEvent> = {
  name: "drivebc-events",
  async healthcheck(): Promise<ProviderHealth> {
    const cached = memoryCache.getStale<TrafficEvent[]>(DEFAULT_HEALTH_CACHE_KEY);
    return buildHealth(
      "drivebc-events",
      cached.value
        ? "DriveBC events available from cache or upstream."
        : "DriveBC events unavailable; serving fallback data when needed.",
      { cacheKey: DEFAULT_HEALTH_CACHE_KEY, down: !cached.value }
    );
  },
  async fetchAll() {
    return fetchDriveBcEvents({ limit: 500 });
  },
  async fetchByBbox(bbox) {
    const events = await fetchDriveBcEvents({ bbox, limit: 500 });
    return events.filter((event) => bboxContainsPoint(bbox, event.latitude, event.longitude));
  },
  async fetchById(id) {
    const events = await fetchDriveBcEvents({ limit: 500 });
    return events.find((event) => event.id === id) ?? null;
  }
};
