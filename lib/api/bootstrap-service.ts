import { getCameras, enrichCameraPreviews } from "@/lib/api/cameras-service";
import { getEvents } from "@/lib/api/events-service";
import { REGION_PRESETS } from "@/lib/geo/regions";
import { env } from "@/lib/config/env";
import { BBox, BootstrapResponse } from "@/lib/types/domain";
import { driveBcCameraAdapter } from "@/lib/providers/drivebc-cameras";
import { driveBcEventsAdapter } from "@/lib/providers/drivebc-events";
import { vancouverCameraAdapter } from "@/lib/providers/vancouver-cameras";

const METRO_VANCOUVER_BBOX: BBox = {
  xmin: -123.31,
  ymin: 49.1,
  xmax: -122.84,
  ymax: 49.4
};

export async function getBootstrapData(): Promise<BootstrapResponse> {
  const [rawCameras, events, health] = await Promise.all([
    getCameras({ limit: 500 }),
    getEvents({ bbox: METRO_VANCOUVER_BBOX, limit: 200 }),
    Promise.all([
      vancouverCameraAdapter.healthcheck(),
      driveBcCameraAdapter.healthcheck(),
      driveBcEventsAdapter.healthcheck()
    ])
  ]);

  const cameras = await enrichCameraPreviews(rawCameras, 36);

  const staleWarnings = health
    .filter((item) => item.stale || item.status !== "ok")
    .map((item) => `${item.provider} data may be stale or partially unavailable.`);

  return {
    cameras,
    events,
    health,
    generatedAt: new Date().toISOString(),
    config: {
      defaultCenter: {
        lat: env.APP_DEFAULT_LAT,
        lng: env.APP_DEFAULT_LNG,
        zoom: env.APP_DEFAULT_ZOOM
      },
      regions: REGION_PRESETS,
      ui: {
        showProviderHealth: env.FEATURE_SHOW_PROVIDER_HEALTH
      }
    },
    staleWarnings
  };
}
