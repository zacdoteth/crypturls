"use client";

export default function Header() {
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
            {/* Web ring — draws itself after spider lands */}
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

            {/* 8 Legs — bezier curves, varied stroke weight, subtle asymmetry
                Front pair: 2.6px (closest/most prominent)
                Upper-mid:  2.4px
                Lower-mid:  2.2px
                Rear pair:  2.0px (furthest, thinnest)
                Left rear knee offset 1px for intentional asymmetry */}
            <g
              className="ct-spider-legs"
              fill="none"
              stroke="#00FF88"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Front pair — thick, aggressive reach */}
              <path d="M28,27 Q18,21 7,11" strokeWidth="2.6" />
              <path d="M36,27 Q46,21 57,11" strokeWidth="2.6" />

              {/* Upper-mid — wide horizontal spread */}
              <path d="M26.5,30 Q15,27 4,23" strokeWidth="2.4" />
              <path d="M37.5,30 Q49,27 60,23" strokeWidth="2.4" />

              {/* Lower-mid — gentle downward arc */}
              <path d="M26.5,34 Q15,36.5 4,43" strokeWidth="2.2" />
              <path d="M37.5,34 Q49,36.5 60,43" strokeWidth="2.2" />

              {/* Rear pair — thinnest, left knee 1px off for asymmetry */}
              <path d="M28,37 Q16,45 9,55" strokeWidth="2.0" />
              <path d="M36,37 Q48,44 55,54" strokeWidth="2.0" />
            </g>

            {/* Abdomen — shifted 0.3px right of center for organic feel */}
            <ellipse cx="32.3" cy="37.5" rx="9.8" ry="10.8" fill="#00FF88" />
            {/* Head — slightly overlapping abdomen */}
            <circle cx="32" cy="25" r="7.2" fill="#00FF88" />
            {/* Neck bridge — connects head to abdomen smoothly */}
            <rect x="26.5" y="24.5" width="11" height="14" rx="5.5" fill="#00FF88" />

            {/* Eyes — cut into head, slightly forward-looking (shifted right) */}
            <circle cx="29.2" cy="24" r="1.9" fill="#080C18" />
            <circle cx="35.3" cy="24" r="1.8" fill="#080C18" />

            {/* Eye highlights — different sizes for life, offset upper-right */}
            <circle
              className="ct-spider-eye"
              cx="29.8"
              cy="23.3"
              r="0.65"
              fill="#FFFFFF"
            />
            <circle
              className="ct-spider-eye"
              cx="35.8"
              cy="23.4"
              r="0.55"
              fill="#FFFFFF"
            />
          </svg>
        </div>
        <span className="ct-logo-text">
          crypt<span className="ct-logo-accent">urls</span>
        </span>
      </div>
      <div className="ct-header-right">
        <span className="ct-live">● LIVE</span>
        <button className="ct-btn-sm">⚡</button>
        <button className="ct-btn-sm">🔍</button>
        <button className="ct-btn-sm">☰</button>
      </div>
    </header>
  );
}
