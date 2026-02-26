import { NextResponse } from "next/server";
import { buildEmptyFeedData, getFeedsData } from "@/lib/feeds";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const results = await getFeedsData();
    return NextResponse.json(results);
  } catch (e) {
    console.error("Feeds route failed:", e instanceof Error ? e.message : e);
    return NextResponse.json(buildEmptyFeedData());
  }
}
