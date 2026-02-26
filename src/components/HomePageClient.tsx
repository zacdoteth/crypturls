"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Header from "@/components/Header";
import PriceTicker from "@/components/PriceTicker";
import FearGreed from "@/components/FearGreed";
import QuestionChips from "@/components/QuestionChips";
import SourceSection from "@/components/SourceSection";
import CTTrending from "@/components/CTTrending";
import AixbtSection from "@/components/AixbtSection";
import YouTubeCarousel from "@/components/YouTubeCarousel";
import ShortsCarousel from "@/components/ShortsCarousel";
import StickyPlayer from "@/components/StickyPlayer";
import RegTicker from "@/components/RegTicker";
import InverseBrah from "@/components/InverseBrah";
import BoldLeonidas from "@/components/BoldLeonidas";
import C4dotgg from "@/components/C4dotgg";
import KolAlpha from "@/components/KolAlpha";
import PodcastGrid from "@/components/PodcastGrid";
import Footer from "@/components/Footer";
import { GRID_LAYOUT } from "@/lib/sources";
import { fetchJsonClient } from "@/lib/client-http";
import { useVisibilityPolling } from "@/lib/use-visibility-polling";
import type { FeedData } from "@/lib/feeds";

interface Article {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

interface SourceData {
  name: string;
  color: string;
  domain: string;
  articles: Article[];
}

interface HomePageClientProps {
  initialFeeds: FeedData;
}

// Fallback source metadata in case feeds haven't loaded yet
const SOURCE_META: Record<string, { name: string; color: string; domain: string }> = {
  coindesk: { name: "COINDESK", color: "#0052FF", domain: "coindesk.com" },
  theblock: { name: "THE BLOCK", color: "#A8B3CF", domain: "theblock.co" },
  decrypt: { name: "DECRYPT", color: "#00D4AA", domain: "decrypt.co" },
  cointelegraph: { name: "COINTELEGRAPH", color: "#FFC107", domain: "cointelegraph.com" },
  cryptoslate: { name: "CRYPTOSLATE", color: "#8B5CF6", domain: "cryptoslate.com" },
  messari: { name: "MESSARI", color: "#4DA6FF", domain: "messari.io" },
  blockworks: { name: "BLOCKWORKS", color: "#E8453C", domain: "blockworks.co" },
  dlnews: { name: "DL NEWS", color: "#FF4081", domain: "dlnews.com" },
  bitcoinmag: { name: "BITCOIN MAGAZINE", color: "#FF6B35", domain: "bitcoinmagazine.com" },
  rcrypto: { name: "R/CRYPTOCURRENCY", color: "#FF4500", domain: "reddit.com" },
  rbitcoin: { name: "R/BITCOIN", color: "#F7931A", domain: "reddit.com" },
  rmoonshots: { name: "R/CRYPTOMOONSHOTS", color: "#9B59B6", domain: "reddit.com" },
  rethfinance: { name: "R/ETHFINANCE", color: "#627EEA", domain: "reddit.com" },
  rsolana: { name: "R/SOLANA", color: "#14F195", domain: "reddit.com" },
  biz: { name: "/BIZ/", color: "#789922", domain: "4chan.org/biz/catalog" },
};

interface ActiveVideo {
  title: string;
  videoId: string;
  isShort?: boolean;
}

export default function HomePageClient({ initialFeeds }: HomePageClientProps) {
  const [feeds, setFeeds] = useState<FeedData>(initialFeeds);
  const [activeVideo, setActiveVideo] = useState<ActiveVideo | null>(null);
  const mountedRef = useRef(true);
  const hasInitialFeeds = Object.keys(initialFeeds).length > 0;

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchFeeds = useCallback(async () => {
    try {
      const data = await fetchJsonClient<FeedData>("/api/feeds", 12000);
      if (mountedRef.current) {
        setFeeds(data);
      }
    } catch {
      console.error("Failed to fetch feeds");
    }
  }, []);
  useVisibilityPolling(fetchFeeds, 5 * 60 * 1000, !hasInitialFeeds);

  function getSource(key: string): SourceData {
    if (feeds[key]) return feeds[key];
    const meta = SOURCE_META[key] || {
      name: key.toUpperCase(),
      color: "#667088",
      domain: "",
    };
    return { ...meta, articles: [] };
  }

  return (
    <div className="ct-root">
      <Header />
      <PriceTicker />
      <FearGreed />
      <QuestionChips />

      {/* SOURCE GRID 1 */}
      <div className="ct-source-grid">
        {GRID_LAYOUT.grid1.map((key) => {
          const s = getSource(key);
          return (
            <SourceSection
              key={key}
              name={s.name}
              domain={s.domain}
              color={s.color}
              articles={s.articles}
            />
          );
        })}
      </div>

      <YouTubeCarousel
        onPlayVideo={(video) =>
          setActiveVideo({ title: video.title, videoId: video.videoId })
        }
      />

      <CTTrending />

      {/* SOURCE GRID 2 */}
      <div className="ct-source-grid">
        {GRID_LAYOUT.grid2.map((key) => {
          const s = getSource(key);
          return (
            <SourceSection
              key={key}
              name={s.name}
              domain={s.domain}
              color={s.color}
              articles={s.articles}
            />
          );
        })}
      </div>

      {/* PODCASTS */}
      <PodcastGrid onPlayVideo={setActiveVideo} />

      {/* AIXBT SURGING — full-width multi-column */}
      <AixbtSection />

      {/* CRYPTO SHORTS — separated from YouTube */}
      <ShortsCarousel
        onPlayVideo={(video) => setActiveVideo(video)}
      />

      {/* SOURCE GRID 3 */}
      <div className="ct-source-grid">
        {GRID_LAYOUT.grid3.map((key) => {
          const s = getSource(key);
          return (
            <SourceSection
              key={key}
              name={s.name}
              domain={s.domain}
              color={s.color}
              articles={s.articles}
            />
          );
        })}
      </div>

      {/* KOL ALPHA — who are top accounts following */}
      <KolAlpha />

      {/* C4DOTGG — daily curated crypto thread */}
      <C4dotgg />

      <RegTicker />

      {/* COMMUNITY GRID 1 */}
      <div className="ct-source-grid">
        {GRID_LAYOUT.community1.map((key) => {
          const s = getSource(key);
          return (
            <SourceSection
              key={key}
              name={s.name}
              domain={s.domain}
              color={s.color}
              articles={s.articles}
            />
          );
        })}
      </div>

      {/* BOLD LEONIDAS — comics/art */}
      <BoldLeonidas />

      {/* COMMUNITY GRID 2 */}
      <div className="ct-source-grid">
        {GRID_LAYOUT.community2.map((key) => {
          const s = getSource(key);
          return (
            <SourceSection
              key={key}
              name={s.name}
              domain={s.domain}
              color={s.color}
              articles={s.articles}
            />
          );
        })}
      </div>

      {/* INVERSEBRAH — CT memes, last before footer */}
      <InverseBrah />

      <Footer />

      <StickyPlayer
        video={activeVideo}
        onClose={() => setActiveVideo(null)}
      />
    </div>
  );
}
