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
const FREE_LIMIT = 8; // show 8 rows free, blur the rest

function formatFollowers(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function AccountCell({ acct, locked }: { acct: TrendingAccount; locked: boolean }) {
  // Generate a deterministic color from the handle for the placeholder avatar
  const hue = acct.handle.split("").reduce((h, c) => h + c.charCodeAt(0), 0) % 360;

  return (
    <div className="ct-kol-account">
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
        <span className="ct-kol-follower-badge">{formatFollowers(acct.followers)}</span>
      </div>
      <span className={`ct-kol-acct-name ${locked ? "ct-kol-blur" : ""}`}>
        {locked ? "••••••••" : acct.name}
      </span>
    </div>
  );
}

function NotableCell({ notables, locked }: { notables: NotableKol[]; locked: boolean }) {
  if (locked) {
    return (
      <div className="ct-kol-notables">
        <span className="ct-kol-notable-count ct-kol-blur">?</span>
      </div>
    );
  }

  if (notables.length === 0) {
    return (
      <div className="ct-kol-notables">
        <span className="ct-kol-notable-count ct-kol-notable-zero">0</span>
      </div>
    );
  }

  return (
    <div className="ct-kol-notables">
      <span className="ct-kol-notable-count">{notables.length}</span>
      <div className="ct-kol-notable-avatars">
        {notables.slice(0, 5).map((k, i) => {
          const hue = k.handle.split("").reduce((h, c) => h + c.charCodeAt(0), 0) % 360;
          return (
            <div
              key={i}
              className="ct-kol-notable-av"
              title={k.name}
              style={{
                background: k.avatar
                  ? `url(${k.avatar}) center/cover`
                  : `hsl(${hue}, 45%, 30%)`,
                zIndex: 10 - i,
              }}
            >
              {!k.avatar && (
                <span className="ct-kol-notable-letter">
                  {k.name.charAt(0)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrendingRow({ acct, locked }: { acct: TrendingAccount; locked: boolean }) {
  const url = `https://x.com/${acct.handle}`;

  return (
    <a
      href={locked ? undefined : url}
      target="_blank"
      rel="noopener noreferrer"
      className={`ct-kol-trow ${locked ? "ct-kol-locked" : ""}`}
    >
      <AccountCell acct={acct} locked={locked} />
      <span className={`ct-kol-age ${locked ? "ct-kol-blur" : ""}`}>
        {locked ? "••" : acct.accountAge}
      </span>
      <span className={`ct-kol-new-count ${locked ? "ct-kol-blur" : ""}`}>
        {locked ? "•" : `+${acct.newKolFollows}`}
      </span>
      <NotableCell notables={acct.notableKols} locked={locked} />
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
        <div style={{ padding: "12px 14px" }}>
          <div className="ct-loading-row" />
          <div className="ct-loading-row" />
          <div className="ct-loading-row" />
          <div className="ct-loading-row" />
          <div className="ct-loading-row" />
        </div>
      </div>
    );
  }

  return (
    <div className="ct-kol-section">
      <div className="ct-kol-header">
        <div className="ct-kol-header-left">
          <span className="ct-kol-icon">&#x1f441;</span>
          <span className="ct-source-name" style={{ color: KOL_COLOR }}>
            KOL ALPHA
          </span>
          <span className="ct-kol-badge">LIVE</span>
          <span className="ct-kol-subtitle">
            Top trending accounts followed by KOLs
          </span>
        </div>
        <TimeframeDropdown value={timeframe} onChange={setTimeframe} />
      </div>

      {/* Table header */}
      <div className="ct-kol-thead">
        <span className="ct-kol-th ct-kol-th-account">Account</span>
        <span className="ct-kol-th ct-kol-th-age">Age</span>
        <span className="ct-kol-th ct-kol-th-new">New KOLs</span>
        <span className="ct-kol-th ct-kol-th-notable">Notable KOLs</span>
      </div>

      {/* Rows */}
      <div className="ct-kol-tbody">
        {accounts.map((acct, i) => (
          <TrendingRow key={acct.handle} acct={acct} locked={i >= FREE_LIMIT} />
        ))}
      </div>

      {/* Paywall overlay */}
      <div className="ct-kol-paywall">
        <div className="ct-kol-paywall-inner">
          <div className="ct-kol-paywall-title">
            See all KOL follows in real-time
          </div>
          <div className="ct-kol-paywall-sub">
            Track which accounts Cobie, Hsaka, Ansem, Arthur Hayes and 500+ top
            KOLs are following — before everyone else.
          </div>
          <button className="ct-kol-paywall-btn">
            Unlock KOL Alpha · $39/mo
          </button>
          <div className="ct-kol-paywall-alt">
            or $99/3mo · $299/year
          </div>
        </div>
      </div>
    </div>
  );
}
