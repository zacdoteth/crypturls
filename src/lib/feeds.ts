import { NEWS_SOURCES, COMMUNITY_SOURCES, type SourceConfig } from "@/lib/sources";
import { getOrSetCache } from "@/lib/cache";
import { fetchJsonWithTimeout, fetchTextWithTimeout } from "@/lib/http";

export interface Article {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

export interface FeedData {
  [sourceKey: string]: {
    name: string;
    color: string;
    domain: string;
    articles: Article[];
  };
}

function sanitizeUrl(raw: string | null | undefined): string {
  if (!raw) return "#";

  const normalized = raw.trim();
  if (!normalized) return "#";

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return "#";
  } catch {
    return "#";
  }
}

export function buildEmptyFeedData(): FeedData {
  const allSources = [...NEWS_SOURCES, ...COMMUNITY_SOURCES];
  const empty: FeedData = {};
  for (const source of allSources) {
    empty[source.key] = {
      name: source.name,
      color: source.color,
      domain: source.domain,
      articles: [],
    };
  }
  return empty;
}

function parseRSSXml(xml: string, sourceKey: string, limit = 7): Article[] {
  const articles: Article[] = [];

  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null && articles.length < limit) {
    const item = match[1];
    const title = extractTag(item, "title");
    const link = extractTag(item, "link") || extractAtomLink(item);
    const pubDate = extractTag(item, "pubDate") || extractTag(item, "dc:date") || "";
    if (title) {
      articles.push({
        title: decodeEntities(title),
        link: sanitizeUrl(link),
        pubDate: pubDate || new Date().toISOString(),
        source: sourceKey,
      });
    }
  }

  if (articles.length === 0) {
    const entryRegex = /<entry[\s>]([\s\S]*?)<\/entry>/gi;
    while ((match = entryRegex.exec(xml)) !== null && articles.length < limit) {
      const entry = match[1];
      const title = extractTag(entry, "title");
      const link = extractAtomLink(entry) || extractTag(entry, "link");
      const pubDate = extractTag(entry, "published") || extractTag(entry, "updated") || "";
      if (title) {
        articles.push({
          title: decodeEntities(title),
          link: sanitizeUrl(link),
          pubDate: pubDate || new Date().toISOString(),
          source: sourceKey,
        });
      }
    }
  }

  return articles;
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(
    `<${tag}[^>]*>(?:\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*|([\\s\\S]*?))<\\/${tag}>`,
    "i"
  );
  const m = regex.exec(xml);
  if (!m) return null;
  return (m[1] || m[2] || "").trim();
}

