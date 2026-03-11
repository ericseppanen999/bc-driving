import { Camera, CameraProvider } from "@/lib/types/domain";
import { BBox } from "@/lib/types/domain";
import { driveBcCameraAdapter } from "@/lib/providers/drivebc-cameras";
import { vancouverCameraAdapter } from "@/lib/providers/vancouver-cameras";

export async function getCameras(filters?: {
  provider?: CameraProvider;
  bbox?: BBox;
  q?: string;
  limit?: number;
}) {
  const adapters =
    filters?.provider === "vancouver"
      ? [vancouverCameraAdapter]
      : filters?.provider === "drivebc"
        ? [driveBcCameraAdapter]
        : [vancouverCameraAdapter, driveBcCameraAdapter];

  const cameraSets = await Promise.all(
    adapters.map((adapter) =>
      filters?.bbox && adapter.fetchByBbox ? adapter.fetchByBbox(filters.bbox) : adapter.fetchAll()
    )
  );

  let cameras = cameraSets.flat();

  if (filters?.q) {
    const q = filters.q.toLowerCase();
    cameras = cameras.filter((camera) =>
      [camera.name, camera.area, camera.roadName].some((value) => value?.toLowerCase().includes(q))
    );
  }

  cameras = cameras.sort((left, right) => left.name.localeCompare(right.name));

  return typeof filters?.limit === "number" ? cameras.slice(0, filters.limit) : cameras;
}

export async function getCameraById(id: string): Promise<Camera | null> {
  if (id.startsWith("vancouver-")) {
    return vancouverCameraAdapter.fetchById?.(id) ?? null;
  }

  if (id.startsWith("drivebc-")) {
    return driveBcCameraAdapter.fetchById?.(id) ?? null;
  }

  const [vancouver, drivebc] = await Promise.all([
    vancouverCameraAdapter.fetchById?.(id),
    driveBcCameraAdapter.fetchById?.(id)
  ]);

  return vancouver ?? drivebc ?? null;
}

export async function enrichCameraPreviews(cameras: Camera[], maxToEnrich = 24): Promise<Camera[]> {
  const pending = cameras
    .map((camera, index) => ({ camera, index }))
    .filter(({ camera }) => !camera.imageUrl && camera.pageUrl)
    .slice(0, maxToEnrich);

  if (pending.length === 0) {
    return cameras;
  }

  const enriched = await Promise.all(
    pending.map(async ({ camera, index }) => ({
      index,
      camera: (await getCameraById(camera.id)) ?? camera
    }))
  );

  const next = [...cameras];
  enriched.forEach(({ index, camera }) => {
    next[index] = camera;
  });

  return next;
}
