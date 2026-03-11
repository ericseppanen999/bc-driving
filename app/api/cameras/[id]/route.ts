import { NextResponse } from "next/server";
import { getCameraById } from "@/lib/api/cameras-service";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const camera = await getCameraById(params.id);

  if (!camera) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(camera);
}
