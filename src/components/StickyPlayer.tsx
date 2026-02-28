"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Video {
  title: string;
  videoId: string;
  isShort?: boolean;
}

interface StickyPlayerProps {
  video: Video | null;
  onClose: () => void;
}

export default function StickyPlayer({ video, onClose }: StickyPlayerProps) {
  const [minimized, setMinimized] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [width, setWidth] = useState(340);
  const dragRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, startWidth: 340 });

  // Reset width + position when switching between Short and regular video
  useEffect(() => {
    if (video?.isShort) {
      setWidth(260);
    } else if (video) {
      setWidth(340);
    }
    // Default to bottom-right
    if (video) {
      setPos(null);
    }
  }, [video?.videoId, video?.isShort]);

  // Prevent page text selection during drag/resize
  useEffect(() => {
    if (dragging || resizing) {
      document.body.style.userSelect = "none";
      document.body.style.webkitUserSelect = "none";
      return () => {
        document.body.style.userSelect = "";
        document.body.style.webkitUserSelect = "";
      };
    }
  }, [dragging, resizing]);

  // Drag handling
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (resizing) return;
    setDragging(true);
    const rect = dragRef.current!.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    offsetRef.current = { x: clientX - rect.left, y: clientY - rect.top };
    // Switch from bottom-right to absolute left/top on first drag
    if (!pos) {
      setPos({ x: rect.left, y: rect.top });
    }
  };

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const clientX = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      setPos({ x: clientX - offsetRef.current.x, y: clientY - offsetRef.current.y });
    };
    const handleUp = () => setDragging(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleUp);
    };
  }, [dragging]);

  // Resize handling — only scales width, height follows from 16:9
  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setResizing(true);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    resizeStartRef.current = { x: clientX, startWidth: width };
  };

  useEffect(() => {
    if (!resizing) return;
    const handleMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const clientX = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const delta = clientX - resizeStartRef.current.x;
      const newWidth = Math.max(200, resizeStartRef.current.startWidth + delta);
      setWidth(newWidth);
    };
    const handleUp = () => setResizing(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleUp);
    };
  }, [resizing]);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Set volume to 50% once the YouTube player is ready
  const handleIframeLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    // The YT embed with enablejsapi=1 accepts postMessage commands.
    // We need to wait for the player to be ready, then set volume.
    const setVolume = () => {
      try {
        iframe.contentWindow?.postMessage(
          JSON.stringify({
            event: "command",
            func: "setVolume",
            args: [50],
          }),
          "*"
        );
      } catch {
        // cross-origin — silent
      }
    };
    // Small delay to let the player initialise after iframe load
    setTimeout(setVolume, 800);
    setTimeout(setVolume, 1500);
  }, []);

  const isShort = video?.isShort ?? false;
  const playerWidth = minimized ? 260 : width;

  if (!video) return null;

  return (
    <div
      ref={dragRef}
      className={`ct-sticky-player ${minimized ? "ct-sp-mini" : ""} ${isShort ? "ct-sp-short" : ""}`}
      style={{
        ...(pos
          ? { left: pos.x, top: pos.y }
          : { right: 16, bottom: 16 }),
        width: playerWidth,
        userSelect: dragging || resizing ? "none" : undefined,
      }}
    >
      <div
        className="ct-sp-header"
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
      >
        <span className="ct-sp-title">{video.title}</span>
        <div className="ct-sp-controls">
          <button className="ct-sp-btn" onClick={() => setMinimized(!minimized)}>
            {minimized ? "□" : "—"}
          </button>
          <button className="ct-sp-btn" onClick={onClose}>
            ✕
          </button>
        </div>
      </div>
      {!minimized && (
        <div className="ct-sp-embed" style={{ aspectRatio: isShort ? "9/16" : "16/9" }}>
          <iframe
            ref={iframeRef}
            src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1&rel=0&enablejsapi=1&origin=${typeof window !== "undefined" ? window.location.origin : ""}`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onLoad={handleIframeLoad}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              borderRadius: "0 0 10px 10px",
            }}
          />
          {/* Corner resize handle */}
          <div
            className="ct-sp-resize"
            onMouseDown={handleResizeStart}
            onTouchStart={handleResizeStart}
          />
        </div>
      )}
    </div>
  );
}
