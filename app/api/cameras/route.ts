import { NextRequest, NextResponse } from "next/server";
import { getCameras } from "@/lib/api/cameras-service";
import { isRateLimited } from "@/lib/api/rate-limit";
import { parseBBox, parseLimit } from "@/lib/utils/query";
import { CameraProvider } from "@/lib/types/domain";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  if (isRateLimited(`cameras:${ip}`)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const { searchParams } = request.nextUrl;
  const provider = searchParams.get("provider") as CameraProvider | null;

  const cameras = await getCameras({
    provider: provider ?? undefined,
    bbox: parseBBox(searchParams.get("bbox")),
    q: searchParams.get("q") ?? undefined,
    limit: parseLimit(searchParams.get("limit"))
  });

  return NextResponse.json(cameras);
}
