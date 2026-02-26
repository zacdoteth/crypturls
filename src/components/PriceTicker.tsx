"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchJsonClient } from "@/lib/client-http";
import { useVisibilityPolling } from "@/lib/use-visibility-polling";

interface Price {
  sym: string;
  price: string;
  change: string;
  up: boolean;
}

export default function PriceTicker() {
  const [prices, setPrices] = useState<Price[]>([]);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(8);

  useEffect(() => {
    const updatePerPage = () => {
      setPerPage(window.innerWidth < 640 ? 4 : 8);
    };
    updatePerPage();
    window.addEventListener("resize", updatePerPage);
    return () => window.removeEventListener("resize", updatePerPage);
  }, []);

  const fetchPrices = useCallback(async () => {
    try {
      const data = await fetchJsonClient<Price[]>("/api/prices", 10000);
      setPrices(data);
    } catch {
      console.error("Failed to fetch prices");
    }
  }, []);
  useVisibilityPolling(fetchPrices, 2 * 60 * 1000);

  const totalPages = Math.max(1, Math.ceil(prices.length / perPage));
  const boundedPage = Math.min(page, totalPages - 1);
  const visible = prices.slice(
    boundedPage * perPage,
    boundedPage * perPage + perPage
  );

  if (prices.length === 0) {
    return (
      <div className="ct-ticker-bar" style={{ padding: "8px 16px", justifyContent: "center" }}>
        <span style={{ color: "#4A5070", fontSize: 11, fontFamily: "var(--font-jetbrains), monospace" }}>
          Loading prices...
        </span>
      </div>
    );
  }

  return (
    <div className="ct-ticker-bar">
      <button
        className="ct-ticker-arrow"
        onClick={() => setPage((p) => (p - 1 + totalPages) % totalPages)}
      >
        «
      </button>
      <div className="ct-ticker-items">
        {visible.map((p, i) => (
          <span key={`${boundedPage}-${i}`} className="ct-ticker-item">
            <span className="ct-ticker-sym">{p.sym}</span>
            <span className="ct-ticker-price">${p.price}</span>
            <span className={`ct-ticker-change ${p.up ? "up" : "down"}`}>
              {p.up ? "↑" : "↓"} {p.change}
            </span>
          </span>
        ))}
      </div>
      <button
        className="ct-ticker-arrow"
        onClick={() => setPage((p) => (p + 1) % totalPages)}
      >
        »
      </button>
    </div>
  );
}
