"use client";

import { useState, useEffect } from "react";
import { fetchJsonClient } from "@/lib/client-http";

interface Podcast {
  title: string;
  host: string;
  color: string;
  artworkUrl: string;
  latestVideoId?: string;
  latestEpisode?: string;
  published?: string;
}

interface PodcastGridProps {
  onPlayVideo?: (video: { title: string; videoId: string }) => void;
}

export default function PodcastGrid({ onPlayVideo }: PodcastGridProps) {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [page, setPage] = useState(0);
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
    async function fetchPodcasts() {
      try {
        const data = await fetchJsonClient<Podcast[]>("/api/podcasts", 12000);
        setPodcasts(data);
      } catch {
        console.error("Failed to fetch podcasts");
      }
    }
    fetchPodcasts();
  }, []);

  const totalPages = Math.max(1, Math.ceil(podcasts.length / perPage));
  const visible = podcasts.slice(page * perPage, page * perPage + perPage);

  if (podcasts.length === 0) {
    return (
      <div className="ct-pod-section">
        <div className="ct-section-label">
          <img
            src="https://www.google.com/s2/favicons?domain=podcasts.apple.com&sz=32"
            alt=""
            style={{ width: 14, height: 14, borderRadius: 2, verticalAlign: "middle", marginRight: 6, opacity: 0.8 }}
          />
          CRYPTO PODCASTS
        </div>
        <div style={{ color: "#4A5070", fontSize: 12, padding: "20px 0" }}>
          Loading podcasts...
        </div>
      </div>
    );
  }

  return (
    <div className="ct-pod-section">
      <div className="ct-yt-header">
        <div className="ct-section-label">
          <img
            src="https://www.google.com/s2/favicons?domain=podcasts.apple.com&sz=32"
            alt=""
            style={{ width: 14, height: 14, borderRadius: 2, verticalAlign: "middle", marginRight: 6, opacity: 0.8 }}
          />
          CRYPTO PODCASTS
        </div>
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
      </div>
      <div className="ct-pod-grid">
        {visible.map((p, i) => (
          <div
            key={`${page}-${i}`}
            className="ct-pod-card"
            onClick={() => {
              if (p.latestVideoId && onPlayVideo) {
                onPlayVideo({
                  title: p.latestEpisode || p.title,
                  videoId: p.latestVideoId,
                });
              }
            }}
            style={{ cursor: p.latestVideoId ? "pointer" : "default" }}
          >
            <div
              className="ct-pod-thumb"
              style={{
                background: `linear-gradient(135deg, ${p.color}40, ${p.color}15)`,
              }}
            >
              {p.latestVideoId ? (
                <img
                  src={`https://img.youtube.com/vi/${p.latestVideoId}/mqdefault.jpg`}
                  alt={p.latestEpisode || p.title}
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
              ) : p.artworkUrl ? (
                <img
                  src={p.artworkUrl}
                  alt={p.title}
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
              ) : null}
              {p.artworkUrl && (
                <img
                  src={p.artworkUrl}
                  alt=""
                  className="ct-pod-badge"
                />
              )}
              {p.latestVideoId && (
                <span className="ct-pod-play">▶</span>
              )}
            </div>
            <div className="ct-pod-title">
              {p.latestEpisode || p.title}
            </div>
            <div className="ct-pod-host">
              {p.host}
              {p.published ? ` · ${p.published}` : ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
