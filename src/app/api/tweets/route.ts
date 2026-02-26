import { NextResponse } from "next/server";
import { getCached, setCache } from "@/lib/cache";
import { fetchTextWithTimeout } from "@/lib/http";

export const dynamic = "force-dynamic";

export interface TweetImage {
  imageUrl: string;
  tweetUrl: string;
}

const ALLOWED_USERS = new Set(["inversebrah", "boldleonidas"]);

function parseNextDataImages(html: string, username: string): TweetImage[] {
  const nextDataMatch = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/i
  );
  if (!nextDataMatch?.[1]) return [];

  try {
    const nextData = JSON.parse(nextDataMatch[1]);
    const entries = nextData?.props?.pageProps?.timeline?.entries;
    if (!Array.isArray(entries)) return [];

    const images: TweetImage[] = [];
    const seen = new Set<string>();

    for (const entry of entries) {
      const tweet = entry?.content?.tweet;
      if (!tweet) continue;

      const permalink =
        typeof tweet.permalink === "string" && tweet.permalink.startsWith("/")
          ? `https://x.com${tweet.permalink}`
          : `https://x.com/${username}`;

      const mediaCandidates = [
        ...(tweet?.extended_entities?.media || []),
        ...(tweet?.entities?.media || []),
        ...(tweet?.quoted_status?.extended_entities?.media || []),
        ...(tweet?.quoted_status?.entities?.media || []),
      ];

      for (const media of mediaCandidates) {
        const url = media?.media_url_https;
        if (
          typeof url === "string" &&
          /^https:\/\/pbs\.twimg\.com\/media\//.test(url) &&
          !seen.has(url)
        ) {
          seen.add(url);
          images.push({
            imageUrl: url,
            tweetUrl: permalink,
          });
        }
      }

      if (images.length >= 20) {
        break;
      }
    }

    return images.slice(0, 20);
  } catch {
    return [];
  }
}

async function fetchUserImages(username: string): Promise<TweetImage[]> {
  const html = await fetchTextWithTimeout(
    `https://syndication.twitter.com/srv/timeline-profile/screen-name/${username}`,
    {
      timeoutMs: 8000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
    }
  );

  const nextDataParsed = parseNextDataImages(html, username);
  if (nextDataParsed.length > 0) {
    return nextDataParsed;
  }

  // Extract all media image URLs (deduplicated)
  const imgMatches = html.match(
    /https:\/\/pbs\.twimg\.com\/media\/[^"'\s<>]+/g
  );
  const uniqueImages = [...new Set(imgMatches || [])];

  // Extract tweet status IDs in order they appear
  const idRegex = new RegExp(`\\\\?/${username}\\\\?/status\\\\?/(\\d+)`, "gi");
  const tweetIds: string[] = [];
  let m;
  while ((m = idRegex.exec(html)) !== null) {
    if (!tweetIds.includes(m[1])) tweetIds.push(m[1]);
  }

  // Now pair images with tweet links
  // The HTML has images inside tweet blocks — parse tweet-by-tweet
  // Each tweet article contains its images and its status link
  const results: TweetImage[] = [];
  const seen = new Set<string>();

  // Split HTML by tweet boundaries to pair images with their tweet IDs
  const tweetBlockRegex =
    /data-tweet-id="(\d+)"[\s\S]*?(?=data-tweet-id="|$)/g;
  let block;
  while ((block = tweetBlockRegex.exec(html)) !== null) {
    const tweetId = block[1];
    const blockHtml = block[0];
    const blockImgs = blockHtml.match(
      /https:\/\/pbs\.twimg\.com\/media\/[^"'\s<>]+/g
    );
    if (blockImgs) {
      for (const img of blockImgs) {
        if (!seen.has(img)) {
          seen.add(img);
          results.push({
            imageUrl: img,
            tweetUrl: `https://x.com/${username}/status/${tweetId}`,
          });
        }
      }
    }
  }

  // Fallback: if block parsing didn't work, just pair images with IDs sequentially
  if (results.length === 0) {
    for (let i = 0; i < uniqueImages.length; i++) {
      results.push({
        imageUrl: uniqueImages[i],
        tweetUrl: tweetIds[i]
          ? `https://x.com/${username}/status/${tweetIds[i]}`
          : `https://x.com/${username}`,
      });
    }
  }

  // Sort by tweet ID descending (newest first) — Twitter snowflake IDs encode time
  results.sort((a, b) => {
    const idA = a.tweetUrl.match(/\/status\/(\d+)/)?.[1] || "0";
    const idB = b.tweetUrl.match(/\/status\/(\d+)/)?.[1] || "0";
    return idB.localeCompare(idA);
  });

  return results.slice(0, 20);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const user = searchParams.get("user")?.toLowerCase() || null;

  if (!user || !/^[a-zA-Z0-9_]{1,15}$/.test(user)) {
    return NextResponse.json({ error: "Invalid user param" }, { status: 400 });
  }
  if (!ALLOWED_USERS.has(user)) {
    return NextResponse.json({ error: "Unsupported user" }, { status: 400 });
  }

  const cacheKey = `tweet-imgs-${user}`;
  const cached = getCached<TweetImage[]>(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const images = await fetchUserImages(user);
    if (images.length > 0) {
      // Cache for 30 min — syndication API rate-limits aggressively
      setCache(cacheKey, images, 30 * 60 * 1000);
    } else {
      // Cache empty results briefly so we recover quickly from parser/API shifts.
      setCache(cacheKey, images, 30 * 1000);
    }
    return NextResponse.json(images);
  } catch (e) {
    console.error(
      `Tweet images failed [${user}]:`,
      e instanceof Error ? e.message : e
    );
    // Cache the failure briefly to avoid hammering while recovering quickly.
    setCache(cacheKey, [], 30 * 1000);
    return NextResponse.json([]);
  }
}
