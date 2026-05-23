import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import ThemeToggle from './ThemeToggle';
import { SourceCard, SidebarSourceItem } from './SourceCard';
import {
  PlusIcon,
  MenuIcon,
  LinkIcon,
  BookIcon,
  ShieldCheckIcon,
  FileTextIcon,
  ClipboardListIcon,
  PencilIcon,
  QualityIcon,
  WarningIcon,
  EyeIcon,
  SearchIcon,
  VolumeIcon,
} from './Icons';

export default function Dashboard({ topic, onNewResearch, sseState }) {
  const {
    statusText,
    activeStep,
    completedSteps,
    stepDetails,
    sources,
    scrapedCount,
    report,
    feedback,
    isComplete,
    completionStats,
    errorMsg,
  } = sseState;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const reportRef = useRef(null);

  const handleReadAloud = async () => {
    if (ttsPlaying) return;
    const summaryText = completionStats || 'Research complete.';
    setTtsPlaying(true);
    try {
      const res = await fetch('/api/v1/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `Research complete. ${summaryText}` }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => {
          setTtsPlaying(false);
          URL.revokeObjectURL(url);
        };
        audio.play();
      } else {
        setTtsPlaying(false);
      }
    } catch {
      setTtsPlaying(false);
    }
  };

  // Auto-scroll to report when it becomes available
  useEffect(() => {
    if (report && reportRef.current) {
      setTimeout(() => {
        reportRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [report]);

  return (
    <section id="dashboard" className="dashboard">
      <div className="dashboard-layout">
        {/* Main Content Column */}
        <div className="main-column">
          {/* Top Bar */}
          <div className="top-bar glass-card">
            <div className="top-bar-left">
              <button
                id="new-research-btn"
                className="btn-new-research"
                title="New Research"
                onClick={onNewResearch}
              >
                <PlusIcon />
                <span>New Research</span>
              </button>
            </div>
            <div className="top-bar-center">
              <h2 id="research-topic-title" className="topic-title">
                {topic}
              </h2>
            </div>
            <div className="top-bar-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ThemeToggle />
              <button
                id="toggle-sources-btn"
                className="btn-toggle-sources"
                title="Toggle Sources Panel"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <MenuIcon />
              </button>
            </div>
          </div>

          {/* Status Banner */}
          <div id="status-banner" className="status-banner glass-card">
            <div className="status-left">
              <div
                className={`pulse-dot ${isComplete ? 'done' : ''}`}
                style={errorMsg ? { background: 'var(--red)', animation: 'none' } : {}}
              ></div>
              <span id="status-text" className="status-text">
                {errorMsg ? 'Error' : statusText || 'Initializing research...'}
              </span>
            </div>
            <div className="status-right">
              <div className="stat-chip">
                <BookIcon />
                <span id="sources-count">{sources.length}</span> sources
              </div>
              <div className="stat-chip">
                <EyeIcon />
                <span id="scraped-count">{scrapedCount}</span> analyzed
              </div>
            </div>
          </div>

          {/* Progress Steps */}
          <div id="progress-steps" className="progress-steps glass-card">
            {/* Step: Plan */}
            <StepItem
              id="plan"
              label="Planning"
              detail={stepDetails.plan}
              isActive={activeStep === 'plan'}
              isCompleted={completedSteps.includes('plan')}
              icon={<ClipboardListIcon />}
            />
            {/* Step: Search */}
            <StepItem
              id="search"
              label="Searching"
              detail={stepDetails.search}
              isActive={activeStep === 'search'}
              isCompleted={completedSteps.includes('search')}
              icon={<SearchIcon />}
            />
            {/* Step: Scrape */}
            <StepItem
              id="scrape"
              label="Analyzing"
              detail={stepDetails.scrape}
              isActive={activeStep === 'scrape'}
              isCompleted={completedSteps.includes('scrape')}
              icon={<FileTextIcon />}
            />
            {/* Step: Write */}
            <StepItem
              id="write"
              label="Writing"
              detail={stepDetails.write}
              isActive={activeStep === 'write'}
              isCompleted={completedSteps.includes('write')}
              icon={<PencilIcon />}
            />
            {/* Step: Critique */}
            <StepItem
              id="critique"
              label="Evaluating"
              detail={stepDetails.critique}
              isActive={activeStep === 'critique'}
              isCompleted={completedSteps.includes('critique')}
              icon={<ShieldCheckIcon />}
            />
          </div>

          {/* Source Cards Grid (live) */}
          <div id="live-sources" className="live-sources">
            <div className="section-header">
              <h3>
                <LinkIcon />
                Discovered Sources
              </h3>
            </div>
            <div id="sources-grid" className="sources-grid">
              {sources.map((source, idx) => (
                <SourceCard key={idx} source={source} index={idx} />
              ))}
            </div>
          </div>

          {/* Report Section */}
          {report && (
            <div id="report-section" className="report-section" ref={reportRef}>
              <div className="section-header">
                <h3>
                  <BookIcon />
                  Research Report
                </h3>
              </div>
              <article id="report-content" className="report-content glass-card">
                <ReactMarkdown>{report}</ReactMarkdown>
              </article>
            </div>
          )}

          {/* Critic Feedback */}
          {feedback && (
            <div id="feedback-section" className="feedback-section">
              <div className="section-header">
                <h3>
                  <QualityIcon />
                  Quality Evaluation
                </h3>
              </div>
              <div id="feedback-content" className="feedback-content glass-card">
                <ReactMarkdown>{feedback}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Completion Banner */}
          {isComplete && (
            <div id="completion-banner" className="completion-banner glass-card">
              <div className="completion-icon">
                <ShieldCheckIcon />
              </div>
              <div className="completion-text">
                <h4>Research Complete</h4>
                <p id="completion-stats">{completionStats}</p>
              </div>
              <button
                className={`btn-read-aloud ${ttsPlaying ? 'playing' : ''}`}
                onClick={handleReadAloud}
                disabled={ttsPlaying}
                title="Read aloud"
              >
                <VolumeIcon />
                <span>{ttsPlaying ? 'Playing...' : 'Read Aloud'}</span>
              </button>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div id="error-banner" className="error-banner glass-card">
              <div className="error-icon">
                <WarningIcon />
              </div>
              <p id="error-text">{errorMsg}</p>
            </div>
          )}
        </div>

        {/* Sources Sidebar */}
        <aside
          id="sources-sidebar"
          className={`sources-sidebar ${sidebarOpen ? 'mobile-open collapsed' : ''}`}
        >
          <div className="sidebar-header">
            <h3>All Sources</h3>
            <span id="sidebar-source-count" className="sidebar-count">
              {sources.length}
            </span>
          </div>
          <div id="sidebar-sources-list" className="sidebar-sources-list">
            {sources.map((source, idx) => (
              <SidebarSourceItem key={idx} source={source} />
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

function StepItem({ id, label, detail, isActive, isCompleted, icon }) {
  let className = 'step';
  if (isActive) className += ' active';
  if (isCompleted) className += ' completed';

  return (
    <div className={className} id={`step-${id}`} data-step={id}>
      <div className="step-icon">{icon}</div>
      <div className="step-content">
        <span className="step-label">{label}</span>
        <span className="step-detail" id={`step-${id}-detail`}>
          {detail || 'Waiting...'}
        </span>
      </div>
      <div className="step-status"></div>
    </div>
  );
}
