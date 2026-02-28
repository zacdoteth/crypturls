import { NextResponse } from "next/server";
import { getCached, setCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

export interface Video {
  title: string;
  channel: string;
  views: string;
  videoId: string;
  thumbnail: string;
  color: string;
  published: string;
  publishedTs: number;
  isShort?: boolean;
}

interface ChannelConfig {
  /** YouTube @handle or /channel/ID path */
  handle: string;
  name: string;
  color: string;
  cryptoOnly?: boolean;
  titleFilter?: RegExp;
}

export const CHANNELS: ChannelConfig[] = [
  { handle: "@CoinBureau", name: "Coin Bureau", color: "#E74C3C" },
  { handle: "@Bankless", name: "Bankless", color: "#9B59B6" },
  { handle: "@AltcoinDaily", name: "Altcoin Daily", color: "#3498DB" },
  { handle: "@intothecryptoverse", name: "Benjamin Cowen", color: "#F39C12" },
  { handle: "@AnthonyPompliano", name: "Anthony Pompliano", color: "#E67E22" },
  { handle: "@PaulBarronNetwork", name: "Paul Barron Network", color: "#16A085" },
  { handle: "@VirtualBacon", name: "Virtual Bacon", color: "#FF6B35" },
  { handle: "channel/UC7B3Y1yrg4S7mmgoR-NsfxA", name: "Taiki Maeda", color: "#AB47BC" },
  { handle: "@RealVisionFinance", name: "Real Vision", color: "#1E88E5" },
  { handle: "@CryptoBanterGroup", name: "Crypto Banter", color: "#8E44AD", titleFilter: /\bran\b/i },
  { handle: "@Finematics", name: "Finematics", color: "#2ECC71" },
  { handle: "@CryptosRUs", name: "CryptosRUs", color: "#FF7043" },
  { handle: "@InvestAnswers", name: "InvestAnswers", color: "#00BCD4", cryptoOnly: true },
  { handle: "channel/UC0zGwzu0zzCImC1BwPuWyXQ", name: "Bob Loukas", color: "#2196F3" },
  { handle: "@scottmelker", name: "Wolf Of All Streets", color: "#FF5252" },
  { handle: "@WhiteboardCrypto", name: "Whiteboard Crypto", color: "#4CAF50" },
];

const CRYPTO_KEYWORDS = /bitcoin|btc|crypto|ethereum|eth|solana|sol|altcoin|defi|nft|blockchain|web3|token|coin|binance|cardano|xrp|chain|stablecoin|memecoin|hodl|bull|bear|halving|mining|wallet|ledger|staking/i;
const UPCOMING_PATTERNS = /\b(LIVE\s+in\b|Starting\s+Soon|Premieres?\s+(in|at)\b|Scheduled|Going\s+Live\s+at\b|Upcoming\s+Live)/i;

function isLikelyShort(title: string): boolean {
  return /#shorts?\b/i.test(title);
}

/** Convert relative time like "2 days ago" to an approximate timestamp */
function relativeToTs(text: string): number {
  const now = Date.now();
  if (!text) return 0;
  const m = text.match(/(\d+)\s+(second|minute|hour|day|week|month|year)/i);
  if (!m) return 0;
  const n = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  const ms: Record<string, number> = {
    second: 1000, minute: 60000, hour: 3600000,
    day: 86400000, week: 604800000, month: 2592000000, year: 31536000000,
  };
  return now - n * (ms[unit] || 0);
}

/** Scrape ytInitialData from a channel's /videos page */
async function scrapeChannel(ch: ChannelConfig): Promise<Omit<Video, "isShort">[]> {
  const url = `https://www.youtube.com/${ch.handle}/videos`;
  const r = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) return [];

  const html = await r.text();
  const m = html.match(new RegExp("var ytInitialData = ({.*?});</script>", "s"));
  if (!m) return [];

  const data = JSON.parse(m[1]);
  const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
  const vTab = tabs.find(
    (t: { tabRenderer?: { title?: string } }) => t.tabRenderer?.title === "Videos"
  );
  const items = vTab?.tabRenderer?.content?.richGridRenderer?.contents || [];

  const now = Date.now();
  const vids: Omit<Video, "isShort">[] = [];

  for (const item of items) {
    if (vids.length >= 5) break;
    const v = item?.richItemRenderer?.content?.videoRenderer;
    if (!v?.videoId) continue;

    const title: string = v.title?.runs?.[0]?.text || "";
    if (!title) continue;
    if (ch.cryptoOnly && !CRYPTO_KEYWORDS.test(title)) continue;
    if (UPCOMING_PATTERNS.test(title)) continue;
    if (ch.titleFilter && !ch.titleFilter.test(title)) continue;

    const relTime: string = v.publishedTimeText?.simpleText || "";
    const publishedTs = relativeToTs(relTime);
    // Skip future/scheduled
    if (publishedTs > now + 5 * 60 * 1000) continue;

    const published = publishedTs
      ? new Date(publishedTs).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "";

    const views: string = v.viewCountText?.simpleText || "";

    vids.push({
      title,
      channel: ch.name,
      views,
      videoId: v.videoId,
      thumbnail: `https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`,
      color: ch.color,
      published,
      publishedTs,
    });
  }

  return vids;
}

export async function GET() {
  const cached = getCached<Video[]>("yt");
  if (cached) return NextResponse.json(cached);

  const allRaw: Omit<Video, "isShort">[] = [];
  const settled = await Promise.allSettled(
    CHANNELS.map(async (ch) => {
      try {
        return await scrapeChannel(ch);
      } catch {
        return [];
      }
    })
  );

  for (const r of settled) {
    if (r.status === "fulfilled") allRaw.push(...r.value);
  }

  // Tag shorts via title heuristic
  const tagged: Video[] = allRaw.map((v) => ({
    ...v,
    isShort: isLikelyShort(v.title),
  }));

  // Regular videos: 1 per channel, sorted by date
  const seen = new Set<string>();
  const regular: Video[] = [];
  const sorted = [...tagged].sort((a, b) => b.publishedTs - a.publishedTs);
  for (const v of sorted) {
    if (!v.isShort && !seen.has(v.channel)) {
      seen.add(v.channel);
      regular.push(v);
    }
  }

  setCache("yt", regular, 30 * 60 * 1000);

  // Also cache shorts separately for the shorts endpoint
  const shorts = sorted.filter((v) => v.isShort);
  setCache("yt-shorts", shorts, 30 * 60 * 1000);

  return NextResponse.json(regular.slice(0, 18));
}
