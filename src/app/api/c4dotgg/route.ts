import { NextResponse } from "next/server";
import { getOrSetCache } from "@/lib/cache";
import { fetchTextWithTimeout } from "@/lib/http";

export const dynamic = "force-dynamic";

export interface C4Item {
  text: string;
  url?: string;
  handle?: string; // @username if present
  tags?: string[]; // [Live], [Base], etc.
}

export interface C4Section {
  category: string;
  emoji?: string;
  items: C4Item[];
}

export interface C4Feed {
  date: string;
  postUrl: string;
  sections: C4Section[];
}

/** Decode HTML entities like &#39; &#036; &amp; etc. */
function decodeHtml(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) =>
      String.fromCharCode(parseInt(h, 16))
    )
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/**
 * Parse a Telegram message HTML block into sections.
 * The HTML has <br/> for newlines, <a href="...">text</a> for links,
 * <b> for bold, <u> for underline, <i> for italic/emoji.
 */
function parseTelegramMessage(
  msgHtml: string,
  postUrl: string
): C4Feed | null {
  // Extract date from the first bold tag
  const dateMatch = msgHtml.match(/<b>([A-Z][a-z]+ \d{1,2})<\/b>/);
  const date = dateMatch?.[1] || "";

  // Convert <br/> to newlines, strip emoji images
  let text = msgHtml
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<i class="emoji"[^>]*><b>[^<]*<\/b><\/i>/g, (m) => {
      // Extract the emoji text
      const emojiMatch = m.match(/<b>([^<]+)<\/b>/);
      return emojiMatch?.[1] || "";
    });

  // Build a map of link text -> href by extracting <a> tags before stripping
  const linkMap = new Map<string, string>();
  const linkRegex = /<a\s+href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
  let lm;
  while ((lm = linkRegex.exec(text)) !== null) {
    const href = lm[1];
    const linkText = decodeHtml(lm[2].trim());
    if (linkText.length > 3) {
      linkMap.set(linkText, href);
    }
  }

  // Strip remaining HTML tags
  text = text.replace(/<[^>]+>/g, "");
  text = decodeHtml(text);

  const lines = text.split("\n").map((l) => l.trim());
  const sections: C4Section[] = [];
  let currentSection: C4Section | null = null;

  for (const line of lines) {
    if (!line) continue;

    // Skip intro/filler lines
    if (/^(february|march|april|may|june|july|august|september|october|november|december|january)\s+\d/i.test(line)) continue;
    if (/follow my|here'?s what'?s happening|don'?t forget/i.test(line)) continue;
    if (/^my links:/i.test(line)) break; // Stop at "My Links" affiliate section
    if (line === "Website") continue; // Skip bare "Website" lines

    // Detect section headers: emoji + bold text like "📰News" or "[Project Updates]"
    const emojiHeaderMatch = line.match(
      /^(📰|🚀|💎|📋|🔗|📊|⚡|🧵|💰|🏗️|🔥)\s*(News|Launches?|New Projects?|Project Updates?|Threads?\/?Reads?|Updates?|Airdrops?|Funding|Tools?)\s*$/i
    );
    if (emojiHeaderMatch) {
      currentSection = {
        category: emojiHeaderMatch[2],
        emoji: emojiHeaderMatch[1],
        items: [],
      };
      sections.push(currentSection);
      continue;
    }

    // Bracket-style headers: [Project Updates], [Threads/Reads]
    const bracketMatch = line.match(/^\[([^\]]+)\]$/);
    if (bracketMatch) {
      currentSection = {
        category: bracketMatch[1],
        items: [],
      };
      sections.push(currentSection);
      continue;
    }

    // Skip if no section yet
    if (!currentSection) continue;

    // Parse item lines (usually start with "- ")
    const itemText = line.replace(/^-\s*/, "").trim();
    if (itemText.length < 3) continue;

    // Extract @handle from text
    const handleMatch = itemText.match(/@(\w+)/);

    // Extract tags like [Live], [Base] from the text
    const bracketTags =
      itemText.match(/\[([^\]]+)\]/g)?.map((t) => t.replace(/[\[\]]/g, "")) ||
      [];

    // Clean text: remove bracket tags
    let cleanText = itemText.replace(/\[[^\]]+\]/g, "").trim();

    // Parse pipe-separated parts (e.g. "zERC20 | Privacy" or "Nookplot | Base | Agent Coordination")
    const pipeParts = cleanText.split(/\s*\|\s*/).filter(Boolean);
    let pipeTags: string[] = [];
    if (pipeParts.length > 1) {
      cleanText = pipeParts[0];
      pipeTags = pipeParts.slice(1);
    }

    const allTags = [...bracketTags, ...pipeTags];
    cleanText = cleanText.replace(/\|\s*/g, "").trim();

    // Try to find the URL for this item from the link map
    let url: string | undefined;
    // Try exact match first, then partial
    for (const [linkText, href] of linkMap) {
      if (cleanText.includes(linkText) || linkText.includes(cleanText.slice(0, 30))) {
        url = href;
        break;
      }
    }
    // For items with @handle, try X profile link
    if (!url && handleMatch) {
      const handleUrl = linkMap.get(`@${handleMatch[1]}`);
      if (handleUrl) url = handleUrl;
    }

    currentSection.items.push({
      text: cleanText,
      url,
      handle: handleMatch?.[1],
      tags: allTags.length > 0 ? allTags : undefined,
    });
  }

  const validSections = sections.filter((s) => s.items.length > 0);
  if (validSections.length === 0) return null;

  return { date, postUrl, sections: validSections };
}

async function fetchC4Feed(): Promise<C4Feed | null> {
  const html = await fetchTextWithTimeout("https://t.me/s/c4dotgg", {
    timeoutMs: 8000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      Accept: "text/html",
    },
  });

  // Extract all message text blocks — Telegram uses tgme_widget_message_text
  const msgRegex =
    /class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
  const messages: { html: string; postUrl: string }[] = [];

  // Also extract post URLs from the same message containers
  const postUrlRegex =
    /data-post="([^"]+)"[\s\S]*?class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
  let pm;
  while ((pm = postUrlRegex.exec(html)) !== null) {
    messages.push({
      html: pm[2],
      postUrl: `https://t.me/${pm[1]}`,
    });
  }

  // If the combined regex didn't work, fall back to separate extraction
  if (messages.length === 0) {
    let mm;
    while ((mm = msgRegex.exec(html)) !== null) {
      messages.push({
        html: mm[1],
        postUrl: "https://t.me/c4dotgg",
      });
    }
  }

  // Process messages from most recent (last) to oldest
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    // Quick check: must have section markers
    if (
      !msg.html.includes("News") &&
      !msg.html.includes("Project") &&
      !msg.html.includes("Launches")
    ) {
      continue;
    }
    const feed = parseTelegramMessage(msg.html, msg.postUrl);
    if (feed && feed.sections.length >= 2) {
      return feed;
    }
  }

  return null;
}

export async function GET() {
  try {
    const feed = await getOrSetCache("c4dotgg", 30 * 60 * 1000, async () => {
      return await fetchC4Feed();
    });

    return NextResponse.json(
      feed || { date: "", postUrl: "", sections: [] }
    );
  } catch (e) {
    console.error(
      "c4dotgg fetch failed:",
      e instanceof Error ? e.message : e
    );
    return NextResponse.json({ date: "", postUrl: "", sections: [] });
  }
}
