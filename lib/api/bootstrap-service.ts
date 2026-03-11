import { getCameras, enrichCameraPreviews } from "@/lib/api/cameras-service";
import { getEvents } from "@/lib/api/events-service";
import { REGION_PRESETS } from "@/lib/geo/regions";
import { env } from "@/lib/config/env";
import { BBox, BootstrapResponse } from "@/lib/types/domain";
import { driveBcCameraAdapter } from "@/lib/providers/drivebc-cameras";
import { driveBcEventsAdapter } from "@/lib/providers/drivebc-events";
import { vancouverCameraAdapter } from "@/lib/providers/vancouver-cameras";

const DEFAULT_VIEW_BBOX: BBox = {
  xmin: -123.24,
  ymin: 49.268,
  xmax: -123.02,
  ymax: 49.37
};

export async function getBootstrapData(): Promise<BootstrapResponse> {
  const [rawCameras, events, health] = await Promise.all([
    getCameras({ bbox: DEFAULT_VIEW_BBOX }),
    getEvents({ bbox: DEFAULT_VIEW_BBOX, limit: 150 }),
    Promise.all([
      vancouverCameraAdapter.healthcheck(),
      driveBcCameraAdapter.healthcheck(),
      driveBcEventsAdapter.healthcheck()
    ])
  ]);

  const cameras = await enrichCameraPreviews(rawCameras, 32);

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
        lat: 49.305,
        lng: -123.135,
        zoom: 11
      },
      regions: REGION_PRESETS,
      ui: {
        showProviderHealth: env.FEATURE_SHOW_PROVIDER_HEALTH
      }
    },
    staleWarnings
  };
}
