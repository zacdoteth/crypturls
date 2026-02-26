"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Masonry from "react-masonry-css";
import Header from "@/components/Header";
import PriceTicker from "@/components/PriceTicker";
import FearGreed from "@/components/FearGreed";
import Footer from "@/components/Footer";
import { fetchJsonClient } from "@/lib/client-http";
import { useVisibilityPolling } from "@/lib/use-visibility-polling";
import { MASONRY_EXCLUDE } from "@/lib/sources";
import type { FeedData } from "@/lib/feeds";

interface Article {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

interface MasonryCard {
  title: string;
  link: string;
  pubDate: string;
  sourceKey: string;
  sourceName: string;
  sourceColor: string;
  sourceDomain: string;
  isFeatured: boolean;
}

interface MasonryPageClientProps {
  initialFeeds: FeedData;
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return "";
  const mins = Math.floor((now - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

const BREAKPOINTS = {
  default: 5,
  1400: 4,
  1100: 3,
  800: 2,
  520: 1,
};

export default function MasonryPageClient({ initialFeeds }: MasonryPageClientProps) {
  const [feeds, setFeeds] = useState<FeedData>(initialFeeds);
  const mountedRef = useRef(true);
  const hasInitialFeeds = Object.keys(initialFeeds).length > 0;

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const fetchFeeds = useCallback(async () => {
    try {
      const data = await fetchJsonClient<FeedData>("/api/feeds", 12000);
      if (mountedRef.current) setFeeds(data);
    } catch { /* silent */ }
  }, []);
  useVisibilityPolling(fetchFeeds, 5 * 60 * 1000, !hasInitialFeeds);

  // Flatten all sources into individual cards, sorted by recency
  // Exclude low-signal sources (shitposts, spam subreddits)
  const cards: MasonryCard[] = useMemo(() => {
    const all: MasonryCard[] = [];
    for (const [key, source] of Object.entries(feeds)) {
      if (!source.articles?.length) continue;
      if (MASONRY_EXCLUDE.has(key)) continue;
      source.articles.forEach((article, i) => {
        all.push({
          title: article.title,
          link: article.link,
          pubDate: article.pubDate,
          sourceKey: key,
          sourceName: source.name,
          sourceColor: source.color,
          sourceDomain: source.domain,
          isFeatured: i === 0,
        });
      });
    }
    // Sort by publication date (newest first)
    all.sort((a, b) => {
      const ta = new Date(a.pubDate).getTime() || 0;
      const tb = new Date(b.pubDate).getTime() || 0;
      return tb - ta;
    });
    return all;
  }, [feeds]);

  return (
    <div className="ct-root ct-masonry-root">
      <Header viewMode="masonry" />
      <PriceTicker />
      <FearGreed />

      <div className="ct-masonry-wrap">
        {cards.length === 0 ? (
          <div className="ct-masonry-loading">
            <Masonry
              breakpointCols={BREAKPOINTS}
              className="ct-masonry-grid"
              columnClassName="ct-masonry-col"
            >
              {Array.from({ length: 20 }, (_, i) => (
                <div key={i} className="ct-masonry-card ct-masonry-card--skeleton">
                  <div className="ct-loading-row" style={{ width: "60%", marginBottom: 8 }} />
                  <div className="ct-loading-row" style={{ marginBottom: 6 }} />
                  <div className="ct-loading-row" style={{ width: "80%" }} />
                </div>
              ))}
            </Masonry>
          </div>
        ) : (
          <Masonry
            breakpointCols={BREAKPOINTS}
            className="ct-masonry-grid"
            columnClassName="ct-masonry-col"
          >
            {cards.map((card, i) => (
              <a
                key={`${card.sourceKey}-${i}`}
                href={card.link}
                target="_blank"
                rel="noopener noreferrer"
                className={`ct-masonry-card${card.isFeatured ? " ct-masonry-card--featured" : ""}`}
              >
                <div className="ct-masonry-card-source">
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${card.sourceDomain}&sz=32`}
                    alt=""
                    width="14"
                    height="14"
                    style={{ borderRadius: 2, flexShrink: 0 }}
                  />
                  <span
                    className="ct-masonry-card-source-name"
                    style={{ color: card.sourceColor }}
                  >
                    {card.sourceName}
                  </span>
                  {card.pubDate && (
                    <span className="ct-masonry-card-time">{timeAgo(card.pubDate)}</span>
                  )}
                </div>
                <div
                  className={`ct-masonry-card-title${card.isFeatured ? " ct-masonry-card-title--featured" : ""}`}
                >
                  {card.title}
                </div>
                <div
                  className="ct-masonry-card-accent"
                  style={{ background: card.sourceColor }}
                />
              </a>
            ))}
          </Masonry>
        )}
      </div>

      <Footer />
    </div>
  );
}
