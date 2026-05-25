import React, { useState } from 'react';
import { SearchIcon, ArrowRightIcon, MicIcon } from './Icons';
import ThemeToggle from './ThemeToggle';
import VoiceButton from './VoiceButton';

export default function Hero({ onSearch, onOpenVoiceAgent }) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ scholar: false, ieee: false });

  const getModeString = () => {
    const active = [];
    if (filters.scholar) active.push('scholar');
    if (filters.ieee) active.push('ieee');
    return active.length > 0 ? active.join(',') : 'deepresearch';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim().length >= 3) {
      onSearch(query.trim(), getModeString());
    }
  };

  const handleHintClick = (topic) => {
    setQuery(topic);
    onSearch(topic, getModeString());
  };

  const handleVoiceTranscription = (text) => {
    setQuery(text);
    if (text.trim().length >= 3) {
      onSearch(text.trim(), getModeString());
    }
  };

  const toggleFilter = (filterName) => {
    setFilters(prev => ({ ...prev, [filterName]: !prev[filterName] }));
  };

  return (
    <section id="hero" className="hero">
      <div className="hero-actions">
        <button className="btn-voice-agent" onClick={onOpenVoiceAgent} title="Voice Agent">
          <MicIcon />
          <span>Voice Agent</span>
        </button>
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
              <VoiceButton onTranscription={handleVoiceTranscription} />
              <button type="submit" id="search-btn" className="search-submit">
                <ArrowRightIcon />
              </button>
            </div>
          </div>
          <div className="search-options" style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'center' }}>
            <button 
              type="button" 
              className={`mode-toggle-btn ${filters.scholar ? 'active' : ''}`}
              onClick={() => toggleFilter('scholar')}
              style={{ 
                padding: '6px 14px', 
                borderRadius: '20px', 
                border: filters.scholar ? '1px solid transparent' : '1px solid var(--border-color)', 
                background: filters.scholar ? 'var(--primary-color, #3b82f6)' : 'transparent', 
                color: filters.scholar ? '#fff' : 'var(--text-secondary)', 
                cursor: 'pointer', 
                fontSize: '0.85rem',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                boxShadow: filters.scholar ? '0 0 10px rgba(59, 130, 246, 0.5)' : 'none'
              }}
            >
              Scholar Mode
            </button>
            <button 
              type="button" 
              className={`mode-toggle-btn ${filters.ieee ? 'active' : ''}`}
              onClick={() => toggleFilter('ieee')}
              style={{ 
                padding: '6px 14px', 
                borderRadius: '20px', 
                border: filters.ieee ? '1px solid transparent' : '1px solid var(--border-color)', 
                background: filters.ieee ? 'var(--primary-color, #3b82f6)' : 'transparent', 
                color: filters.ieee ? '#fff' : 'var(--text-secondary)', 
                cursor: 'pointer', 
                fontSize: '0.85rem',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                boxShadow: filters.ieee ? '0 0 10px rgba(59, 130, 246, 0.5)' : 'none'
              }}
            >
              IEEE Mode
            </button>
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

