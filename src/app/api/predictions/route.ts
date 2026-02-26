import { NextResponse } from "next/server";
import { getOrSetCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

export interface PredictionEvent {
  id: string;
  title: string;
  slug: string;
  url: string;
  topOutcome: string;
  probability: number;
  volume24hr: number;
  totalVolume: number;
  endDate: string;
}

interface PredictionsResponse {
  polymarket: PredictionEvent[];
  kalshi: PredictionEvent[];
}

// ── Polymarket types ──

interface GammaMarket {
  outcomePrices: string;
  outcomes: string;
  groupItemTitle: string;
  question: string;
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

function parseYesPrice(m: GammaMarket): number {
  try {
    const prices = JSON.parse(m.outcomePrices || "[]").map(Number);
    return prices[0] || 0;
  } catch {
    return 0;
  }
}

async function fetchPolymarket(): Promise<PredictionEvent[]> {
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
      let totalVol24 = 0;
      let totalVol = 0;
      for (const m of e.markets) {
        totalVol24 += Number(m.volume24hr) || 0;
        totalVol += Number(m.volume) || 0;
      }

      const isMultiOutcome = e.markets.length > 2;
      let topOutcome = "Yes";
      let probability = 50;

      if (isMultiOutcome) {
        let bestPrice = 0;
        let bestLabel = "";
        for (const m of e.markets) {
          const yesPrice = parseYesPrice(m);
          if (yesPrice > bestPrice) {
            bestPrice = yesPrice;
            bestLabel = m.groupItemTitle || "";
          }
        }
        if (bestLabel && bestPrice > 0) {
          topOutcome = bestLabel;
          probability = Math.round(bestPrice * 100);
        }
      } else {
        const market = e.markets[0];
        try {
          const prices = JSON.parse(market.outcomePrices || "[]").map(Number);
          const outcomes: string[] = JSON.parse(market.outcomes || "[]");
          if (prices.length > 0 && outcomes.length > 0) {
            topOutcome = "Yes";
            probability = Math.round(prices[0] * 100);
          }
        } catch {
          // keep defaults
        }
      }

      return {
        id: e.id,
        title: e.title,
        slug: e.slug,
        url: `https://polymarket.com/event/${e.slug}`,
        topOutcome,
        probability,
        volume24hr: totalVol24,
        totalVolume: totalVol,
        endDate: e.endDate || "",
      };
    })
    .filter((e) => e.volume24hr > 0 && e.probability > 0 && e.probability < 100)
    .sort((a, b) => b.volume24hr - a.volume24hr)
    .slice(0, 5);
}

// ── Kalshi types ──

interface KalshiMarket {
  ticker: string;
  yes_ask: number;
  volume: number;
  yes_sub_title: string;
  subtitle: string;
  status: string;
}

interface KalshiEvent {
  event_ticker: string;
  title: string;
  category: string;
  mutually_exclusive: boolean;
  markets: KalshiMarket[];
}

interface KalshiResponse {
  events: KalshiEvent[];
}

async function fetchKalshi(): Promise<PredictionEvent[]> {
  const r = await fetch(
    "https://api.elections.kalshi.com/trade-api/v2/events?limit=30&status=open&with_nested_markets=true",
    {
      headers: { "User-Agent": "CryptUrls/1.0" },
      signal: AbortSignal.timeout(10000),
    }
  );
  if (!r.ok) return [];

  const data: KalshiResponse = await r.json();
  const events = data.events || [];

  return events
    .filter((e) => e.markets?.length > 0)
    .map((e) => {
      // Sum total volume across all markets in the event
      let totalVol = 0;
      for (const m of e.markets) {
        totalVol += Number(m.volume) || 0;
      }

      const isMultiOutcome = e.markets.length > 1;
      let topOutcome = "Yes";
      let probability = 50;

      if (isMultiOutcome) {
        // Find the market with the highest yes_ask (probability)
        let bestPrice = 0;
        let bestLabel = "";
        for (const m of e.markets) {
          const price = Number(m.yes_ask) || 0;
          if (price > bestPrice) {
            bestPrice = price;
            bestLabel = m.yes_sub_title || m.subtitle || "";
          }
        }
        if (bestLabel && bestPrice > 0) {
          topOutcome = bestLabel;
          probability = bestPrice; // Kalshi prices are already in cents (0-100)
        }
      } else {
        // Binary market
        const market = e.markets[0];
        const price = Number(market.yes_ask) || 0;
        if (price > 0) {
          topOutcome = "Yes";
          probability = price; // Already 0-100
        }
      }

      return {
        id: e.event_ticker,
        title: e.title,
        slug: e.event_ticker,
        url: `https://kalshi.com/markets/${e.event_ticker}`,
        topOutcome,
        probability: Math.round(probability),
        volume24hr: 0, // Kalshi doesn't expose 24h volume per event
        totalVolume: totalVol,
        endDate: "",
      };
    })
    .filter((e) => e.totalVolume > 0 && e.probability > 0 && e.probability < 100)
    .sort((a, b) => b.totalVolume - a.totalVolume)
    .slice(0, 5);
}

export async function GET() {
  const data = await getOrSetCache<PredictionsResponse>("predictions", 5 * 60 * 1000, async () => {
    const [polyResult, kalshiResult] = await Promise.allSettled([
      fetchPolymarket(),
      fetchKalshi(),
    ]);

    return {
      polymarket: polyResult.status === "fulfilled" ? polyResult.value : [],
      kalshi: kalshiResult.status === "fulfilled" ? kalshiResult.value : [],
    };
  });

  return NextResponse.json(data);
}
