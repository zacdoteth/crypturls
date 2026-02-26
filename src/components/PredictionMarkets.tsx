"use client";

import { useState, useCallback } from "react";
import { fetchJsonClient } from "@/lib/client-http";
import { useVisibilityPolling } from "@/lib/use-visibility-polling";

interface PredictionOutcome {
  label: string;
  probability: number;
}

interface PredictionEvent {
  id: string;
  title: string;
  url: string;
  outcomes: PredictionOutcome[];
  volume24h: number;
}

interface PredictionsData {
  polymarket: PredictionEvent[];
  kalshi: PredictionEvent[];
}

const PM_COLOR = "#2E5CFF";
const PM_RGB = "46,92,255";
const KALSHI_COLOR = "#4DE4B2";
const KALSHI_RGB = "77,228,178";

function formatVolume(raw: number | string): string {
  const n = Math.round(Number(raw) || 0);
  return "$" + n.toLocaleString("en-US");
}

/** Opacity steps per segment index — subtle, not eye-grabbing */
const SEG_ALPHA = [0.18, 0.12, 0.08];

function SegmentRow({
  outcomes,
  rgb,
}: {
  outcomes: PredictionOutcome[];
  rgb: string;
}) {
  return (
    <div className="ct-pm-segs">
      {outcomes.map((o, i) => (
        <div className="ct-pm-seg" key={i}>
          <div
            className="ct-pm-seg-fill"
            style={{
              width: `${o.probability}%`,
              background: `rgba(${rgb},${SEG_ALPHA[i] ?? 0.18})`,
            }}
          />
          <span className="ct-pm-seg-label">{o.label}</span>
          <span className="ct-pm-seg-pct">{o.probability}%</span>
        </div>
      ))}
    </div>
  );
}

function MarketCard({
  event,
  color,
  rgb,
}: {
  event: PredictionEvent;
  color: string;
  rgb: string;
}) {
  return (
    <a
      href={event.url}
      target="_blank"
      rel="noopener noreferrer"
      className="ct-pm-card"
    >
      <div className="ct-pm-card-top">
        <div className="ct-pm-question">{event.title}</div>
        <span className="ct-pm-vol" style={{ color }}>{formatVolume(event.volume24h)} 24h</span>
      </div>
      <SegmentRow outcomes={event.outcomes} rgb={rgb} />
    </a>
  );
}

function MarketColumn({
  events,
  sourceName,
  faviconDomain,
  color,
  rgb,
  siteUrl,
}: {
  events: PredictionEvent[];
  sourceName: string;
  faviconDomain: string;
  color: string;
  rgb: string;
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
        <MarketCard key={evt.id} event={evt} color={color} rgb={rgb} />
      ))}
    </div>
  );
}

function LoadingCol() {
  return (
    <div className="ct-pm-col">
      <div className="ct-pm-col-header">
        <div className="ct-loading-row" style={{ width: 120, height: 14 }} />
      </div>
      <div style={{ padding: "10px 14px" }}>
        <div className="ct-loading-row" style={{ marginBottom: 10 }} />
        <div className="ct-loading-row" style={{ height: 26, marginBottom: 14 }} />
        <div className="ct-loading-row" style={{ marginBottom: 10 }} />
        <div className="ct-loading-row" style={{ height: 26 }} />
      </div>
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
            rgb={PM_RGB}
            siteUrl="https://polymarket.com"
          />
          <MarketColumn
            events={data.kalshi}
            sourceName="KALSHI"
            faviconDomain="kalshi.com"
            color={KALSHI_COLOR}
            rgb={KALSHI_RGB}
            siteUrl="https://kalshi.com"
          />
        </>
      )}
    </div>
  );
}
