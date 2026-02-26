"use client";

import { useState, useCallback } from "react";
import { fetchJsonClient } from "@/lib/client-http";
import { useVisibilityPolling } from "@/lib/use-visibility-polling";

interface PredictionEvent {
  id: string;
  title: string;
  slug: string;
  topOutcome: string;
  probability: number;
  volume24hr: number;
  endDate: string;
}

const PM_COLOR = "#6F5CE6";

function formatVolume(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export default function PredictionMarkets() {
  const [events, setEvents] = useState<PredictionEvent[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const data = await fetchJsonClient<PredictionEvent[]>("/api/predictions", 10000);
      setEvents(data);
    } catch {
      // silent
    }
  }, []);
  useVisibilityPolling(fetchData, 5 * 60 * 1000);

  if (events.length === 0) {
    return (
      <div className="ct-pm-section">
        <div className="ct-pm-header">
          <div className="ct-pm-header-left">
            <img
              src="https://www.google.com/s2/favicons?domain=polymarket.com&sz=32"
              alt="Polymarket"
              width="18"
              height="18"
              style={{ borderRadius: 3, flexShrink: 0 }}
            />
            <span className="ct-source-name" style={{ color: PM_COLOR }}>
              PREDICTION MARKETS
            </span>
            <span className="ct-pm-badge">LIVE ODDS</span>
          </div>
        </div>
        <div className="ct-pm-grid">
          <div className="ct-pm-col">
            <div className="ct-loading-row" />
            <div className="ct-loading-row" />
            <div className="ct-loading-row" />
          </div>
          <div className="ct-pm-col">
            <div className="ct-loading-row" />
            <div className="ct-loading-row" />
            <div className="ct-loading-row" />
          </div>
          <div className="ct-pm-col">
            <div className="ct-loading-row" />
            <div className="ct-loading-row" />
            <div className="ct-loading-row" />
          </div>
        </div>
      </div>
    );
  }

  // Split into 3 columns
  const colSize = Math.ceil(events.length / 3);
  const col1 = events.slice(0, colSize);
  const col2 = events.slice(colSize, colSize * 2);
  const col3 = events.slice(colSize * 2);

  return (
    <div className="ct-pm-section">
      <div className="ct-pm-header">
        <div className="ct-pm-header-left">
          <img
            src="https://www.google.com/s2/favicons?domain=polymarket.com&sz=32"
            alt="Polymarket"
            width="18"
            height="18"
            style={{ borderRadius: 3, flexShrink: 0 }}
          />
          <span className="ct-source-name" style={{ color: PM_COLOR }}>
            PREDICTION MARKETS
          </span>
          <span className="ct-pm-badge">LIVE ODDS</span>
        </div>
        <a
          href="https://polymarket.com"
          target="_blank"
          rel="noopener noreferrer"
          className="ct-more-link"
          style={{ color: PM_COLOR, padding: 0, margin: 0 }}
        >
          MORE ···
        </a>
      </div>

      <div className="ct-pm-grid">
        {[col1, col2, col3].map((col, ci) => (
          <div key={ci} className="ct-pm-col">
            {col.map((evt) => (
              <a
                key={evt.id}
                href={`https://polymarket.com/event/${evt.slug}`}
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
                    {formatVolume(evt.volume24hr)} 24h
                  </span>
                </div>
              </a>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
