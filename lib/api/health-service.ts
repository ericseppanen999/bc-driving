import { HealthResponse } from "@/lib/types/domain";
import { driveBcCameraAdapter } from "@/lib/providers/drivebc-cameras";
import { driveBcEventsAdapter } from "@/lib/providers/drivebc-events";
import { vancouverCameraAdapter } from "@/lib/providers/vancouver-cameras";

export async function getHealth(): Promise<HealthResponse> {
  const providers = await Promise.all([
    vancouverCameraAdapter.healthcheck(),
    driveBcCameraAdapter.healthcheck(),
    driveBcEventsAdapter.healthcheck()
  ]);

  return {
    status: providers.some((provider) => provider.status !== "ok") ? "degraded" : "ok",
    providers,
    generatedAt: new Date().toISOString()
  };
}
