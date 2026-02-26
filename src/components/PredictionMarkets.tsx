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
  const n = Number(raw) || 0;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

function ProbBar({
  probability,
  color,
  rgb,
  delay,
}: {
  probability: number;
  color: string;
  rgb: string;
  delay: number;
}) {
  const [filled, setFilled] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setFilled(true);
          obs.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="ct-pm-bar-track" ref={ref}>
      <div
        className="ct-pm-bar-fill"
        style={{
          width: filled ? `${probability}%` : "0%",
          background: `linear-gradient(90deg, rgba(${rgb},0.15), rgba(${rgb},0.6), ${color})`,
          boxShadow: `0 0 4px rgba(${rgb},0.3), 0 0 8px rgba(${rgb},0.15)`,
          transitionDelay: `${delay}ms`,
        }}
      >
        <span
          className="ct-pm-bar-tip"
          style={{
            background: "#fff",
            boxShadow: `0 0 3px ${color}, 0 0 6px ${color}, 0 0 12px rgba(${rgb},0.5), 0 0 24px rgba(${rgb},0.2)`,
          }}
        />
      </div>
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
        <span className="ct-pm-vol">{formatVolume(event.totalVolume)}</span>
      </div>
      {event.outcomes.map((o, i) => (
        <div className="ct-pm-outcome" key={i}>
          <span className="ct-pm-label">{o.label}</span>
          <ProbBar
            probability={o.probability}
            color={color}
            rgb={rgb}
            delay={cardIndex * 150 + i * 80}
          />
          <span className="ct-pm-pct" style={{ color }}>
            {o.probability}%
          </span>
        </div>
      ))}
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
        <div className="ct-loading-row" style={{ marginBottom: 12 }} />
        <div className="ct-loading-row" style={{ width: "70%", marginBottom: 6 }} />
        <div className="ct-loading-row" style={{ width: "50%", marginBottom: 16 }} />
        <div className="ct-loading-row" style={{ marginBottom: 12 }} />
        <div className="ct-loading-row" style={{ width: "60%", marginBottom: 6 }} />
        <div className="ct-loading-row" style={{ width: "40%" }} />
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
