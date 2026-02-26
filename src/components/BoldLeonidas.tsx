"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import ImageLightbox from "./ImageLightbox";
import { fetchJsonClient } from "@/lib/client-http";
import { useVisibilityPolling } from "@/lib/use-visibility-polling";

interface TweetImage {
  imageUrl: string;
  tweetUrl: string;
}

export default function BoldLeonidas() {
  const [allImages, setAllImages] = useState<TweetImage[]>([]);
  const [filtered, setFiltered] = useState<TweetImage[]>([]);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(5);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const retriesRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    const updatePerPage = () => {
      const w = window.innerWidth;
      setPerPage(w < 640 ? 2 : w < 900 ? 3 : 6);
    };
    updatePerPage();
    window.addEventListener("resize", updatePerPage);
    return () => window.removeEventListener("resize", updatePerPage);
  }, []);

  const fetchImages = useCallback(async function fetchImagesTask() {
    try {
      const data = await fetchJsonClient<TweetImage[]>(
        "/api/tweets?user=boldleonidas",
        10000
      );
      if (Array.isArray(data) && data.length > 0) {
        setAllImages(data);
        retriesRef.current = 0;
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }
        return;
      }
    } catch {
      // retry branch below
    }

    if (retriesRef.current < 3) {
      retriesRef.current += 1;
      const delay = 15000 * retriesRef.current;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      retryTimeoutRef.current = setTimeout(() => {
        void fetchImagesTask();
      }, delay);
      return;
    }

    setLoading(false);
  }, []);

  useVisibilityPolling(fetchImages, 10 * 60 * 1000);

  // Filter images client-side: only keep square-ish images (comics)
  // Leonidas comics are square (~1:1), photos/promos are landscape or portrait
  const filterComics = useCallback(async (images: TweetImage[]) => {
    const results: TweetImage[] = [];

    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            const el = new Image();
            el.onload = () => {
              const ratio = el.naturalWidth / el.naturalHeight;
              // Keep roughly square images (0.7 to 1.4 ratio = comics)
              // This filters out wide banners and tall screenshots
              if (ratio >= 0.7 && ratio <= 1.4) {
                results.push(img);
              }
              resolve();
            };
            el.onerror = () => resolve();
            el.src = img.imageUrl;
          })
      )
    );

    // Preserve original order (sorted by tweet ID)
    const urlOrder = new Map(images.map((img, i) => [img.imageUrl, i]));
    results.sort(
      (a, b) => (urlOrder.get(a.imageUrl) ?? 0) - (urlOrder.get(b.imageUrl) ?? 0)
    );

    if (!mountedRef.current) return;
    setFiltered(results);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (allImages.length > 0) {
      filterComics(allImages);
    }
  }, [allImages, filterComics]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filtered.length / perPage) - 1);
    setPage((p) => Math.min(p, maxPage));
  }, [filtered.length, perPage]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const images = filtered;
  const totalPages = Math.max(1, Math.ceil(images.length / perPage));
  const visible = images.slice(page * perPage, page * perPage + perPage);

  return (
    <>
      <div className="ct-twitter-section">
        <div className="ct-yt-header">
          <div className="ct-section-label">
            <img
              src="https://www.google.com/s2/favicons?domain=x.com&sz=32"
              alt=""
              style={{
                width: 14,
                height: 14,
                borderRadius: 2,
                verticalAlign: "middle",
                marginRight: 6,
                opacity: 0.8,
              }}
            />
            <span style={{ color: "#F7931A" }}>BOLD LEONIDAS</span>
            <a
              href="https://x.com/boldleonidas"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#4A5070",
                fontSize: 11,
                fontWeight: 400,
                marginLeft: 8,
                textDecoration: "none",
              }}
            >
              @boldleonidas
            </a>
          </div>
          <div className="ct-yt-nav">
            {totalPages > 1 && (
              <>
                <button
                  className="ct-yt-arrow"
                  onClick={() =>
                    setPage((p) => (p - 1 + totalPages) % totalPages)
                  }
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
              </>
            )}
          </div>
        </div>
        {images.length > 0 ? (
          <div className="ct-brah-grid">
            {visible.map((img, i) => (
              <div
                key={`${page}-${i}`}
                className="ct-brah-card ct-brah-card-square"
                style={{ animationDelay: `${i * 50}ms` }}
                onClick={() => setLightboxIdx(page * perPage + i)}
              >
                <img
                  src={img.imageUrl}
                  alt="Bold Leonidas"
                  className="ct-brah-img"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).parentElement!.style.display =
                      "none";
                  }}
                />
              </div>
            ))}
          </div>
        ) : loading ? (
          <div className="ct-brah-grid">
            {Array.from({ length: perPage }).map((_, i) => (
              <div key={i} className="ct-brah-card ct-brah-card-square ct-brah-loading" />
            ))}
          </div>
        ) : null}
      </div>
      {lightboxIdx !== null && images[lightboxIdx] && (
        <ImageLightbox
          imageUrl={images[lightboxIdx].imageUrl}
          tweetUrl={images[lightboxIdx].tweetUrl}
          onClose={() => setLightboxIdx(null)}
          onPrev={lightboxIdx > 0 ? () => setLightboxIdx(lightboxIdx - 1) : undefined}
          onNext={lightboxIdx < images.length - 1 ? () => setLightboxIdx(lightboxIdx + 1) : undefined}
        />
      )}
    </>
  );
}
