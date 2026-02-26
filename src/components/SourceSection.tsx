"use client";

import { useState } from "react";

interface Article {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

interface SourceSectionProps {
  name: string;
  domain: string;
  color: string;
  articles: Article[];
  paginate?: boolean;
}

const PAGE_SIZE = 5; // 1 featured + 4 list

export default function SourceSection({
  name,
  domain,
  color,
  articles,
  paginate,
}: SourceSectionProps) {
  const [page, setPage] = useState(0);
  const totalPages = paginate ? Math.max(1, Math.ceil(articles.length / PAGE_SIZE)) : 1;
  const pageArticles = paginate
    ? articles.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
    : articles.slice(0, 5);

  if (articles.length === 0) {
    return (
      <div className="ct-source-section">
        <div className="ct-source-header">
          <img
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
            alt={name}
            width="18"
            height="18"
            style={{ borderRadius: 3, flexShrink: 0 }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <a
            href={`https://${domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ct-source-name ct-source-link"
            style={{ color }}
          >
            {name}
          </a>
        </div>
        {/* Skeleton loading — uniform bars */}
        <div className="ct-loading-row" />
        <div className="ct-loading-row" />
        <div className="ct-loading-row" />
        <div className="ct-loading-row" />
      </div>
    );
  }

  return (
    <div className="ct-source-section">
      <div className="ct-source-header">
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
          alt={name}
          width="18"
          height="18"
          style={{ borderRadius: 3, flexShrink: 0 }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <a
          href={`https://${domain}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ct-source-name ct-source-link"
          style={{ color }}
        >
          {name}
        </a>
        {paginate && totalPages > 1 && (
          <div className="ct-source-pager">
            <button
              className="ct-source-pager-btn"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label="Previous page"
            >
              ‹
            </button>
            <span className="ct-source-pager-count">
              {page + 1}/{totalPages}
            </span>
            <button
              className="ct-source-pager-btn"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              aria-label="Next page"
            >
              ›
            </button>
          </div>
        )}
      </div>
      {/* Featured first article */}
      {pageArticles.length > 0 && (
        <div className="ct-featured-article">
          <a
            href={pageArticles[0].link}
            target="_blank"
            rel="noopener noreferrer"
            className="ct-featured-title"
          >
            {pageArticles[0].title}
          </a>
        </div>
      )}
      {/* Rest as dense list */}
      {pageArticles.slice(1, 5).map((a, i) => (
        <a
          key={i}
          href={a.link}
          target="_blank"
          rel="noopener noreferrer"
          className="ct-article-row"
          style={{ textDecoration: "none" }}
        >
          <span className="ct-article-title">{a.title}</span>
          <span className="ct-article-share">↗</span>
        </a>
      ))}
      <a
        href={`https://${domain}`}
        target="_blank"
        rel="noopener noreferrer"
        className="ct-more-link"
        style={{ color }}
      >
        MORE ···
      </a>
    </div>
  );
}
