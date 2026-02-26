import { NextResponse } from "next/server";
import { getOrSetCache, setCache } from "@/lib/cache";
import { fetchJsonWithTimeout, fetchTextWithTimeout } from "@/lib/http";

export const dynamic = "force-dynamic";

export interface PodcastData {
  title: string;
  host: string;
  color: string;
  artworkUrl: string;
  latestVideoId: string;
  latestEpisode: string;
  published: string;
}

// Each podcast has a YouTube channel where they post episodes
// titleFilter: only show episodes matching this regex (e.g. Crypto Banter → Ran only)
const CURATED: Array<{ term: string; host: string; color: string; ytChannelId: string; titleFilter?: RegExp }> = [
  { term: "Bankless podcast", host: "Ryan & David", color: "#9B59B6", ytChannelId: "UCAl9Ld79qaZxp9JzEOwd3aA" },
  { term: "Unchained Laura Shin", host: "Laura Shin", color: "#00BCD4", ytChannelId: "UCWiiMnsnw5Isc2PP1to9nNw" },
  { term: "The Breakdown NLW crypto", host: "NLW", color: "#E74C3C", ytChannelId: "UCMKxYhVC2lJat7iB9Gec5kw" },
  { term: "Empire Blockworks podcast", host: "Blockworks", color: "#E8453C", ytChannelId: "UCgK_jxvgUZ7iJKlZUS3YvuA" },
  { term: "Bell Curve crypto podcast", host: "Jason & Mike", color: "#3498DB", ytChannelId: "UC9aOLLMQht_1FKRxbQe60NA" },
  { term: "The Bitcoin Standard podcast", host: "Saifedean", color: "#F7931A", ytChannelId: "UCPsCJ1j0G45FnRGqJhCHLiA" },
  { term: "Into The Cryptoverse", host: "Benjamin Cowen", color: "#F39C12", ytChannelId: "UCRvqjQPSeaWn-uEx-w0XOIg" },
  { term: "The Pomp Podcast crypto", host: "Anthony Pompliano", color: "#E67E22", ytChannelId: "UCevXpeL8cNyAnww-NqJ4m2w" },
  { term: "Real Vision Crypto", host: "Real Vision", color: "#1E88E5", ytChannelId: "UCBH5VZE_Y4F3CMcPIzPEB5A" },
  { term: "Crypto Banter podcast", host: "Ran Neuner", color: "#8E44AD", ytChannelId: "UCN9Nj4tjXbVTLYWN0EKly_Q", titleFilter: /\bran\b/i },
  { term: "Coin Bureau podcast", host: "Guy Turner", color: "#FF9800", ytChannelId: "UCqK_GSMbpiV8spgD3ZGloSw" },
  { term: "Uncommon Core crypto podcast", host: "Hasu & Jon Charbonneau", color: "#26A69A", ytChannelId: "UC89nA9flQdXLzQSL49lPGNw" },
  { term: "threadguy NotThreadGuy", host: "threadguy", color: "#00D4FF", ytChannelId: "UCyLaBb4OibRL7KMdd4wZ0OQ" },
  { term: "The Daily Bone Podcast", host: "Chris Maddern", color: "#FF6B6B", ytChannelId: "UCKZh-NaE79AbeBmZhOezRsQ" },
  { term: "When Shift Happens", host: "Kevin Follonier", color: "#2ECC71", ytChannelId: "UCKc3w9FKFGdBR9PIkfngzPg" },
  { term: "The Block Runner", host: "William & Iman", color: "#F39C12", ytChannelId: "UCwfsHLKyCp98lbZEHyrGA-g" },
  { term: "SmolTalk crypto podcast", host: "SmolTalk", color: "#FF69B4", ytChannelId: "UC7sx8xvqqNrmZQ5WPB6CmFQ" },
  { term: "Bob Loukas market cycles", host: "Bob Loukas", color: "#607D8B", ytChannelId: "UC0zGwzu0zzCImC1BwPuWyXQ" },
];

// Fetch latest video ID from a YouTube channel RSS
async function getLatestVideo(
  channelId: string,
  titleFilter?: RegExp
): Promise<{ videoId: string; title: string; published: string }> {
  try {
    const xml = await fetchTextWithTimeout(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, {
      timeoutMs: 8000,
      headers: { "User-Agent": "CryptUrls/1.0" },
    });
    // Parse entries — if titleFilter is set, find first matching entry
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;
    while ((match = entryRegex.exec(xml)) !== null) {
      const entry = match[1];
      const titleMatch = entry.match(/<title>(.*?)<\/title>/);
      const title = titleMatch?.[1]?.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"') || "";
      if (titleFilter && !titleFilter.test(title)) continue;
      const vidMatch = entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/);
      const pubMatch = entry.match(/<published>(.*?)<\/published>/);
      let published = "";
      if (pubMatch?.[1]) {
        const d = new Date(pubMatch[1]);
        if (!isNaN(d.getTime())) {
          published = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        }
      }
      return { videoId: vidMatch?.[1] || "", title, published };
    }
    return { videoId: "", title: "", published: "" };
  } catch {
    return { videoId: "", title: "", published: "" };
  }
}

export async function GET() {
  try {
    const pods = await getOrSetCache("pods", 60 * 60 * 1000, async () => {
      const settled = await Promise.allSettled(
        CURATED.map(async (pod) => {
          // Fetch iTunes artwork and YouTube latest episode in parallel
          const [itunesResult, ytResult] = await Promise.all([
            (async () => {
              try {
                const json = await fetchJsonWithTimeout<{
                  results?: Array<{
                    collectionName?: string;
                    artworkUrl600?: string;
                    artworkUrl100?: string;
                  }>;
                }>(
                  `https://itunes.apple.com/search?term=${encodeURIComponent(pod.term)}&media=podcast&limit=1`,
                  {
                    timeoutMs: 6000,
                    headers: { "User-Agent": "CryptUrls/1.0" },
                  }
                );
                return json.results?.[0] || null;
              } catch {
                return null;
              }
            })(),
            getLatestVideo(pod.ytChannelId, pod.titleFilter),
          ]);

          return {
            title: itunesResult?.collectionName || pod.term.split(" ")[0],
            host: pod.host,
            color: pod.color,
            artworkUrl: itunesResult?.artworkUrl600 || itunesResult?.artworkUrl100 || "",
            latestVideoId: ytResult.videoId,
            latestEpisode: ytResult.title,
            published: ytResult.published,
          } as PodcastData;
        })
      );

      const next: PodcastData[] = [];
      for (const r of settled) {
        if (r.status === "fulfilled") next.push(r.value);
      }

      return next;
    });

    return NextResponse.json(pods);
  } catch (e) {
    console.error("Podcast fetch failed:", e instanceof Error ? e.message : e);
    setCache("pods", [], 60 * 1000);
    return NextResponse.json([]);
  }
}
