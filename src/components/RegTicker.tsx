"use client";

const ONCHAIN_SEC = [
  "📋 SEC drops investigation into Uniswap Labs — no enforcement action",
  "📋 Trump's crypto czar signals stablecoin legislation within weeks",
  "📋 Tornado Cash sanctions officially lifted after Supreme Court ruling",
  "📋 EU MiCA enforcement issues first fines to non-compliant exchanges",
  "📋 FBI formally attributes Bybit hack to North Korea's Lazarus Group",
];

export default function RegTicker() {
  return (
    <div className="ct-reg-ticker">
      <div className="ct-reg-label">⚖️ SEC / CFTC</div>
      <div className="ct-reg-scroll">
        {[...ONCHAIN_SEC, ...ONCHAIN_SEC].map((item, i) => (
          <span key={i} className="ct-reg-item">
            {item}{" "}
            <span style={{ color: "#333", margin: "0 10px" }}>+++</span>
          </span>
        ))}
      </div>
    </div>
  );
}
