"use client";

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
}

export default function SourceSection({
  name,
  domain,
  color,
  articles,
}: SourceSectionProps) {
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
      </div>
      {/* Featured first article */}
      <div className="ct-featured-article">
        <a
          href={articles[0].link}
          target="_blank"
          rel="noopener noreferrer"
          className="ct-featured-title"
        >
          {articles[0].title}
        </a>
      </div>
      {/* Rest as dense list */}
      {articles.slice(1, 7).map((a, i) => (
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
