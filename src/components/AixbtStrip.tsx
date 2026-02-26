"use client";

import { useState, useCallback } from "react";
import { fetchJsonClient } from "@/lib/client-http";
import { useVisibilityPolling } from "@/lib/use-visibility-polling";

interface AixbtProject {
  name: string;
  ticker: string;
  momentum: number;
  snapshot: string;
}

export default function AixbtStrip() {
  const [projects, setProjects] = useState<AixbtProject[]>([]);

  const fetchAixbt = useCallback(async () => {
    try {
      const data = await fetchJsonClient<AixbtProject[]>("/api/aixbt", 10000);
      setProjects(data);
    } catch {
      // silent fail
    }
  }, []);
  useVisibilityPolling(fetchAixbt, 5 * 60 * 1000);

  if (projects.length === 0) return null;

  return (
    <div className="ct-strip">
      <span className="ct-strip-label" style={{ color: "#7B61FF" }}>
        <img src="/aixbt.jpg" alt="" style={{ width: 14, height: 14, borderRadius: 2, verticalAlign: "middle", marginRight: 4 }} />
        AIXBT
      </span>
      <div className="ct-strip-items">
        {projects.map((p, i) => (
          <span key={i} className="ct-strip-item">
            <span
              className="ct-strip-pct up"
              style={{ color: p.momentum > 50 ? "#00FF88" : "#FECA57" }}
            >
              {p.momentum > 0 ? `↑${p.momentum}` : p.momentum}
            </span>
            <span className="ct-strip-sym">{p.ticker}</span>
            {p.snapshot && (
              <span style={{ color: "#4A5070", fontSize: 10 }}>
                {p.snapshot.slice(0, 40)}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
