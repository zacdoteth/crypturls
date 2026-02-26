"use client";

import { useState, useEffect } from "react";
import { fetchJsonClient } from "@/lib/client-http";

export default function FearGreed() {
  const [value, setValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [animatedPct, setAnimatedPct] = useState(0);

  useEffect(() => {
    async function fetchFNG() {
      try {
        const data = await fetchJsonClient<{ value: number }>("/api/fng", 10000);
        setValue(data.value);
      } catch {
        setValue(50);
      } finally {
        setLoading(false);
      }
    }
    fetchFNG();
  }, []);

  const pct = Math.max(0, Math.min(100, value));

  useEffect(() => {
    if (loading) return;
    // Fires right after "crypturls" text finishes spelling (1.4s + 0.8s = 2.2s)
    const t = setTimeout(() => setAnimatedPct(pct), 2000);
    return () => clearTimeout(t);
  }, [pct, loading]);

  return (
    <div className="ct-fear-greed">
      <div className="ct-fg-track">
        <div className="ct-fg-bg" />
        {!loading && (
          <div
            className="ct-fg-fill"
            style={{
              width: `${animatedPct}%`,
              background: `linear-gradient(90deg, #FF4757 0%, #FF6B35 20%, #FFA502 35%, #FECA57 50%, #7BCB5C 70%, #00E676 85%, #00FF88 100%)`,
              backgroundSize: `${10000 / Math.max(pct, 1)}% 100%`,
            }}
          >
            <div className="ct-fg-tip" />
          </div>
        )}
        <span className="ct-fg-label">
          {loading ? "FEAR & GREED" : `FEAR & GREED  ${value}/100`}
        </span>
      </div>
    </div>
  );
}
