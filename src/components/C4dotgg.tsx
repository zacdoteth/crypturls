"use client";

import { useState, useCallback } from "react";
import { fetchJsonClient } from "@/lib/client-http";
import { useVisibilityPolling } from "@/lib/use-visibility-polling";

interface C4Item {
  text: string;
  url?: string;
  handle?: string;
  tags?: string[];
}

interface C4Section {
  category: string;
  emoji?: string;
  items: C4Item[];
}

interface C4Feed {
  date: string;
  postUrl: string;
  sections: C4Section[];
}

const C4_COLOR = "#00D4FF";

function ItemLink({
  item,
}: {
  item: C4Item;
}) {
  const href = item.url || (item.handle ? `https://x.com/${item.handle}` : undefined);

  const inner = (
    <>
      {item.handle && (
        <span className="ct-c4-handle">@{item.handle}</span>
      )}
      {item.text && item.text !== item.handle && (
        <span className="ct-c4-text">{item.text}</span>
      )}
      {item.tags?.map((tag, ti) => (
        <span key={ti} className="ct-c4-tag">
          {tag}
        </span>
      ))}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="ct-c4-item"
      >
        {inner}
      </a>
    );
  }
  return <div className="ct-c4-item">{inner}</div>;
}

export default function C4dotgg() {
  const [feed, setFeed] = useState<C4Feed | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFeed = useCallback(async () => {
    try {
      const data = await fetchJsonClient<C4Feed>("/api/c4dotgg", 10000);
      if (data.sections && data.sections.length > 0) {
        setFeed(data);
      }
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);
  useVisibilityPolling(fetchFeed, 10 * 60 * 1000);

  if (!feed && !loading) return null;

  return (
    <div className="ct-c4-section">
      <div className="ct-c4-header">
        <div className="ct-c4-header-left">
          <img
            src="https://www.google.com/s2/favicons?domain=t.me&sz=32"
            alt=""
            style={{
              width: 14,
              height: 14,
              borderRadius: 2,
              opacity: 0.8,
            }}
          />
          <a
            href="https://t.me/c4dotgg"
            target="_blank"
            rel="noopener noreferrer"
            className="ct-source-name ct-source-link"
            style={{ color: C4_COLOR }}
          >
            C4DOTGG
          </a>
          <span className="ct-c4-badge">DAILY</span>
          {feed?.date && (
            <span className="ct-c4-date">{feed.date}</span>
          )}
        </div>
        {feed?.postUrl && (
          <a
            href={feed.postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ct-more-link"
            style={{ color: C4_COLOR, padding: 0, margin: 0 }}
          >
            VIEW POST ···
          </a>
        )}
      </div>

      {feed ? (
        <div className="ct-c4-grid">
          {(() => {
            // Col 1: New Projects + Launches (keep sub-headers)
            // Col 2: News / Updates / Reads — flat list, no sub-headers
            const col1Sections: C4Section[] = [];
            const col2Items: C4Item[] = [];

            for (const s of feed.sections) {
              const cat = s.category.toLowerCase();
              if (cat.includes("new project") || cat.includes("launch")) {
                col1Sections.push(s);
              } else {
                // News, Project Updates, Threads/Reads, everything else → flat list
                col2Items.push(...s.items);
              }
            }

            return (
              <>
                <div className="ct-c4-col">
                  {col1Sections.map((section, si) => (
                    <div key={si}>
                      <div className="ct-c4-cat">
                        {section.emoji && <span>{section.emoji}</span>}
                        {section.category}
                      </div>
                      {section.items.map((item, ii) => (
                        <ItemLink key={ii} item={item} />
                      ))}
                    </div>
                  ))}
                </div>
                <div className="ct-c4-col">
                  <div className="ct-c4-cat">News / Updates / Reads</div>
                  {col2Items.map((item, ii) => (
                    <ItemLink key={ii} item={item} />
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      ) : loading ? (
        <div className="ct-c4-grid">
          <div className="ct-c4-col">
            <div className="ct-loading-row" />
            <div className="ct-loading-row" />
            <div className="ct-loading-row" />
          </div>
          <div className="ct-c4-col">
            <div className="ct-loading-row" />
            <div className="ct-loading-row" />
            <div className="ct-loading-row" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
