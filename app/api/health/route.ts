import { NextResponse } from "next/server";
import { getHealth } from "@/lib/api/health-service";

export async function GET() {
  const health = await getHealth();
  return NextResponse.json(health);
}
