import React from 'react';

function extractDomain(url) {
  try {
    const host = new URL(url).hostname;
    return host.replace(/^www\./, '');
  } catch {
    return url || '';
  }
}

function scoreClass(score) {
  if (score >= 0.75) return 'high';
  if (score >= 0.5) return 'medium';
  return 'low';
}

export function SourceCard({ source, index }) {
  const isAcademic = !!source.platform;
  const domain = isAcademic ? source.platform : extractDomain(source.url);
  const sc = scoreClass(source.score || 0.9);
  const scorePercent = Math.round((source.score || 0.9) * 100);

  return (
    <a
      className={`source-card glass-card ${isAcademic ? 'academic-source-card' : ''}`}
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ animationDelay: `${Math.min((index + 1) * 0.05, 0.6)}s` }}
    >
      <div className="source-card-top">
        <span className="source-card-title">{source.title || domain}</span>
        {isAcademic && source.citations > 0 ? (
          <span className={`source-score ${sc}`}>{source.citations} cit.</span>
        ) : (
          <span className={`source-score ${sc}`}>{scorePercent}%</span>
        )}
      </div>
      <div className="source-card-domain">
        {!isAcademic && (
          <img
            className="favicon"
            src={`https://www.google.com/s2/favicons?sz=32&domain=${domain}`}
            alt=""
            width="14"
            height="14"
            loading="lazy"
          />
        )}
        {isAcademic && (
          <span style={{ fontSize: '14px', marginRight: '6px' }}>🎓</span>
        )}
        <span>{domain}</span>
      </div>
    </a>
  );
}

export function SidebarSourceItem({ source }) {
  const isAcademic = !!source.platform;
  const domain = isAcademic ? source.platform : extractDomain(source.url);

  return (
    <a
      className={`sidebar-source-item ${isAcademic ? 'academic' : ''}`}
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="sidebar-source-title">{source.title || domain}</span>
      <span className="sidebar-source-url">{domain}</span>
    </a>
  );
}

