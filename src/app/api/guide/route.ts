import { NextResponse } from "next/server";
import { findGuideScript, getSpots } from "@/lib/content";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const spotId = url.searchParams.get("spotId") ?? "";
  const routeId = url.searchParams.get("routeId") ?? undefined;
  const agentId = url.searchParams.get("agentId") ?? undefined;
  const spot = getSpots().find((item) => item.spot_id === spotId);
  const script = findGuideScript(spotId, routeId, agentId);

  if (!spot || !script) {
    return NextResponse.json({ error: "Guide script not found" }, { status: 404 });
  }

  return NextResponse.json({ spot, script });
}
