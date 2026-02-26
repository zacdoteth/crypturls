import { NextResponse } from "next/server";
import { getOrSetCache, setCache } from "@/lib/cache";
import { fetchJsonWithTimeout } from "@/lib/http";

export interface TrendingCoin {
  sym: string;
  pct: string;
  tag: string;
  up: boolean;
}

export async function GET() {
  const cacheKey = "trending";

  try {
    const trending = await getOrSetCache(cacheKey, 5 * 60 * 1000, async () => {
      const json = await fetchJsonWithTimeout<{
        coins?: Array<{
          item: {
            symbol: string;
            data?: { price_change_percentage_24h?: { usd?: number } };
            name: string;
          };
        }>;
      }>(
        "https://api.coingecko.com/api/v3/search/trending",
        {
          timeoutMs: 8000,
          headers: { "User-Agent": "CryptUrls/1.0" },
        }
      );
      const coins = json.coins || [];

      return coins.slice(0, 12).map(
        (c: {
          item: {
            symbol: string;
            data?: { price_change_percentage_24h?: { usd?: number } };
            name: string;
          };
        }) => {
          const pctChange =
            c.item.data?.price_change_percentage_24h?.usd ?? 0;
          const up = pctChange >= 0;
          return {
            sym: c.item.symbol.toUpperCase(),
            pct: `${up ? "+" : ""}${pctChange.toFixed(1)}%`,
            tag: c.item.name,
            up,
          };
        }
      );
    });

    return NextResponse.json(trending);
  } catch (e) {
    console.error("Trending fetch failed:", e);
    setCache(cacheKey, [], 30 * 1000);
    return NextResponse.json([]);
  }
}
