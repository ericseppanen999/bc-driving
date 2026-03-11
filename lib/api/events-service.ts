import { fetchDriveBcEvents } from "@/lib/providers/drivebc-events";
import { BBox, TrafficEvent } from "@/lib/types/domain";

export async function getEvents(filters?: {
  bbox?: BBox;
  lat?: number;
  lng?: number;
  radiusMeters?: number;
  eventType?: string;
  severity?: string;
  roadName?: string;
  limit?: number;
}): Promise<TrafficEvent[]> {
  return fetchDriveBcEvents(filters);
}
