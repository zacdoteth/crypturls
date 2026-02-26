"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
  totalVolume: number;
}

interface PredictionsData {
  polymarket: PredictionEvent[];
  kalshi: PredictionEvent[];
}

const PM_COLOR = "#6F5CE6";
const PM_RGB = "111,92,230";
const KALSHI_COLOR = "#4DE4B2";
const KALSHI_RGB = "77,228,178";

function formatVolume(raw: number | string): string {
  const n = Math.round(Number(raw) || 0);
  return "$" + n.toLocaleString("en-US");
}

/** Opacity steps per segment index — leading outcome is brightest */
const SEG_ALPHA = [0.55, 0.35, 0.22];

function SegmentRow({
  outcomes,
  rgb,
  delay,
}: {
  outcomes: PredictionOutcome[];
  rgb: string;
  delay: number;
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="ct-pm-segs" ref={ref}>
      {outcomes.map((o, i) => (
        <div className="ct-pm-seg" key={i}>
          <div
            className="ct-pm-seg-fill"
            style={{
              width: visible ? `${o.probability}%` : "0%",
              background: `rgba(${rgb},${SEG_ALPHA[i] ?? 0.18})`,
              transitionDelay: `${delay + i * 100}ms`,
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
  cardIndex,
}: {
  event: PredictionEvent;
  color: string;
  rgb: string;
  cardIndex: number;
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
        <span className="ct-pm-vol" style={{ color }}>{formatVolume(event.totalVolume)}</span>
      </div>
      <SegmentRow outcomes={event.outcomes} rgb={rgb} delay={cardIndex * 120} />
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
      {events.map((evt, i) => (
        <MarketCard key={evt.id} event={evt} color={color} rgb={rgb} cardIndex={i} />
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
