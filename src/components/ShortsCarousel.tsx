"use client";

import { useState, useEffect } from "react";

interface ShortVideo {
  title: string;
  channel: string;
  videoId: string;
  thumbnail: string;
  color: string;
  published?: string;
}

interface ShortsCarouselProps {
  onPlayVideo: (video: { title: string; videoId: string; isShort?: boolean }) => void;
}

export default function ShortsCarousel({ onPlayVideo }: ShortsCarouselProps) {
  const [shorts, setShorts] = useState<ShortVideo[]>([]);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(8);

  useEffect(() => {
    const updatePerPage = () => {
      const w = window.innerWidth;
      setPerPage(w < 640 ? 3 : w < 900 ? 5 : 8);
    };
    updatePerPage();
    window.addEventListener("resize", updatePerPage);
    return () => window.removeEventListener("resize", updatePerPage);
  }, []);

  useEffect(() => {
    async function fetchShorts() {
      try {
        const res = await fetch("/api/youtube-shorts");
        const data = await res.json();
        setShorts(data);
      } catch {
        // silent
      }
    }
    fetchShorts();
  }, []);

  const totalPages = Math.max(1, Math.ceil(shorts.length / perPage));
  const visible = shorts.slice(page * perPage, page * perPage + perPage);

  if (shorts.length === 0) return null;

  return (
    <div className="ct-shorts-section">
      <div className="ct-yt-header">
        <div className="ct-section-label">
          <img
            src="https://www.google.com/s2/favicons?domain=youtube.com&sz=32"
            alt=""
            style={{ width: 14, height: 14, borderRadius: 2, verticalAlign: "middle", marginRight: 6, opacity: 0.8 }}
          />
          CRYPTO SHORTS
        </div>
        {totalPages > 1 && (
          <div className="ct-yt-nav">
            <button
              className="ct-yt-arrow"
              onClick={() => setPage((p) => (p - 1 + totalPages) % totalPages)}
            >
              ←
            </button>
            <span className="ct-yt-counter">
              {page + 1}/{totalPages}
            </span>
            <button
              className="ct-yt-arrow"
              onClick={() => setPage((p) => (p + 1) % totalPages)}
            >
              →
            </button>
          </div>
        )}
      </div>
      <div className="ct-shorts-grid">
        {visible.map((v, i) => (
          <div
            key={`${page}-${i}`}
            className="ct-shorts-card"
            style={{ animationDelay: `${i * 0.03}s` }}
            onClick={() => onPlayVideo({ title: v.title, videoId: v.videoId, isShort: true })}
          >
            <div
              className="ct-shorts-thumb"
              style={{
                background: `linear-gradient(135deg, ${v.color}40, ${v.color}15)`,
              }}
            >
              <img
                src={v.thumbnail}
                alt={v.title}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: 8,
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <span className="ct-shorts-badge">SHORT</span>
              <span className="ct-yt-play-btn">▶</span>
            </div>
            <div className="ct-shorts-title">{v.title}</div>
            <div className="ct-yt-meta">
              {v.channel}
              {v.published ? ` · ${v.published}` : ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
