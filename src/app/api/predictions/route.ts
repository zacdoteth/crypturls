import { NextResponse } from "next/server";
import { getOrSetCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

interface PredictionOutcome {
  label: string;
  probability: number;
}

export interface PredictionEvent {
  id: string;
  title: string;
  url: string;
  outcomes: PredictionOutcome[];
  volume24h: number;
}

interface PredictionsResponse {
  polymarket: PredictionEvent[];
  kalshi: PredictionEvent[];
}

// ── Polymarket ──

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
      let vol24 = 0;
      for (const m of e.markets) {
        vol24 += Number(m.volume24hr) || 0;
      }

      const isMultiOutcome = e.markets.length > 2;
      const outcomes: PredictionOutcome[] = [];

      if (isMultiOutcome) {
        const parsed = e.markets
          .map((m) => ({
            label: m.groupItemTitle || "",
            probability: Math.round(parseYesPrice(m) * 100),
          }))
          .filter((o) => o.label && o.probability > 0)
          .sort((a, b) => b.probability - a.probability);
        outcomes.push(...parsed.slice(0, 3));
      } else {
        const market = e.markets[0];
        try {
          const prices = JSON.parse(market.outcomePrices || "[]").map(Number);
          if (prices.length > 0 && prices[0] > 0) {
            outcomes.push({ label: "Yes", probability: Math.round(prices[0] * 100) });
          }
        } catch {
          // skip
        }
      }

      return {
        id: e.id,
        title: e.title,
        url: `https://polymarket.com/event/${e.slug}`,
        outcomes,
        volume24h: vol24,
      };
    })
    .filter((e) => e.volume24h > 0 && e.outcomes.length > 0 && e.outcomes[0].probability < 100)
    .sort((a, b) => b.volume24h - a.volume24h)
    .slice(0, 4);
}

// ── Kalshi ──

interface KalshiMarket {
  ticker: string;
  yes_ask: number;
  volume: number;
  volume_24h: number;
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
    "https://api.elections.kalshi.com/trade-api/v2/events?limit=50&status=open&with_nested_markets=true",
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
      // Kalshi volume_24h is in contracts, not dollars — use total volume for sorting
      // and compute approximate dollar volume from contracts × price
      let totalContracts = 0;
      let dollarVol = 0;
      for (const m of e.markets) {
        const contracts = Number(m.volume) || 0;
        totalContracts += contracts;
        // yes_ask is in cents (0-100), convert to dollar fraction
        dollarVol += contracts * (Number(m.yes_ask) || 0) / 100;
      }

      const isMultiOutcome = e.markets.length > 1;
      const outcomes: PredictionOutcome[] = [];

      if (isMultiOutcome) {
        const parsed = e.markets
          .map((m) => ({
            label: m.yes_sub_title || m.subtitle || "",
            probability: Math.round(Number(m.yes_ask) || 0),
          }))
          .filter((o) => o.label && o.probability > 0)
          .sort((a, b) => b.probability - a.probability);
        outcomes.push(...parsed.slice(0, 3));
      } else {
        const market = e.markets[0];
        const price = Math.round(Number(market.yes_ask) || 0);
        if (price > 0) {
          outcomes.push({ label: "Yes", probability: price });
        }
      }

      return {
        id: e.event_ticker,
        title: e.title,
        url: `https://kalshi.com/markets/${e.event_ticker}`,
        outcomes,
        volume24h: Math.round(dollarVol), // approximate dollar volume from total contracts × price
      };
    })
    .filter((e) => e.volume24h > 0 && e.outcomes.length > 0 && e.outcomes[0].probability < 100)
    .sort((a, b) => b.volume24h - a.volume24h)
    .slice(0, 4);
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
