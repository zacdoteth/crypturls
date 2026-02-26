"use client";

import { useState, useCallback } from "react";
import { fetchJsonClient } from "@/lib/client-http";
import { useVisibilityPolling } from "@/lib/use-visibility-polling";

interface C4Item {
  text: string;
  url?: string;
  handle?: string;
  tags?: string[];
}

interface C4Section {
  category: string;
  emoji?: string;
  items: C4Item[];
}

interface C4Feed {
  date: string;
  postUrl: string;
  sections: C4Section[];
}

const C4_COLOR = "#00D4FF";

/** Build a readable headline from the raw C4 item */
function toHeadline(item: C4Item): string {
  // If there's descriptive text beyond just the handle, use it
  const text = item.text?.trim() || "";
  const handle = item.handle?.trim() || "";

  if (text && text !== handle) {
    return text;
  }
  // Bare handle with no description — just show the name
  if (handle) return handle;
  return text || "—";
}

function ArticleRow({ item }: { item: C4Item }) {
  const href = item.url || (item.handle ? `https://x.com/${item.handle}` : undefined);
  const headline = toHeadline(item);

  const inner = (
    <div className="ct-article-row">
      <span className="ct-article-title">{headline}</span>
    </div>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "inherit" }}>
        {inner}
      </a>
    );
  }
  return inner;
}

function C4Column({
  label,
  items,
}: {
  label: string;
  items: C4Item[];
}) {
  if (items.length === 0) return null;

  // Featured first item + rest as article rows (matches SourceSection pattern)
  const featured = items[0];
  const rest = items.slice(1, 5);
  const featuredHref = featured.url || (featured.handle ? `https://x.com/${featured.handle}` : undefined);

  return (
    <div className="ct-source-section">
      <div className="ct-source-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img
            src="https://www.google.com/s2/favicons?domain=t.me&sz=32"
            alt=""
            style={{ width: 14, height: 14, borderRadius: 2, opacity: 0.8 }}
          />
          <span className="ct-source-name" style={{ color: C4_COLOR }}>{label}</span>
        </div>
      </div>

      {featuredHref ? (
        <a href={featuredHref} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
          <div className="ct-featured-title">{toHeadline(featured)}</div>
        </a>
      ) : (
        <div className="ct-featured-title">{toHeadline(featured)}</div>
      )}

      {rest.map((item, i) => (
        <ArticleRow key={i} item={item} />
      ))}
    </div>
  );
}

export default function C4dotgg() {
  const [feed, setFeed] = useState<C4Feed | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFeed = useCallback(async () => {
    try {
      const data = await fetchJsonClient<C4Feed>("/api/c4dotgg", 10000);
      if (data.sections && data.sections.length > 0) {
        setFeed(data);
      }
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);
  useVisibilityPolling(fetchFeed, 10 * 60 * 1000);

  if (!feed && !loading) return null;

  if (!feed) {
    return (
      <div className="ct-source-grid ct-source-grid-2">
        <div className="ct-source-section">
          <div className="ct-loading-row" />
          <div className="ct-loading-row" />
          <div className="ct-loading-row" />
        </div>
        <div className="ct-source-section">
          <div className="ct-loading-row" />
          <div className="ct-loading-row" />
          <div className="ct-loading-row" />
        </div>
      </div>
    );
  }

  // Bucket items into two columns:
  // Col 1: New Projects + Launches
  // Col 2: News + Project Updates + Threads/Reads
  const col1Items: C4Item[] = [];
  const col2Items: C4Item[] = [];

  for (const s of feed.sections) {
    const cat = s.category.toLowerCase();
    if (cat.includes("new project") || cat.includes("launch")) {
      col1Items.push(...s.items);
    } else {
      col2Items.push(...s.items);
    }
  }

  return (
    <div className="ct-source-grid ct-source-grid-2">
      <C4Column label="C4 PROJECTS" items={col1Items} />
      <C4Column label="C4 NEWS" items={col2Items} />
    </div>
  );
}
