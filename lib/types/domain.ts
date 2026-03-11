export type CameraProvider = "vancouver" | "drivebc";
export type EventProvider = "drivebc";

export interface BBox {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
}

export interface CameraImageVariant {
  label?: string;
  url: string;
}

export interface Camera {
  id: string;
  provider: CameraProvider;
  sourceId?: string;
  name: string;
  latitude: number;
  longitude: number;
  area?: string;
  roadName?: string;
  orientation?: string;
  snippet?: string;
  pageUrl?: string;
  imageUrl?: string;
  imageUrls?: CameraImageVariant[];
  updateIntervalSeconds?: number;
  attribution?: string;
  approximateLocation?: boolean;
  raw?: unknown;
}

export type TrafficEventType =
  | "CONSTRUCTION"
  | "SPECIAL_EVENT"
  | "INCIDENT"
  | "WEATHER_CONDITION"
  | "ROAD_CONDITION";

export interface EventGeometry {
  type: string;
  coordinates?: unknown;
}

export interface TrafficEvent {
  id: string;
  provider: EventProvider;
  sourceId: string;
  headline: string;
  description?: string;
  eventType: TrafficEventType;
  eventSubtype?: string;
  severity?: "MINOR" | "MODERATE" | "MAJOR" | string;
  status: "ACTIVE" | "ARCHIVED";
  roadName?: string;
  areaId?: string;
  latitude?: number;
  longitude?: number;
  geometry?: EventGeometry;
  created?: string;
  updated?: string;
  start?: string;
  end?: string;
  url?: string;
  raw?: unknown;
}

export interface ProviderHealth {
  provider: string;
  status: "ok" | "degraded" | "down";
  message: string;
  checkedAt: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  stale: boolean;
  cacheAgeSeconds?: number;
}

export interface HealthResponse {
  status: "ok" | "degraded";
  providers: ProviderHealth[];
  generatedAt: string;
}

export interface RegionPreset {
  id: string;
  label: string;
  bbox?: BBox;
  roadName?: string;
}

export interface BootstrapResponse {
  cameras: Camera[];
  events: TrafficEvent[];
  health: ProviderHealth[];
  generatedAt: string;
  config: {
    defaultCenter: {
      lat: number;
      lng: number;
      zoom: number;
    };
    regions: RegionPreset[];
    ui: {
      showProviderHealth: boolean;
    };
  };
  staleWarnings: string[];
}
