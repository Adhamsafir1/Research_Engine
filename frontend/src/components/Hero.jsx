import React, { useState } from 'react';
import { SearchIcon, ArrowRightIcon } from './Icons';
import ThemeToggle from './ThemeToggle';

export default function Hero({ onSearch }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim().length >= 3) {
      onSearch(query.trim());
    }
  };

  const handleHintClick = (topic) => {
    setQuery(topic);
    // Focus search input? We can do it using a ref if necessary, but the submit takes care of it.
    // Automatically submit when hint is clicked
    onSearch(topic);
  };

  return (
    <section id="hero" className="hero">
      <div className="hero-actions">
        <ThemeToggle />
      </div>
      <div className="hero-content">
        <div className="hero-badge">
          <span className="badge-dot"></span>
          AI-Powered Deep Research
        </div>
        <h1 className="hero-title">
          Ask<span className="gradient-text">Lumen</span>
        </h1>
        <p className="hero-subtitle">
          Explore any topic with multi-source AI research.<br />
          Deep analysis. Real sources. Comprehensive reports.
        </p>
        <form id="search-form" className="search-container" autoComplete="off" onSubmit={handleSubmit}>
          <div className="search-wrapper">
            <div className="search-glow"></div>
            <div className="search-inner">
              <SearchIcon />
              <input
                type="text"
                id="search-input"
                placeholder="What would you like to research?"
                required
                minLength="3"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button type="submit" id="search-btn" className="search-submit">
                <ArrowRightIcon />
              </button>
            </div>
          </div>
          <div className="search-hints">
            <span
              className="hint"
              onClick={() => handleHintClick('Impact of CRISPR gene editing on rare genetic diseases')}
            >
              CRISPR & rare diseases
            </span>
            <span
              className="hint"
              onClick={() => handleHintClick('The current state of quantum computing and its commercial applications')}
            >
              Quantum computing
            </span>
            <span
              className="hint"
              onClick={() => handleHintClick('How transformer architecture revolutionized natural language processing')}
            >
              Transformer architecture
            </span>
          </div>
        </form>
      </div>
    </section>
  );
}
