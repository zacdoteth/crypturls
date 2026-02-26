import { NextResponse } from "next/server";
import { getOrSetCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

export interface PredictionEvent {
  id: string;
  title: string;
  slug: string;
  topOutcome: string;
  probability: number;
  volume24hr: number;
  endDate: string;
}

interface GammaEvent {
  id: string;
  title: string;
  slug: string;
  endDate: string;
  markets: Array<{
    outcomePrices: string;
    outcomes: string;
    volume24hr: number;
  }>;
}

export async function GET() {
  const data = await getOrSetCache<PredictionEvent[]>("predictions", 5 * 60 * 1000, async () => {
    const r = await fetch(
      "https://gamma-api.polymarket.com/events?active=true&closed=false&limit=12&order=volume24hr",
      {
        headers: { "User-Agent": "CryptUrls/1.0" },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!r.ok) return [];

    const events: GammaEvent[] = await r.json();

    return events
      .filter((e) => e.markets?.length > 0)
      .map((e) => {
        const market = e.markets[0];
        let topOutcome = "Yes";
        let probability = 50;

        try {
          const prices: number[] = JSON.parse(market.outcomePrices || "[]");
          const outcomes: string[] = JSON.parse(market.outcomes || "[]");
          if (prices.length > 0 && outcomes.length > 0) {
            const maxIdx = prices.indexOf(Math.max(...prices));
            topOutcome = outcomes[maxIdx] || "Yes";
            probability = Math.round(prices[maxIdx] * 100);
          }
        } catch {
          // keep defaults
        }

        return {
          id: e.id,
          title: e.title,
          slug: e.slug,
          topOutcome,
          probability,
          volume24hr: market.volume24hr || 0,
          endDate: e.endDate || "",
        };
      })
      .filter((e) => e.volume24hr > 0)
      .sort((a, b) => b.volume24hr - a.volume24hr)
      .slice(0, 9);
  });

  return NextResponse.json(data);
}
