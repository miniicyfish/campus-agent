import { NextResponse } from "next/server";
import { matchRoute } from "@/lib/content";
import type { Profile } from "@/lib/types";

export async function POST(request: Request) {
  const profile = (await request.json()) as Profile;
  return NextResponse.json(matchRoute(profile));
}
