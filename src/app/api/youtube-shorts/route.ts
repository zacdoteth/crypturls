import { NextResponse } from "next/server";
import { getCached } from "@/lib/cache";
import type { Video } from "../youtube/route";

export const dynamic = "force-dynamic";

export async function GET() {
  // Shorts are cached by the main /api/youtube route when it runs
  const cached = getCached<Video[]>("yt-shorts");
  if (cached && cached.length > 0) return NextResponse.json(cached);

  // If no cache, trigger the main youtube route to populate both caches
  try {
    const origin = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
    await fetch(`${origin}/api/youtube`);
    const shorts = getCached<Video[]>("yt-shorts");
    if (shorts) return NextResponse.json(shorts);
  } catch {
    // silent
  }

  return NextResponse.json([]);
}
