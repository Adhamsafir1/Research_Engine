import React, { useState, useRef } from 'react';
import Hero from './components/Hero';
import Dashboard from './components/Dashboard';
import './index.css';

const INITIAL_SSE_STATE = {
  statusText: '',
  activeStep: null,
  completedSteps: [],
  stepDetails: {
    plan: 'Waiting...',
    search: 'Waiting...',
    scrape: 'Waiting...',
    write: 'Waiting...',
    critique: 'Waiting...',
  },
  sources: [],
  scrapedCount: 0,
  report: '',
  feedback: '',
  isComplete: false,
  completionStats: '',
  errorMsg: '',
};

export default function App() {
  const [topic, setTopic] = useState('');
  const [view, setView] = useState('hero'); // 'hero' | 'dashboard'
  const [sseState, setSseState] = useState(INITIAL_SSE_STATE);

  const abortControllerRef = useRef(null);
  const sourceCounterRef = useRef(0);
  const scrapedCounterRef = useRef(0);

  const handleStartResearch = async (searchTopic) => {
    setTopic(searchTopic);
    setView('dashboard');
    setSseState({
      ...INITIAL_SSE_STATE,
      statusText: 'Planning research strategy...',
      activeStep: 'plan',
      stepDetails: { ...INITIAL_SSE_STATE.stepDetails, plan: 'Analyzing topic...' },
    });
    sourceCounterRef.current = 0;
    scrapedCounterRef.current = 0;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch('/api/v1/research/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: searchTopic }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.slice(6);
            try {
              const event = JSON.parse(jsonStr);
              handleEvent(event);
            } catch (e) {
              // Ignore invalid JSON
            }
          }
        }
      }

      if (buffer.trim().startsWith('data: ')) {
        try {
          const event = JSON.parse(buffer.trim().slice(6));
          handleEvent(event);
        } catch (e) {
          // Ignore invalid JSON
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setSseState((prev) => ({
          ...prev,
          errorMsg: err.message || 'An unexpected error occurred.',
          statusText: 'Error',
        }));
      }
    }
  };

  const handleEvent = (event) => {
    setSseState((prev) => {
      const next = { ...prev, stepDetails: { ...prev.stepDetails } };

      const setStepCompleted = (step) => {
        if (!next.completedSteps.includes(step)) {
          next.completedSteps = [...next.completedSteps, step];
        }
      };

      const setStepActive = (step) => {
        next.activeStep = step;
      };

      switch (event.type) {
        case 'planning':
          setStepActive('plan');
          next.statusText = event.message || 'Planning research strategy...';
          next.stepDetails.plan = event.message || 'Analyzing...';
          break;

        case 'plan_ready':
          setStepCompleted('plan');
          const n = event.subqueries?.length || 0;
          next.stepDetails.plan = `${n} sub-queries • ${event.complexity || 'standard'} complexity`;
          setStepActive('search');
          next.statusText = 'Searching the web...';
          next.stepDetails.search = 'Starting searches...';
          break;

        case 'searching':
          setStepActive('search');
          next.statusText = `Searching: "${event.query}"`;
          next.stepDetails.search = `Query ${event.index}/${event.total}: ${event.query}`;
          break;

        case 'source':
          sourceCounterRef.current += 1;
          next.sources = [...next.sources, event];
          break;

        case 'scraping':
          setStepCompleted('search');
          if (next.stepDetails.search === 'Starting searches...') {
             next.stepDetails.search = 'All queries completed';
          }
          setStepActive('scrape');
          next.statusText = `Scraping sources... (${event.index}/${event.total})`;
          let domain = '';
          try {
             domain = new URL(event.url).hostname.replace(/^www\./, '');
          } catch {
             domain = event.url;
          }
          next.stepDetails.scrape = `Page ${event.index}/${event.total}: ${domain}`;
          break;

        case 'scraped':
          scrapedCounterRef.current += 1;
          next.scrapedCount = scrapedCounterRef.current;
          break;

        case 'writing':
          setStepCompleted('scrape');
          next.stepDetails.scrape = `${scrapedCounterRef.current} pages analyzed`;
          setStepActive('write');
          next.statusText = event.message || 'Writing report...';
          next.stepDetails.write = event.message || 'Generating...';
          break;

        case 'critiquing':
          setStepCompleted('write');
          next.stepDetails.write = 'Report generated';
          setStepActive('critique');
          next.statusText = event.message || 'Evaluating quality...';
          next.stepDetails.critique = event.message || 'Analyzing...';
          break;

        case 'report':
          next.report = event.content || '';
          break;

        case 'feedback':
          next.feedback = event.content || '';
          break;

        case 'done':
          setStepCompleted('critique');
          next.stepDetails.critique = 'Evaluation complete';
          next.statusText = 'Research complete';
          next.isComplete = true;
          const mins = event.total_time ? Math.round(event.total_time) : '?';
          next.completionStats = `Completed in ${mins}s · ${event.total_sources || sourceCounterRef.current} sources found · ${event.total_scraped || scrapedCounterRef.current} pages analyzed`;
          break;

        case 'error':
          next.errorMsg = event.message || 'An error occurred during research.';
          next.statusText = 'Error';
          break;

        default:
          break;
      }
      return next;
    });
  };

  const handleNewResearch = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setView('hero');
    setTopic('');
    setSseState(INITIAL_SSE_STATE);
  };

  return (
    <>
      {view === 'hero' ? (
        <Hero onSearch={handleStartResearch} />
      ) : (
        <Dashboard topic={topic} onNewResearch={handleNewResearch} sseState={sseState} />
      )}
    </>
  );
}
