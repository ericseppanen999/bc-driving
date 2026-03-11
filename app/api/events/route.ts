import { NextRequest, NextResponse } from "next/server";
import { getEvents } from "@/lib/api/events-service";
import { isRateLimited } from "@/lib/api/rate-limit";
import { parseBBox, parseLimit, parseNumber } from "@/lib/utils/query";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  if (isRateLimited(`events:${ip}`)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const { searchParams } = request.nextUrl;
  const events = await getEvents({
    bbox: parseBBox(searchParams.get("bbox")),
    lat: parseNumber(searchParams.get("lat")),
    lng: parseNumber(searchParams.get("lng")),
    radiusMeters: parseNumber(searchParams.get("radiusMeters")),
    eventType: searchParams.get("eventType") ?? undefined,
    severity: searchParams.get("severity") ?? undefined,
    roadName: searchParams.get("roadName") ?? undefined,
    limit: parseLimit(searchParams.get("limit"), 200, 500)
  });

  return NextResponse.json(events);
}
