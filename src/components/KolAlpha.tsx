"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { fetchJsonClient } from "@/lib/client-http";
import { useVisibilityPolling } from "@/lib/use-visibility-polling";

const TIMEFRAMES = ["1h", "3h", "6h", "12h", "24h", "2d"] as const;
type Timeframe = (typeof TIMEFRAMES)[number];

interface NotableKol {
  name: string;
  handle: string;
  avatar: string;
}

interface TrendingAccount {
  handle: string;
  name: string;
  avatar: string;
  followers: number;
  accountAge: string;
  newKolFollows: number;
  notableKols: NotableKol[];
}

const KOL_COLOR = "#00FF88";
const FREE_LIMIT = 9; // 3 per column × 3 cols visible free

function formatFollowers(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function KolRow({ acct, locked }: { acct: TrendingAccount; locked: boolean }) {
  const hue = acct.handle.split("").reduce((h, c) => h + c.charCodeAt(0), 0) % 360;
  const url = `https://x.com/${acct.handle}`;

  return (
    <a
      href={locked ? undefined : url}
      target="_blank"
      rel="noopener noreferrer"
      className={`ct-kol-row ${locked ? "ct-kol-locked" : ""}`}
    >
      <div
        className="ct-kol-avatar"
        style={{
          background: acct.avatar
            ? `url(${acct.avatar}) center/cover`
            : `hsl(${hue}, 40%, 25%)`,
        }}
      >
        {!acct.avatar && (
          <span className="ct-kol-avatar-letter">
            {acct.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="ct-kol-info">
        <span className={`ct-kol-name ${locked ? "ct-kol-blur" : ""}`}>
          {locked ? "••••••••" : acct.name}
        </span>
        <span className={`ct-kol-meta ${locked ? "ct-kol-blur" : ""}`}>
          {locked ? "••" : `${formatFollowers(acct.followers)} · ${acct.accountAge}`}
        </span>
      </div>
      <span className={`ct-kol-count ${locked ? "ct-kol-blur" : ""}`}>
        {locked ? "•" : `+${acct.newKolFollows}`}
      </span>
    </a>
  );
}

function TimeframeDropdown({
  value,
  onChange,
}: {
  value: Timeframe;
  onChange: (tf: Timeframe) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="ct-kol-tf" ref={ref}>
      <button className="ct-kol-tf-btn" onClick={() => setOpen(!open)}>
        {value}
        <span className="ct-kol-tf-caret">{open ? "\u25B4" : "\u25BE"}</span>
      </button>
      {open && (
        <div className="ct-kol-tf-menu">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              className={`ct-kol-tf-item ${tf === value ? "ct-kol-tf-active" : ""}`}
              onClick={() => {
                onChange(tf);
                setOpen(false);
              }}
            >
              {tf}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function KolAlpha() {
  const [accounts, setAccounts] = useState<TrendingAccount[]>([]);
  const [timeframe, setTimeframe] = useState<Timeframe>("24h");

  const fetchData = useCallback(async () => {
    try {
      const data = await fetchJsonClient<TrendingAccount[]>("/api/kol-follows", 10000);
      setAccounts(data);
    } catch {
      // silent
    }
  }, []);
  useVisibilityPolling(fetchData, 5 * 60 * 1000);

  if (accounts.length === 0) {
    return (
      <div className="ct-kol-section">
        <div className="ct-kol-header">
          <div className="ct-kol-header-left">
            <span className="ct-kol-icon">&#x1f441;</span>
            <span className="ct-source-name" style={{ color: KOL_COLOR }}>
              KOL ALPHA
            </span>
            <span className="ct-kol-badge">LIVE</span>
          </div>
        </div>
        <div className="ct-kol-grid">
          <div className="ct-kol-col">
            <div className="ct-loading-row" />
            <div className="ct-loading-row" />
            <div className="ct-loading-row" />
          </div>
          <div className="ct-kol-col">
            <div className="ct-loading-row" />
            <div className="ct-loading-row" />
            <div className="ct-loading-row" />
          </div>
          <div className="ct-kol-col">
            <div className="ct-loading-row" />
            <div className="ct-loading-row" />
            <div className="ct-loading-row" />
          </div>
        </div>
      </div>
    );
  }

  // Split into 3 columns
  const colSize = Math.ceil(accounts.length / 3);
  const col1 = accounts.slice(0, colSize);
  const col2 = accounts.slice(colSize, colSize * 2);
  const col3 = accounts.slice(colSize * 2);

  return (
    <div className="ct-kol-section">
      <div className="ct-kol-header">
        <div className="ct-kol-header-left">
          <span className="ct-kol-icon">&#x1f441;</span>
          <span className="ct-source-name" style={{ color: KOL_COLOR }}>
            KOL ALPHA
          </span>
          <span className="ct-kol-badge">LIVE</span>
        </div>
        <div className="ct-kol-header-right">
          <TimeframeDropdown value={timeframe} onChange={setTimeframe} />
          <a
            href="#"
            className="ct-more-link"
            style={{ color: KOL_COLOR, padding: 0, margin: 0 }}
          >
            MORE ···
          </a>
        </div>
      </div>

      <div className="ct-kol-grid">
        {[col1, col2, col3].map((col, ci) => (
          <div key={ci} className="ct-kol-col">
            {col.map((acct, i) => {
              const globalIdx = ci * colSize + i;
              return (
                <KolRow
                  key={acct.handle}
                  acct={acct}
                  locked={globalIdx >= FREE_LIMIT}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Paywall overlay */}
      <div className="ct-kol-paywall">
        <div className="ct-kol-paywall-inner">
          <div className="ct-kol-paywall-title">
            See all KOL follows in real-time
          </div>
          <div className="ct-kol-paywall-sub">
            Track which accounts top KOLs are following — before everyone else.
          </div>
          <button className="ct-kol-paywall-btn">
            Unlock KOL Alpha · $39/mo
          </button>
        </div>
      </div>
    </div>
  );
}
