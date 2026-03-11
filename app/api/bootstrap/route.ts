import { NextRequest, NextResponse } from "next/server";
import { getBootstrapData } from "@/lib/api/bootstrap-service";
import { isRateLimited } from "@/lib/api/rate-limit";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  if (isRateLimited(`bootstrap:${ip}`)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const data = await getBootstrapData();
  return NextResponse.json(data);
}
