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
  id: string;
  name: string;
  color: string;
  cryptoOnly?: boolean;
  titleFilter?: RegExp;
}

export const CHANNELS: ChannelConfig[] = [
  { id: "UCqK_GSMbpiV8spgD3ZGloSw", name: "Coin Bureau", color: "#E74C3C" },
  { id: "UCAl9Ld79qaZxp9JzEOwd3aA", name: "Bankless", color: "#9B59B6" },
  { id: "UCbLhGKVY-bJPcawebgtNfbw", name: "Altcoin Daily", color: "#3498DB" },
  { id: "UCRvqjQPSeaWn-uEx-w0XOIg", name: "Benjamin Cowen", color: "#F39C12" },
  { id: "UCevXpeL8cNyAnww-NqJ4m2w", name: "Anthony Pompliano", color: "#E67E22" },
  { id: "UC4VPa7EOvObpyCRI4YKRQRw", name: "Paul Barron Network", color: "#16A085" },
  { id: "UC9lOoRAlPEARvhs-QEn2rrw", name: "Virtual Bacon", color: "#FF6B35" },
  { id: "UC7B3Y1yrg4S7mmgoR-NsfxA", name: "Taiki Maeda", color: "#AB47BC" },
  { id: "UCBH5VZE_Y4F3CMcPIzPEB5A", name: "Real Vision", color: "#1E88E5" },
  { id: "UCN9Nj4tjXbVTLYWN0EKly_Q", name: "Crypto Banter", color: "#8E44AD", titleFilter: /\bran\b/i },
  { id: "UCh1ob28ceGdqohUnR7vBACA", name: "Finematics", color: "#2ECC71" },
  { id: "UCI7M65p3A-D3P4v5qW8POxQ", name: "CryptosRUs", color: "#FF7043" },
  { id: "UClgJyzwGs-GyaNxUHcLZrkg", name: "InvestAnswers", color: "#00BCD4", cryptoOnly: true },
  { id: "UC0zGwzu0zzCImC1BwPuWyXQ", name: "Bob Loukas", color: "#2196F3" },
  { id: "UCxIU1RFIdDpvA8VOITswQ1A", name: "Wolf Of All Streets", color: "#FF5252" },
  { id: "UCsYYksPHiGqXHPoHI-fm5sg", name: "Whiteboard Crypto", color: "#4CAF50" },
];

const CRYPTO_KEYWORDS = /bitcoin|btc|crypto|ethereum|eth|solana|sol|altcoin|defi|nft|blockchain|web3|token|coin|binance|cardano|xrp|chain|stablecoin|memecoin|hodl|bull|bear|halving|mining|wallet|ledger|staking/i;

// Filter out scheduled/upcoming livestreams by title patterns
const UPCOMING_PATTERNS = /\b(LIVE\s+in\b|Starting\s+Soon|Premieres?\s+(in|at)\b|Scheduled|Going\s+Live\s+at\b|Upcoming\s+Live)/i;

/** Title-based heuristic — avoids 80+ HEAD requests to youtube.com */
function isLikelyShort(title: string): boolean {
  return /#shorts?\b/i.test(title);
}

export function parseAllVideos(xml: string, ch: ChannelConfig): Omit<Video, "isShort">[] {
  const vids: Omit<Video, "isShort">[] = [];
  const re = /<entry>([\s\S]*?)<\/entry>/g;
  let m: RegExpExecArray | null;
  const now = Date.now();
  while ((m = re.exec(xml)) !== null && vids.length < 5) {
    const e = m[1];
    const t = e.match(/<title>(.*?)<\/title>/);
    const v = e.match(/<yt:videoId>(.*?)<\/yt:videoId>/);
    const pub = e.match(/<published>(.*?)<\/published>/);
    if (t && v) {
      const title = t[1].replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
      if (ch.cryptoOnly && !CRYPTO_KEYWORDS.test(title)) continue;
      // Skip upcoming/scheduled livestreams
      if (UPCOMING_PATTERNS.test(title)) continue;
      // Skip if channel has a titleFilter and title doesn't match (e.g. Crypto Banter → Ran only)
      if (ch.titleFilter && !ch.titleFilter.test(title)) continue;

      let published = "";
      let publishedTs = 0;
      if (pub?.[1]) {
        const d = new Date(pub[1]);
        if (!isNaN(d.getTime())) {
          // Skip videos published in the future (scheduled)
          if (d.getTime() > now + 5 * 60 * 1000) continue;
          published = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          publishedTs = d.getTime();
        }
      }
      vids.push({
        title,
        channel: ch.name,
        views: "",
        videoId: v[1],
        thumbnail: `https://img.youtube.com/vi/${v[1]}/mqdefault.jpg`,
        color: ch.color,
        published,
        publishedTs,
      });
    }
  }
  return vids;
}

export async function GET() {
  const cached = getCached<Video[]>("yt");
  if (cached) return NextResponse.json(cached);

  // Fetch all channels and grab up to 5 videos each
  const allRaw: Omit<Video, "isShort">[] = [];
  const settled = await Promise.allSettled(
    CHANNELS.map(async (ch) => {
      try {
        const r = await Promise.race([
          fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${ch.id}`),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 10000)),
        ]);
        if (!r.ok) return [];
        return parseAllVideos(await r.text(), ch);
      } catch {
        return [];
      }
    })
  );

  for (const r of settled) {
    if (r.status === "fulfilled") allRaw.push(...r.value);
  }

  // Tag shorts via title heuristic (instant, no network)
  const tagged: Video[] = allRaw.map((v) => ({
    ...v,
    isShort: isLikelyShort(v.title),
  }));

  // Separate: regular videos only, 1 per channel, sorted by date
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