function extractAtomLink(xml: string): string | null {
  const m = xml.match(/<link[^>]*(?:rel=["']alternate["'][^>]*)?href=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

function decodeEntities(str: string): string {
  return str
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#\d+;/g, (m) => String.fromCharCode(parseInt(m.slice(2, -1), 10)))
    .trim();
}

// Sources that get post-filtered need more initial articles to compensate
const OVERFETCH_SOURCES = new Set(["decrypt"]);

async function fetchRSS(feedUrl: string, sourceKey: string): Promise<Article[]> {
  const limit = OVERFETCH_SOURCES.has(sourceKey) ? 15 : 7;
  const xml = await fetchTextWithTimeout(feedUrl, {
    timeoutMs: 10000,
    headers: { "User-Agent": "CryptUrls/1.0 (https://crypturls.com)" },
  });
  return parseRSSXml(xml, sourceKey, limit);
}

async function fetchReddit(feedUrl: string, sourceKey: string): Promise<Article[]> {
  const json = await fetchJsonWithTimeout<{ data?: { children?: { data: { stickied: boolean; title: string; permalink: string; created_utc: number } }[] } }>(
    feedUrl,
    {
      timeoutMs: 10000,
      headers: { "User-Agent": "CryptUrls/1.0 (by /u/crypturls)" },
    }
  );

  return (json?.data?.children || [])
    .filter((p) => !p.data.stickied)
    .slice(0, 7)
    .map((p) => ({
      title: p.data.title,
      link: sanitizeUrl(`https://reddit.com${p.data.permalink}`),
      pubDate: new Date(p.data.created_utc * 1000).toISOString(),
      source: sourceKey,
    }));
}

async function fetch4chan(sourceKey: string): Promise<Article[]> {
  const pages = await fetchJsonWithTimeout<Array<{ threads?: Array<{ sub?: string; com?: string; no: number; time: number }> }>>(
    "https://a.4cdn.org/biz/catalog.json",
    {
      timeoutMs: 10000,
      headers: { "User-Agent": "CryptUrls/1.0" },
    }
  );

  const threads: Article[] = [];
  for (const page of pages.slice(0, 2)) {
    for (const thread of (page.threads || []).slice(0, 5)) {
      if (thread.sub || thread.com) {
        threads.push({
          title: decodeEntities((thread.sub || thread.com || "").slice(0, 120)) || "Anonymous",
          link: sanitizeUrl(`https://boards.4chan.org/biz/thread/${thread.no}`),
          pubDate: new Date(thread.time * 1000).toISOString(),
          source: sourceKey,
        });
      }
    }
  }
  return threads.slice(0, 7);
}

// --- Decrypt AI filter ---
// Keep crypto-AI crossover ("Bittensor AI agents") but drop pure-AI ("OpenAI releases GPT-5")
const AI_NOISE = /\b(openai|anthropic|deepmind|chatgpt|gpt-[0-9]|midjourney|stable.?diffusion|samsung.*\bai\b|nvidia.*(?:earnings|ai\b)|xai\b.*(?:lawsuit|trade.?secret)|ai\s+(?:race|phone|coding|models?|spending|war|safety|benchmark))\b/i;
const CRYPTO_SIGNAL = /\b(bitcoin|btc|ethereum|eth|solana|sol|crypto|blockchain|defi|nft|tokens?|coins?|stablecoin|binance|coinbase|uniswap|dex|dao|web3|memecoin|altcoin|mining|wallet|airdrop|stak(?:ing|ed)|polkadot|cardano|xrp|ripple|tether|usdc|usdt|circle|exchange|ledger|metamask|l[12]|layer.?[12]|rollup|bridge|swap|yield|liquidity|on.?chain)\b/i;

function isNonCryptoAI(title: string): boolean {
  return AI_NOISE.test(title) && !CRYPTO_SIGNAL.test(title);
}

async function fetchSource(source: SourceConfig): Promise<Article[]> {
  try {
    let articles: Article[];
    switch (source.type) {
      case "rss":
      case "defillama":
        articles = await fetchRSS(source.feedUrl, source.key);
        break;
      case "reddit":
        articles = await fetchReddit(source.feedUrl, source.key);
        break;
      case "chan":
        articles = await fetch4chan(source.key);
        break;
      default:
        articles = [];
    }

    // Filter pure-AI noise from Decrypt (keep crypto-AI crossover)
    if (source.key === "decrypt") {
      articles = articles.filter((a) => !isNonCryptoAI(a.title)).slice(0, 7);
    }

    return articles;
  } catch (e) {
    console.error(`Feed failed [${source.key}]:`, e instanceof Error ? e.message : e);
    return [];
  }
}

export async function getFeedsData(): Promise<FeedData> {
  const cacheKey = "feeds-all";
  return getOrSetCache(cacheKey, 5 * 60 * 1000, async () => {
    const allSources = [...NEWS_SOURCES, ...COMMUNITY_SOURCES];
    const next: FeedData = {};

    const settled = await Promise.allSettled(
      allSources.map(async (source) => {
        const articles = await fetchSource(source);
        return { source, articles };
      })
    );

    for (const result of settled) {
      if (result.status === "fulfilled") {
        const { source, articles } = result.value;
        next[source.key] = {
          name: source.name,
          color: source.color,
          domain: source.domain,
          articles,
        };
      }
    }

    for (const source of allSources) {
      if (!next[source.key]) {
        next[source.key] = {
          name: source.name,
          color: source.color,
          domain: source.domain,
          articles: [],
        };
      }
    }

    return next;
  });
}
