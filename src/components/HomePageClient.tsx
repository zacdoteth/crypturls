"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Header from "@/components/Header";
import PriceTicker from "@/components/PriceTicker";
import FearGreed from "@/components/FearGreed";
import SourceSection from "@/components/SourceSection";
import CTTrending from "@/components/CTTrending";
import AixbtSection from "@/components/AixbtSection";
import YouTubeCarousel from "@/components/YouTubeCarousel";
import ShortsCarousel from "@/components/ShortsCarousel";
import StickyPlayer from "@/components/StickyPlayer";
import InverseBrah from "@/components/InverseBrah";
import BoldLeonidas from "@/components/BoldLeonidas";
import C4dotgg from "@/components/C4dotgg";
import KolAlpha from "@/components/KolAlpha";
import PredictionMarkets from "@/components/PredictionMarkets";
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
  bankless: { name: "BANKLESS", color: "#E84142", domain: "bankless.com" },
  thedefiant: { name: "THE DEFIANT", color: "#A855F7", domain: "thedefiant.io" },
  unchained: { name: "UNCHAINED", color: "#1DB954", domain: "unchainedcrypto.com" },
  rektnews: { name: "REKT NEWS", color: "#FF0420", domain: "rekt.news" },
  treenews: { name: "TREE NEWS", color: "#00FF88", domain: "t.me" },
  wublock: { name: "WU BLOCKCHAIN", color: "#3B82F6", domain: "t.me" },
  unfolded: { name: "UNFOLDED", color: "#F59E0B", domain: "t.me" },
  zachxbt: { name: "ZACHXBT", color: "#EF4444", domain: "t.me" },
  watcherguru: { name: "WATCHER GURU", color: "#06B6D4", domain: "t.me" },
  defillama: { name: "DEFILLAMA", color: "#60A5FA", domain: "t.me" },
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

/** Collect every article link from a FeedData snapshot */
function collectLinks(data: FeedData): Set<string> {
  const s = new Set<string>();
  for (const src of Object.values(data)) {
    for (const a of src.articles || []) {
      if (a.link && a.link !== "#") s.add(a.link);
    }
  }
  return s;
}

export default function HomePageClient({ initialFeeds }: HomePageClientProps) {
  const [feeds, setFeeds] = useState<FeedData>(initialFeeds);
  const [activeVideo, setActiveVideo] = useState<ActiveVideo | null>(null);
  const mountedRef = useRef(true);
  const hasInitialFeeds = Object.keys(initialFeeds).length > 0;

  // Track links present on first load — anything not in here after a refresh is "new"
  const initialLinksRef = useRef<Set<string>>(collectLinks(initialFeeds));

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

  // Compute which links are new (appeared after initial load)
  const newLinks = useMemo(() => {
    const current = collectLinks(feeds);
    const fresh = new Set<string>();
    for (const link of current) {
      if (!initialLinksRef.current.has(link)) fresh.add(link);
    }
    return fresh;
  }, [feeds]);

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
              newLinks={newLinks}
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

      {/* AIXBT SURGING — full-width multi-column */}
      <AixbtSection />

      {/* PODCASTS */}
      <PodcastGrid onPlayVideo={setActiveVideo} />

      {/* PREDICTION MARKETS — Polymarket + Kalshi live odds */}
      <PredictionMarkets />

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
              newLinks={newLinks}
            />
          );
        })}
      </div>

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
              newLinks={newLinks}
            />
          );
        })}
      </div>

      {/* SOURCE GRID 4 — Alpha sources */}
      <div className="ct-source-grid">
        {GRID_LAYOUT.grid4.map((key) => {
          const s = getSource(key);
          return (
            <SourceSection
              key={key}
              name={s.name}
              domain={s.domain}
              color={s.color}
              articles={s.articles}
              newLinks={newLinks}
            />
          );
        })}
      </div>

      {/* ALPHA GRID 1 — Telegram channels */}
      <div className="ct-source-grid">
        {GRID_LAYOUT.alpha1.map((key) => {
          const s = getSource(key);
          return (
            <SourceSection
              key={key}
              name={s.name}
              domain={s.domain}
              color={s.color}
              articles={s.articles}
              newLinks={newLinks}
            />
          );
        })}
      </div>

      {/* ALPHA GRID 2 — Telegram channels */}
      <div className="ct-source-grid">
        {GRID_LAYOUT.alpha2.map((key) => {
          const s = getSource(key);
          return (
            <SourceSection
              key={key}
              name={s.name}
              domain={s.domain}
              color={s.color}
              articles={s.articles}
              newLinks={newLinks}
            />
          );
        })}
      </div>

      {/* C4DOTGG — daily curated crypto thread */}
      <C4dotgg />

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
              paginate={key === "biz"}
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
              newLinks={newLinks}
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
