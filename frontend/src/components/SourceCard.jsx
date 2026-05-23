import React from 'react';

function extractDomain(url) {
  try {
    const host = new URL(url).hostname;
    return host.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function scoreClass(score) {
  if (score >= 0.75) return 'high';
  if (score >= 0.5) return 'medium';
  return 'low';
}

export function SourceCard({ source, index }) {
  const domain = extractDomain(source.url);
  const sc = scoreClass(source.score);
  const scorePercent = Math.round((source.score || 0) * 100);

  return (
    <a
      className="source-card"
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ animationDelay: `${Math.min((index + 1) * 0.05, 0.6)}s` }}
    >
      <div className="source-card-top">
        <span className="source-card-title">{source.title || domain}</span>
        <span className={`source-score ${sc}`}>{scorePercent}%</span>
      </div>
      <div className="source-card-domain">
        <img
          className="favicon"
          src={`https://www.google.com/s2/favicons?sz=32&domain=${domain}`}
          alt=""
          width="14"
          height="14"
          loading="lazy"
        />
        <span>{domain}</span>
      </div>
    </a>
  );
}

export function SidebarSourceItem({ source }) {
  const domain = extractDomain(source.url);

  return (
    <a
      className="sidebar-source-item"
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="sidebar-source-title">{source.title || domain}</span>
      <span className="sidebar-source-url">{domain}</span>
    </a>
  );
}
