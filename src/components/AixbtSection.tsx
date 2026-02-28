"use client";

import { useState, useCallback, useEffect } from "react";
import { fetchJsonClient } from "@/lib/client-http";
import { useVisibilityPolling } from "@/lib/use-visibility-polling";

interface AixbtProject {
  name: string;
  ticker: string;
  momentum: number;
  snapshot: string;
  priceChange?: number;
}

const AIXBT_PURPLE = "#7B61FF";

function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins === 1) return "1 min ago";
  return `${mins} min ago`;
}

function ProjectRow({ p }: { p: AixbtProject }) {
  const searchUrl = `https://x.com/search?q=from%3Aaixbt_agent%20${encodeURIComponent(
    p.ticker ? `$${p.ticker}` : p.name
  )}&src=typed_query&f=top`;

  const hasSnap = Boolean(p.snapshot);

  return (
    <a
      href={searchUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="ct-aixbt-row"
      style={{ textDecoration: "none", display: "block" }}
    >
      {/* Meta line: project name + ticker + score */}
      <div className="ct-aixbt-row-top">
        <span className={hasSnap ? "ct-aixbt-label" : "ct-aixbt-name"}>{p.name}</span>
        {p.ticker && (
          <span className="ct-aixbt-ticker">${p.ticker}</span>
        )}
        {p.priceChange != null && (
          <span className={`ct-aixbt-pct ${p.priceChange >= 0 ? "up" : "dn"}`}>
            {p.priceChange >= 0 ? "↑" : "↓"}
            {p.priceChange >= 0 ? "+" : ""}
            {p.priceChange.toFixed(1)}%
          </span>
        )}
        <span
          className="ct-aixbt-score"
          style={{
            color: p.momentum > 60 ? "#00FF88" : "#FECA57",
            background: p.momentum > 60 ? "rgba(0,255,136,0.1)" : "rgba(254,202,87,0.1)",
          }}
        >
          {p.momentum}
        </span>
      </div>
      {/* Snapshot as the headline when available */}
      {hasSnap && (
        <div className="ct-aixbt-headline">{p.snapshot}</div>
      )}
    </a>
  );
}

export default function AixbtSection() {
  const [projects, setProjects] = useState<AixbtProject[]>([]);
  const [lastFetch, setLastFetch] = useState(0);

  const fetchAixbt = useCallback(async () => {
    try {
      const data = await fetchJsonClient<AixbtProject[]>("/api/aixbt", 10000);
      setProjects(data);
      setLastFetch(Date.now());
    } catch {
      // silent fail
    }
  }, []);
  useVisibilityPolling(fetchAixbt, 5 * 60 * 1000);

  // Update the "X min ago" display every 30s
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  if (projects.length === 0) {
    return (
      <div className="ct-aixbt-section">
        <div className="ct-aixbt-header">
          <div className="ct-aixbt-header-left">
            <img src="/aixbt.jpg" alt="AIXBT" className="ct-aixbt-icon" />
            <a
              href="https://aixbt.tech/projects"
              target="_blank"
              rel="noopener noreferrer"
              className="ct-source-name ct-source-link"
              style={{ color: AIXBT_PURPLE }}
            >
              AIXBT
            </a>
            <span className="ct-aixbt-badge">SURGING</span>
          </div>
        </div>
        <div className="ct-aixbt-grid">
          <div className="ct-aixbt-col">
            <div className="ct-loading-row" />
            <div className="ct-loading-row" />
            <div className="ct-loading-row" />
          </div>
          <div className="ct-aixbt-col">
            <div className="ct-loading-row" />
            <div className="ct-loading-row" />
            <div className="ct-loading-row" />
          </div>
          <div className="ct-aixbt-col">
            <div className="ct-loading-row" />
            <div className="ct-loading-row" />
            <div className="ct-loading-row" />
          </div>
        </div>
      </div>
    );
  }

  // Split projects into 3 columns
  const colSize = Math.ceil(projects.length / 3);
  const col1 = projects.slice(0, colSize);
  const col2 = projects.slice(colSize, colSize * 2);
  const col3 = projects.slice(colSize * 2);

  return (
    <div className="ct-aixbt-section">
      <div className="ct-aixbt-header">
        <div className="ct-aixbt-header-left">
          <img src="/aixbt.jpg" alt="AIXBT" className="ct-aixbt-icon" />
          <a
            href="https://aixbt.tech/projects"
            target="_blank"
            rel="noopener noreferrer"
            className="ct-source-name ct-source-link"
            style={{ color: AIXBT_PURPLE }}
          >
            AIXBT
          </a>
          <span className="ct-aixbt-badge">SURGING</span>
          {lastFetch > 0 && (
            <span className="ct-aixbt-updated">
              updated {timeAgo(lastFetch)}
            </span>
          )}
        </div>
        <a
          href="https://aixbt.tech/projects"
          target="_blank"
          rel="noopener noreferrer"
          className="ct-more-link"
          style={{ color: AIXBT_PURPLE, padding: 0, margin: 0 }}
        >
          MORE ···
        </a>
      </div>
      <div className="ct-aixbt-grid">
        <div className="ct-aixbt-col">
          {col1.map((p, i) => (
            <ProjectRow key={i} p={p} />
          ))}
        </div>
        <div className="ct-aixbt-col">
          {col2.map((p, i) => (
            <ProjectRow key={i} p={p} />
          ))}
        </div>
        <div className="ct-aixbt-col">
          {col3.map((p, i) => (
            <ProjectRow key={i} p={p} />
          ))}
        </div>
      </div>
    </div>
  );
}
