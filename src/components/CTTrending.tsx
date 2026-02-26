"use client";

import { useState, useCallback } from "react";
import { fetchJsonClient } from "@/lib/client-http";
import { useVisibilityPolling } from "@/lib/use-visibility-polling";

interface TrendingCoin {
  sym: string;
  pct: string;
  tag: string;
  up: boolean;
}

export default function CTTrending() {
  const [trending, setTrending] = useState<TrendingCoin[]>([]);

  const fetchTrending = useCallback(async () => {
    try {
      const data = await fetchJsonClient<TrendingCoin[]>("/api/trending", 10000);
      setTrending(data);
    } catch {
      console.error("Failed to fetch trending");
    }
  }, []);
  useVisibilityPolling(fetchTrending, 5 * 60 * 1000);

  if (trending.length === 0) {
    return (
      <div className="ct-strip">
        <span className="ct-strip-label">𝕏 TRENDING</span>
        <div className="ct-strip-items">
          <span className="ct-strip-item" style={{ color: "#4A5070", fontSize: 11 }}>
            Loading trending...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="ct-strip">
      <span className="ct-strip-label">𝕏 TRENDING</span>
      <div className="ct-strip-items">
        {trending.map((t, i) => (
          <span key={i} className="ct-strip-item">
            <span className={`ct-strip-pct ${t.up ? "up" : "dn"}`}>
              {t.up ? "↑" : "↓"}
              {t.pct}
            </span>
            <span className="ct-strip-sym">{t.sym}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
