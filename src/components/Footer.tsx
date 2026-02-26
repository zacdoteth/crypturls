"use client";

import { useState, useEffect } from "react";

export default function Footer() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString());
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <footer className="ct-footer">
      <span className="ct-footer-logo">🕷️ CRYPTURLS</span>
      <span className="ct-footer-text">
        The entire crypto world on a single page
      </span>
      <span className="ct-footer-time">{time}</span>
    </footer>
  );
}
