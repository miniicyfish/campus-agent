import { NextResponse } from "next/server";
import { getAgents, getRoutes, getSpots } from "@/lib/content";

export async function GET() {
  return NextResponse.json({
    spots: getSpots(),
    routes: getRoutes(),
    agents: getAgents().map(({ body, ...agent }) => agent),
  });
}
