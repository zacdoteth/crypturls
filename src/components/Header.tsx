"use client";

import Link from "next/link";

interface HeaderProps {
  viewMode?: "grid" | "masonry";
}

export default function Header({ viewMode = "grid" }: HeaderProps) {
  return (
    <header className="ct-header">
      <div className="ct-header-left">
        <div className="ct-spider-wrap">
          <div className="ct-spider-silk" aria-hidden="true" />
          <svg
            className="ct-spider-logo"
            viewBox="0 0 64 64"
            width="36"
            height="36"
            role="img"
            aria-label="CryptUrls spider logo"
          >
            <circle
              className="ct-web-ring"
              cx="32"
              cy="32.5"
              r="30"
              fill="none"
              stroke="#00FF88"
              strokeWidth="0.8"
              opacity="0.15"
            />
            <g
              className="ct-spider-legs"
              fill="none"
              stroke="#00FF88"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M28,27 Q18,21 7,11" strokeWidth="2.6" />
              <path d="M36,27 Q46,21 57,11" strokeWidth="2.6" />
              <path d="M26.5,30 Q15,27 4,23" strokeWidth="2.4" />
              <path d="M37.5,30 Q49,27 60,23" strokeWidth="2.4" />
              <path d="M26.5,34 Q15,36.5 4,43" strokeWidth="2.2" />
              <path d="M37.5,34 Q49,36.5 60,43" strokeWidth="2.2" />
              <path d="M28,37 Q16,45 9,55" strokeWidth="2.0" />
              <path d="M36,37 Q48,44 55,54" strokeWidth="2.0" />
            </g>
            <ellipse cx="32.3" cy="37.5" rx="9.8" ry="10.8" fill="#00FF88" />
            <circle cx="32" cy="25" r="7.2" fill="#00FF88" />
            <rect x="26.5" y="24.5" width="11" height="14" rx="5.5" fill="#00FF88" />
            <circle cx="29.2" cy="24" r="1.9" fill="#080C18" />
            <circle cx="35.3" cy="24" r="1.8" fill="#080C18" />
            <circle className="ct-spider-eye" cx="29.8" cy="23.3" r="0.65" fill="#FFFFFF" />
            <circle className="ct-spider-eye" cx="35.8" cy="23.4" r="0.55" fill="#FFFFFF" />
          </svg>
        </div>
        <span className="ct-logo-text">
          crypt<span className="ct-logo-accent">urls</span>
        </span>
      </div>
      <div className="ct-header-right">
        <span className="ct-live">● LIVE</span>
        <div className="ct-view-toggle">
          <Link
            href="/"
            className={`ct-view-btn${viewMode === "grid" ? " ct-view-btn--active" : ""}`}
            title="Grid view"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <rect x="1" y="1" width="6" height="6" rx="1" />
              <rect x="9" y="1" width="6" height="6" rx="1" />
              <rect x="1" y="9" width="6" height="6" rx="1" />
              <rect x="9" y="9" width="6" height="6" rx="1" />
            </svg>
          </Link>
          <Link
            href="/masonry"
            className={`ct-view-btn${viewMode === "masonry" ? " ct-view-btn--active" : ""}`}
            title="Masonry view"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <rect x="1" y="1" width="4" height="6" rx="0.8" />
              <rect x="6" y="1" width="4" height="4" rx="0.8" />
              <rect x="11" y="1" width="4" height="7" rx="0.8" />
              <rect x="1" y="8" width="4" height="4" rx="0.8" />
              <rect x="6" y="6" width="4" height="7" rx="0.8" />
              <rect x="11" y="9" width="4" height="5" rx="0.8" />
              <rect x="1" y="13" width="4" height="2" rx="0.8" />
              <rect x="6" y="14" width="4" height="1.5" rx="0.5" />
            </svg>
          </Link>
        </div>
        <button className="ct-btn-sm">⚡</button>
        <button className="ct-btn-sm">🔍</button>
        <button className="ct-btn-sm">☰</button>
      </div>
    </header>
  );
}
