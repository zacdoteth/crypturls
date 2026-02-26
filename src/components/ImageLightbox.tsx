"use client";

import { useEffect, useCallback } from "react";

interface ImageLightboxProps {
  imageUrl: string;
  tweetUrl: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export default function ImageLightbox({
  imageUrl,
  tweetUrl,
  onClose,
  onPrev,
  onNext,
}: ImageLightboxProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && onPrev) onPrev();
      if (e.key === "ArrowRight" && onNext) onNext();
    },
    [onClose, onPrev, onNext]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  return (
    <div className="ct-lightbox-overlay" onClick={onClose}>
      <div
        className="ct-lightbox-content"
        onClick={(e) => e.stopPropagation()}
      >
        {onPrev && (
          <button className="ct-lightbox-arrow ct-lightbox-prev" onClick={onPrev}>
            ←
          </button>
        )}
        <img src={imageUrl} alt="" className="ct-lightbox-img" />
        {onNext && (
          <button className="ct-lightbox-arrow ct-lightbox-next" onClick={onNext}>
            →
          </button>
        )}
        <div className="ct-lightbox-actions">
          <a
            href={tweetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ct-lightbox-link"
          >
            View on 𝕏 →
          </a>
          <button className="ct-lightbox-close" onClick={onClose}>
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
