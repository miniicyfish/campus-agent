import { NextResponse } from "next/server";
import { getMockWeatherState, normalizeWeatherKind } from "@/lib/weather";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const override = normalizeWeatherKind(url.searchParams.get("kind"));
  const spotId = url.searchParams.get("spotId") ?? undefined;

  return NextResponse.json(getMockWeatherState({ override, spotId }));
}
