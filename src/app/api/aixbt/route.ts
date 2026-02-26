import { NextResponse } from "next/server";
import { getOrSetCache, setCache } from "@/lib/cache";
import { fetchJsonWithTimeout, fetchTextWithTimeout } from "@/lib/http";

export const dynamic = "force-dynamic";

export interface AixbtProject {
  name: string;
  ticker: string;
  momentum: number;
  snapshot: string;
  priceChange?: number; // 24h % change from CoinGecko (null if not found)
}

// Scrape AIXBT surging projects page (no API key needed)
async function scrapeAixbtSurging(): Promise<AixbtProject[]> {
  const html = await fetchTextWithTimeout("https://aixbt.tech/projects", {
    timeoutMs: 8000,
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Accept": "text/html",
    },
  });

  const projects: AixbtProject[] = [];

  // Split by data-project-id to isolate each row
  const parts = html.split(/data-project-id="[^"]*"/);

  for (let i = 1; i < parts.length; i++) {
    const chunk = parts[i].slice(0, 3000);

    // Score: first bold uppercase number in this row
    const scoreMatch = chunk.match(/font-bold uppercase">(\d{2,3})<\/span>/);
    // Name: bold whitespace-nowrap uppercase text
    const nameMatch = chunk.match(/font-bold whitespace-nowrap uppercase">([^<]+)<\/span>/);
    // Ticker: $<!-- -->ticker
    const tickerMatch = chunk.match(/\$<!-- -->([^<]+)<\/span>/);
    // Snapshot: line-clamp-2 h-full w-full content
    const snapMatch = chunk.match(/line-clamp-2 h-full w-full[^>]*>([^<]+)<\/span>/);

    if (scoreMatch && nameMatch) {
      const name = nameMatch[1].trim();
      // Skip header labels that might match
      if (/^(momentum|score|name|snapshot)/i.test(name)) continue;

      projects.push({
        name,
        ticker: (tickerMatch?.[1] || "").toUpperCase().trim(),
        momentum: parseInt(scoreMatch[1], 10),
        snapshot: (snapMatch?.[1] || "")
          .replace(/&#x27;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, "&")
          .trim(),
      });
    }
  }

  return projects;
}

async function fetchCoinGeckoFallback(): Promise<AixbtProject[]> {
  const json = await fetchJsonWithTimeout<{
    coins?: Array<{
      item?: {
        name?: string;
        symbol?: string;
        market_cap_rank?: number;
      };
    }>;
  }>("https://api.coingecko.com/api/v3/search/trending", {
    timeoutMs: 6000,
    headers: { "User-Agent": "CryptUrls/1.0" },
  });
  const coins = Array.isArray(json?.coins) ? json.coins : [];

  return coins.slice(0, 15).map(
    (
      c: {
        item?: {
          name?: string;
          symbol?: string;
          market_cap_rank?: number;
        };
      },
      idx: number
    ) => ({
      name: c.item?.name || "Unknown",
      ticker: (c.item?.symbol || "???").toUpperCase(),
      momentum: Math.max(5, 100 - idx * 7),
      snapshot: c.item?.market_cap_rank ? `Trending — rank #${c.item.market_cap_rank}` : "Trending on CoinGecko",
    })
  );
}

// Fetch top coins from CoinGecko and build a ticker → 24h change map
async function getPriceChanges(): Promise<Map<string, number>> {
  try {
    const coins = await getOrSetCache("cg-markets", 5 * 60 * 1000, async () => {
      return fetchJsonWithTimeout<
        Array<{ symbol?: string; price_change_percentage_24h?: number }>
      >(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&sparkline=false&price_change_percentage=24h",
        { timeoutMs: 8000, headers: { "User-Agent": "CryptUrls/1.0" } }
      );
    });

    const map = new Map<string, number>();
    if (Array.isArray(coins)) {
      for (const c of coins) {
        if (c.symbol && c.price_change_percentage_24h != null) {
          map.set(c.symbol.toUpperCase(), c.price_change_percentage_24h);
        }
      }
    }
    return map;
  } catch {
    return new Map();
  }
}

export async function GET() {
  try {
    const projects = await getOrSetCache("aixbt", 10 * 60 * 1000, async () => {
      // Try scraping AIXBT projects page first
      try {
        const scraped = await scrapeAixbtSurging();
        if (scraped.length > 0) return scraped;
      } catch {
        // fall through
      }

      // Try AIXBT API if we have a key
      const apiKey = process.env.AIXBT_API_KEY;
      if (apiKey) {
        try {
          const json = await fetchJsonWithTimeout<{
            data?: Array<{
              name?: string;
              ticker?: string;
              symbol?: string;
              momentum?: number;
              score?: number;
              snapshot?: string;
              category?: string;
            }>;
          }>("https://api.aixbt.tech/v2/projects?limit=20&sort=momentum", {
            timeoutMs: 8000,
            headers: { "User-Agent": "CryptUrls/1.0", "x-api-key": apiKey },
          });

          const data = Array.isArray(json?.data) ? json.data : [];
          const mapped: AixbtProject[] = data.slice(0, 15).map((p) => ({
            name: p.name || "Unknown",
            ticker: (p.ticker || p.symbol || "???").toUpperCase(),
            momentum: p.momentum ?? p.score ?? 0,
            snapshot: p.snapshot || p.category || "",
          }));
          if (mapped.length > 0) return mapped;
        } catch {
          // fall through
        }
      }

      return fetchCoinGeckoFallback();
    });

    // Enrich with 24h price changes from CoinGecko
    const changes = await getPriceChanges();
    for (const p of projects) {
      if (p.ticker && changes.has(p.ticker)) {
        p.priceChange = changes.get(p.ticker);
      }
    }

    return NextResponse.json(projects);
  } catch (e) {
    console.error("AIXBT fetch failed:", e instanceof Error ? e.message : e);
    setCache("aixbt", [], 60 * 1000);
    return NextResponse.json([]);
  }
}
