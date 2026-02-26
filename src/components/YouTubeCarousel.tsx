"use client";

import { useState, useEffect } from "react";

interface YouTubeVideo {
  title: string;
  channel: string;
  views: string;
  videoId: string;
  thumbnail: string;
  color: string;
  published?: string;
}

interface YouTubeCarouselProps {
  onPlayVideo: (video: YouTubeVideo) => void;
}

export default function YouTubeCarousel({ onPlayVideo }: YouTubeCarouselProps) {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [ytPage, setYtPage] = useState(0);
  const [perPage, setPerPage] = useState(6);

  useEffect(() => {
    const updatePerPage = () => {
      const w = window.innerWidth;
      setPerPage(w < 640 ? 2 : w < 900 ? 3 : 6);
    };
    updatePerPage();
    window.addEventListener("resize", updatePerPage);
    return () => window.removeEventListener("resize", updatePerPage);
  }, []);

  useEffect(() => {
    async function fetchVideos() {
      try {
        const res = await fetch("/api/youtube");
        const data = await res.json();
        setVideos(data);
      } catch {
        console.error("Failed to fetch YouTube videos");
      }
    }
    fetchVideos();
  }, []);

  const totalPages = Math.max(1, Math.ceil(videos.length / perPage));
  const visible = videos.slice(ytPage * perPage, ytPage * perPage + perPage);

  if (videos.length === 0) {
    return (
      <div className="ct-yt-section">
        <div className="ct-section-label">
          <img
            src="https://www.google.com/s2/favicons?domain=youtube.com&sz=32"
            alt=""
            style={{ width: 14, height: 14, borderRadius: 2, verticalAlign: "middle", marginRight: 6, opacity: 0.8 }}
          />
          CRYPTO YOUTUBE
        </div>
        <div style={{ color: "#4A5070", fontSize: 12, padding: "20px 0" }}>
          Loading videos...
        </div>
      </div>
    );
  }

  return (
    <div className="ct-yt-section">
      <div className="ct-yt-header">
        <div className="ct-section-label">
          <img
            src="https://www.google.com/s2/favicons?domain=youtube.com&sz=32"
            alt=""
            style={{ width: 14, height: 14, borderRadius: 2, verticalAlign: "middle", marginRight: 6, opacity: 0.8 }}
          />
          CRYPTO YOUTUBE
        </div>
        <div className="ct-yt-nav">
          <button
            className="ct-yt-arrow"
            onClick={() =>
              setYtPage((p) => (p - 1 + totalPages) % totalPages)
            }
          >
            ←
          </button>
          <span className="ct-yt-counter">
            {ytPage + 1}/{totalPages}
          </span>
          <button
            className="ct-yt-arrow"
            onClick={() => setYtPage((p) => (p + 1) % totalPages)}
          >
            →
          </button>
        </div>
      </div>
      <div className="ct-yt-grid">
        {visible.map((v, i) => (
          <div
            key={`${ytPage}-${i}`}
            className="ct-yt-card"
            onClick={() => onPlayVideo(v)}
          >
            <div
              className="ct-yt-thumb"
              style={{
                background: `linear-gradient(135deg, ${v.color}40, ${v.color}15)`,
              }}
            >
              <img
                src={
                  v.thumbnail ||
                  `https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`
                }
                alt={v.title}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: 8,
                  opacity: 0.85,
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <span className="ct-yt-play-btn">▶</span>
            </div>
            <div className="ct-yt-title">{v.title}</div>
            <div className="ct-yt-meta">
              {v.channel}
              {v.published ? ` · ${v.published}` : ""}
              {v.views ? ` · ${v.views}` : ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
