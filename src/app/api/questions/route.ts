import { NextResponse } from "next/server";
import { getOrSetCache } from "@/lib/cache";
import { fetchJsonWithTimeout, fetchTextWithTimeout } from "@/lib/http";

// Generates dynamic question chips based on real market data:
// - F&G sentiment → fear/greed-appropriate questions
// - Top movers → "Why is X pumping/dumping?"
// - Top headlines → contextual questions about breaking news

interface QuestionData {
  questions: string[];
}

interface FngPayload {
  value: number;
  label: string;
}

interface TrendingPayload {
  sym: string;
  pct: string;
  tag: string;
  up: boolean;
}

type FeedHeadlinePayload = Record<string, { articles: { title: string }[] }>;

const FALLBACK_QUESTIONS = [
  "Where is the market headed next?",
  "What should I be watching right now?",
  "Which coins have the best fundamentals?",
  "What's the safest way to store crypto?",
  "What are the biggest risks right now?",
  "Is DCA still the best strategy?",
];

export async function GET() {
  try {
    const cacheKey = "questions";
    const result = await getOrSetCache<QuestionData>(
      cacheKey,
      15 * 60 * 1000,
      async () => {
        const questions: string[] = [];

        // Fetch F&G, trending, and top headlines in parallel
        const [fngRes, trendingRes, feedsRes] = await Promise.allSettled([
          fetchJSON("/api/fng"),
          fetchJSON("/api/trending"),
          fetchJSON("/api/feeds"),
        ]);

        // 1. F&G-based questions
        const fng =
          fngRes.status === "fulfilled"
            ? (fngRes.value as FngPayload | null)
            : null;
        if (fng?.value !== undefined) {
          if (fng.value <= 20) {
            questions.push(
              `Why is Fear & Greed at ${fng.value}?`,
              "Is now a good time to buy the dip?",
              "How bad can this crash get?"
            );
          } else if (fng.value <= 40) {
            questions.push(
              "Is the market about to recover?",
              "What's driving the current fear?"
            );
          } else if (fng.value >= 80) {
            questions.push(
              "Is the market overheated?",
              "Should I take profits now?",
              "Are we near a top?"
            );
          } else if (fng.value >= 60) {
            questions.push(
              "How long can this rally last?",
              "What's fueling the current optimism?"
            );
          } else {
            questions.push(
              "Where is the market headed next?",
              "What should I be watching right now?"
            );
          }
        }

        // 2. Trending coin questions — biggest movers
        const trending =
          trendingRes.status === "fulfilled"
            ? (trendingRes.value as TrendingPayload[])
            : [];
        if (Array.isArray(trending) && trending.length > 0) {
          // Find biggest gainer and biggest loser
          const sorted = [...trending].sort(
            (a, b) => parseFloat(b.pct) - parseFloat(a.pct)
          );
          const topGainer = sorted[0];
          const topLoser = sorted[sorted.length - 1];

          if (topGainer && parseFloat(topGainer.pct) > 5) {
            questions.push(`Why is ${topGainer.sym} up ${topGainer.pct}?`);
          }
          if (topLoser && parseFloat(topLoser.pct) < -5) {
            questions.push(
              `What happened to ${topLoser.sym} (${topLoser.pct})?`
            );
          }

          // Add a question about a random trending coin
          const mid = trending[Math.floor(trending.length / 2)];
          if (mid) {
            questions.push(`What is ${mid.tag || mid.sym} and should I buy it?`);
          }
        }

        // 3. Headline-based questions — extract key topics from top stories
        const feeds =
          feedsRes.status === "fulfilled"
            ? (feedsRes.value as FeedHeadlinePayload)
            : {};
        const allHeadlines: string[] = [];
        for (const key of Object.keys(feeds)) {
          const articles = feeds[key]?.articles || [];
          if (articles.length > 0) {
            allHeadlines.push(articles[0].title);
          }
        }

        // Generate questions from headline keywords
        const headlineText = allHeadlines.join(" ").toLowerCase();
        const topicQuestions: [string, string][] = [
          ["hack", "Are my funds safe on exchanges?"],
          ["etf", "What's happening with crypto ETFs?"],
          ["sec", "How will SEC decisions affect crypto?"],
          ["regulation", "What new crypto regulations are coming?"],
          ["stablecoin", "Why do stablecoins matter right now?"],
          ["tariff", "How do tariffs impact crypto markets?"],
          ["bitcoin", "Where is Bitcoin headed this week?"],
          ["ethereum", "What's next for Ethereum?"],
          ["solana", "Is Solana still a good bet?"],
          ["ai ", "How is AI changing crypto?"],
          ["defi", "What's happening in DeFi right now?"],
          ["memecoin", "Are memecoins dead?"],
          ["nft", "Is the NFT market recovering?"],
          ["layer 2", "Which Layer 2 is winning?"],
          ["airdrop", "What airdrops should I be farming?"],
        ];

        for (const [keyword, question] of topicQuestions) {
          if (headlineText.includes(keyword) && !questions.includes(question)) {
            questions.push(question);
          }
        }

        // Ensure we have at least 6 questions, pad with evergreen ones
        const evergreen = [
          "What should beginners know about crypto?",
          "Which coins have the best fundamentals?",
          "What's the safest way to store crypto?",
          "How do I evaluate a new token?",
          "What are the biggest risks right now?",
          "Is DCA still the best strategy?",
        ];

        while (questions.length < 8) {
          const q = evergreen.shift();
          if (q && !questions.includes(q)) questions.push(q);
          else break;
        }

        return { questions: questions.slice(0, 10) };
      }
    );

    return NextResponse.json(result);
  } catch (e) {
    console.error("Questions route failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ questions: FALLBACK_QUESTIONS });
  }
}

// Helper to fetch from our own API routes during SSR
async function fetchJSON(path: string): Promise<unknown> {
  // In server context, call the handlers directly via absolute URL
  // or use the internal data. For simplicity, we'll fetch the external APIs directly.
  try {
    if (path === "/api/fng") {
      const json = await fetchJsonWithTimeout<{
        data?: Array<{ value: string; value_classification: string }>;
      }>("https://api.alternative.me/fng/?limit=1", {
        timeoutMs: 8000,
        headers: { "User-Agent": "CryptUrls/1.0" },
      });
      return {
        value: parseInt(json?.data?.[0]?.value || "50", 10),
        label: json?.data?.[0]?.value_classification || "Neutral",
      };
    }
    if (path === "/api/trending") {
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
      return (json.coins || []).slice(0, 12).map(
        (c: {
          item: {
            symbol: string;
            data?: { price_change_percentage_24h?: { usd?: number } };
            name: string;
          };
        }) => {
          const pctChange =
            c.item.data?.price_change_percentage_24h?.usd ?? 0;
          return {
            sym: c.item.symbol.toUpperCase(),
            pct: `${pctChange >= 0 ? "+" : ""}${pctChange.toFixed(1)}%`,
            tag: c.item.name,
            up: pctChange >= 0,
          };
        }
      );
    }
    if (path === "/api/feeds") {
      // Just grab a few top headlines from major sources
      const urls = [
        { key: "coindesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
        { key: "decrypt", url: "https://decrypt.co/feed" },
        { key: "cointelegraph", url: "https://cointelegraph.com/rss" },
      ];
      const result: Record<string, { articles: { title: string }[] }> = {};
      await Promise.allSettled(
        urls.map(async ({ key, url }) => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          try {
            const xml = await fetchTextWithTimeout(url, {
              timeoutMs: 5000,
              signal: controller.signal,
              headers: { "User-Agent": "CryptUrls/1.0" },
            });
            // Extract first 3 titles
            const titles: string[] = [];
            const titleRegex =
              /<item[\s>][\s\S]*?<title[^>]*>(?:\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*|([\s\S]*?))<\/title>/gi;
            let m;
            while ((m = titleRegex.exec(xml)) !== null && titles.length < 3) {
              titles.push((m[1] || m[2] || "").replace(/<[^>]*>/g, "").trim());
            }
            result[key] = { articles: titles.map((t) => ({ title: t })) };
          } finally {
            clearTimeout(timeout);
          }
        })
      );
      return result;
    }
    return null;
  } catch {
    return null;
  }
}
