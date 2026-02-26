"use client";

import { useState, useCallback } from "react";
import { fetchJsonClient } from "@/lib/client-http";
import { useVisibilityPolling } from "@/lib/use-visibility-polling";

interface PredictionEvent {
  id: string;
  title: string;
  slug: string;
  url: string;
  topOutcome: string;
  probability: number;
  volume24hr: number;
  totalVolume: number;
  endDate: string;
}

interface PredictionsData {
  polymarket: PredictionEvent[];
  kalshi: PredictionEvent[];
}

const PM_COLOR = "#6F5CE6";
const KALSHI_COLOR = "#00D1FF";

function formatVolume(raw: number | string): string {
  const n = Number(raw) || 0;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

function LoadingCol() {
  return (
    <div className="ct-pm-col">
      <div className="ct-pm-col-header">
        <div className="ct-loading-row" style={{ width: 120, height: 14 }} />
      </div>
      <div className="ct-loading-row" />
      <div className="ct-loading-row" />
      <div className="ct-loading-row" />
    </div>
  );
}

function MarketColumn({
  events,
  sourceName,
  faviconDomain,
  color,
  siteUrl,
}: {
  events: PredictionEvent[];
  sourceName: string;
  faviconDomain: string;
  color: string;
  siteUrl: string;
}) {
  return (
    <div className="ct-pm-col">
      <div className="ct-pm-col-header">
        <div className="ct-pm-header-left">
          <img
            src={`https://www.google.com/s2/favicons?domain=${faviconDomain}&sz=32`}
            alt={sourceName}
            width="18"
            height="18"
            style={{ borderRadius: 3, flexShrink: 0 }}
          />
          <span className="ct-source-name" style={{ color }}>
            {sourceName}
          </span>
        </div>
        <a
          href={siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ct-more-link"
          style={{ color, padding: 0, margin: 0 }}
        >
          MORE ···
        </a>
      </div>
      {events.map((evt) => (
        <a
          key={evt.id}
          href={evt.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ct-pm-row"
        >
          <div className="ct-pm-question">{evt.title}</div>
          <div className="ct-pm-bottom">
            <span
              className="ct-pm-prob"
              style={{
                color: evt.probability >= 50 ? "#00FF88" : "#FF4757",
              }}
            >
              {evt.topOutcome} {evt.probability}%
            </span>
            <span className="ct-pm-vol">
              {formatVolume(evt.totalVolume)} vol
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}

export default function PredictionMarkets() {
  const [data, setData] = useState<PredictionsData | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const d = await fetchJsonClient<PredictionsData>("/api/predictions", 10000);
      setData(d);
    } catch {
      // silent
    }
  }, []);
  useVisibilityPolling(fetchData, 5 * 60 * 1000);

  const hasData = data && (data.polymarket.length > 0 || data.kalshi.length > 0);

  return (
    <div className="ct-pm-section">
      <div className="ct-pm-header">
        <div className="ct-pm-header-left">
          <span className="ct-source-name" style={{ color: PM_COLOR }}>
            PREDICTION MARKETS
          </span>
          <span className="ct-pm-badge">LIVE ODDS</span>
        </div>
      </div>

      <div className="ct-pm-grid">
        {!hasData ? (
          <>
            <LoadingCol />
            <LoadingCol />
          </>
        ) : (
          <>
            <MarketColumn
              events={data.polymarket}
              sourceName="POLYMARKET"
              faviconDomain="polymarket.com"
              color={PM_COLOR}
              siteUrl="https://polymarket.com"
            />
            <MarketColumn
              events={data.kalshi}
              sourceName="KALSHI"
              faviconDomain="kalshi.com"
              color={KALSHI_COLOR}
              siteUrl="https://kalshi.com"
            />
          </>
        )}
      </div>
    </div>
  );
}
