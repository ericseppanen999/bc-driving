import { getCameras, enrichCameraPreviews } from "@/lib/api/cameras-service";
import { getEvents } from "@/lib/api/events-service";
import { REGION_PRESETS } from "@/lib/geo/regions";
import { env } from "@/lib/config/env";
import { BootstrapResponse } from "@/lib/types/domain";
import { driveBcCameraAdapter } from "@/lib/providers/drivebc-cameras";
import { driveBcEventsAdapter } from "@/lib/providers/drivebc-events";
import { vancouverCameraAdapter } from "@/lib/providers/vancouver-cameras";

export async function getBootstrapData(): Promise<BootstrapResponse> {
  const [rawCameras, events, health] = await Promise.all([
    getCameras({ limit: 500 }),
    getEvents({ limit: 500 }),
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
