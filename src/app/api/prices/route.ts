import { NextResponse } from "next/server";
import { PRICE_COINS } from "@/lib/sources";
import { getOrSetCache, setCache } from "@/lib/cache";
import { fetchJsonWithTimeout } from "@/lib/http";

export interface PriceData {
  sym: string;
  price: string;
  change: string;
  up: boolean;
}

export async function GET() {
  const cacheKey = "prices";

  try {
    const prices = await getOrSetCache(cacheKey, 2 * 60 * 1000, async () => {
      const ids = PRICE_COINS.map((c) => c.id).join(",");
      const data = await fetchJsonWithTimeout<Record<string, { usd?: number; usd_24h_change?: number }>>(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
        {
          timeoutMs: 8000,
          headers: { "User-Agent": "CryptUrls/1.0" },
        }
      );

      return PRICE_COINS.map((coin) => {
        const info = data[coin.id];
        if (!info) {
          return { sym: coin.sym, price: "—", change: "0.00%", up: false };
        }

        const price = info.usd ?? 0;
        const change24h = info.usd_24h_change ?? 0;
        const up = change24h >= 0;

        if (!price) {
          return { sym: coin.sym, price: "—", change: "0.00%", up: false };
        }

        // Format price: show full precision for small coins, commas for big ones
        let priceStr: string;
        if (price >= 1000) {
          priceStr = price.toLocaleString("en-US", {
            maximumFractionDigits: 0,
          });
        } else if (price >= 1) {
          priceStr = price.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
        } else {
          priceStr = price.toLocaleString("en-US", {
            minimumFractionDigits: 3,
            maximumFractionDigits: 4,
          });
        }

        const changeStr = `${up ? "+" : ""}${change24h.toFixed(2)}%`;

        return { sym: coin.sym, price: priceStr, change: changeStr, up };
      });
    });

    return NextResponse.json(prices);
  } catch (e) {
    console.error("CoinGecko fetch failed:", e);
    const fallback = PRICE_COINS.map((c) => ({
      sym: c.sym,
      price: "—",
      change: "0.00%",
      up: false,
    }));
    // Cache fallback briefly to avoid hammering upstream during incidents.
    setCache(cacheKey, fallback, 30 * 1000);
    return NextResponse.json(fallback, { status: 200 });
  }
}
