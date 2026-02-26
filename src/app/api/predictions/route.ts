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
  totalVolume: number;
  endDate: string;
}

interface GammaMarket {
  outcomePrices: string;
  outcomes: string;
  volume24hr: number;
  volume: number;
}

interface GammaEvent {
  id: string;
  title: string;
  slug: string;
  endDate: string;
  markets: GammaMarket[];
}

export async function GET() {
  const data = await getOrSetCache<PredictionEvent[]>("predictions", 5 * 60 * 1000, async () => {
    const r = await fetch(
      "https://gamma-api.polymarket.com/events?active=true&closed=false&limit=20&order=volume24hr&ascending=false",
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
        // Sum volume across all markets in the event
        let totalVol24 = 0;
        let totalVol = 0;
        for (const m of e.markets) {
          totalVol24 += Number(m.volume24hr) || 0;
          totalVol += Number(m.volume) || 0;
        }

        // Use first market for outcome prices
        const market = e.markets[0];
        let topOutcome = "Yes";
        let probability = 50;

        try {
          const pricesRaw = market.outcomePrices;
          const outcomesRaw = market.outcomes;
          if (pricesRaw && outcomesRaw) {
            const priceStrs: string[] = JSON.parse(pricesRaw);
            const prices = priceStrs.map(Number);
            const outcomes: string[] = JSON.parse(outcomesRaw);
            if (prices.length > 0 && outcomes.length > 0) {
              const maxIdx = prices.indexOf(Math.max(...prices));
              topOutcome = outcomes[maxIdx] || "Yes";
              probability = Math.round(prices[maxIdx] * 100);
            }
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
          volume24hr: totalVol24,
          totalVolume: totalVol,
          endDate: e.endDate || "",
        };
      })
      .filter((e) => e.volume24hr > 0 && e.probability > 0 && e.probability < 100)
      .sort((a, b) => b.volume24hr - a.volume24hr)
      .slice(0, 9);
  });

  return NextResponse.json(data);
}
