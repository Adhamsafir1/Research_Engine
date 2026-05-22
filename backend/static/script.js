/* ============================================================
   AskLumen — Frontend Controller
   ============================================================ */

(() => {
  'use strict';

  // ---- DOM References ----
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const hero            = $('#hero');
  const dashboard       = $('#dashboard');
  const searchForm      = $('#search-form');
  const searchInput     = $('#search-input');
  const searchBtn       = $('#search-btn');
  const topicTitle      = $('#research-topic-title');
  const statusText      = $('#status-text');
  const statusBanner    = $('#status-banner');
  const pulseDot        = statusBanner?.querySelector('.pulse-dot');
  const sourcesCount    = $('#sources-count');
  const scrapedCount    = $('#scraped-count');
  const sourcesGrid     = $('#sources-grid');
  const reportSection   = $('#report-section');
  const reportContent   = $('#report-content');
  const feedbackSection = $('#feedback-section');
  const feedbackContent = $('#feedback-content');
  const completionBanner = $('#completion-banner');
  const completionStats = $('#completion-stats');
  const errorBanner     = $('#error-banner');
  const errorText       = $('#error-text');
  const newResearchBtn  = $('#new-research-btn');
  const toggleSourcesBtn = $('#toggle-sources-btn');
  const sourcesSidebar  = $('#sources-sidebar');
  const sidebarList     = $('#sidebar-sources-list');
  const sidebarCount    = $('#sidebar-source-count');
  const liveSourcesSection = $('#live-sources');

  // Step elements
  const steps = {
    plan:     $('#step-plan'),
    search:   $('#step-search'),
    scrape:   $('#step-scrape'),
    write:    $('#step-write'),
    critique: $('#step-critique'),
  };
  const stepDetails = {
    plan:     $('#step-plan-detail'),
    search:   $('#step-search-detail'),
    scrape:   $('#step-scrape-detail'),
    write:    $('#step-write-detail'),
    critique: $('#step-critique-detail'),
  };

  // ---- State ----
  let sourceCounter  = 0;
  let scrapedCounter = 0;
  let abortController = null;

  // ---- Helpers ----
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
    if (score >= 0.5)  return 'medium';
    return 'low';
  }

  function setStepActive(key) {
    Object.values(steps).forEach((el) => {
      if (el) el.classList.remove('active');
    });
    if (steps[key]) steps[key].classList.add('active');
  }

  function setStepCompleted(key) {
    if (steps[key]) {
      steps[key].classList.remove('active');
      steps[key].classList.add('completed');
    }
  }

  function updateStatus(text) {
    if (statusText) statusText.textContent = text;
  }

  function show(el) { el?.classList.remove('hidden'); }
  function hide(el) { el?.classList.add('hidden'); }

  // ---- Configure marked.js ----
  function setupMarked() {
    if (typeof marked !== 'undefined') {
      marked.setOptions({
        gfm: true,
        breaks: true,
        headerIds: false,
        mangle: false,
      });
    }
  }

  function renderMarkdown(text) {
    if (typeof marked !== 'undefined') {
      return marked.parse(text);
    }
    // Fallback: wrap in <pre>
    const div = document.createElement('div');
    div.textContent = text;
    return `<pre style="white-space:pre-wrap">${div.innerHTML}</pre>`;
  }

  // ---- Source Card ----
  function addSourceCard(data) {
    sourceCounter++;
    if (sourcesCount) sourcesCount.textContent = sourceCounter;
    if (sidebarCount) sidebarCount.textContent = sourceCounter;

    const domain = extractDomain(data.url);
    const sc = scoreClass(data.score);
    const scorePercent = Math.round((data.score || 0) * 100);

    // Grid card
    const card = document.createElement('a');
    card.className = 'source-card';
    card.href = data.url;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    card.style.animationDelay = `${Math.min(sourceCounter * 0.05, 0.6)}s`;
    card.innerHTML = `
      <div class="source-card-top">
        <span class="source-card-title">${escapeHtml(data.title || domain)}</span>
        <span class="source-score ${sc}">${scorePercent}%</span>
      </div>
      <div class="source-card-domain">
        <img class="favicon" src="https://www.google.com/s2/favicons?sz=32&domain=${domain}" alt="" width="14" height="14" loading="lazy" />
        <span>${escapeHtml(domain)}</span>
      </div>
    `;
    sourcesGrid?.appendChild(card);

    // Sidebar item
    const sideItem = document.createElement('a');
    sideItem.className = 'sidebar-source-item';
    sideItem.href = data.url;
    sideItem.target = '_blank';
    sideItem.rel = 'noopener noreferrer';
    sideItem.innerHTML = `
      <span class="sidebar-source-title">${escapeHtml(data.title || domain)}</span>
      <span class="sidebar-source-url">${escapeHtml(domain)}</span>
    `;
    sidebarList?.appendChild(sideItem);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---- SSE Stream via Fetch ----
  async function startResearch(topic) {
    // Reset UI
    resetDashboard();
    topicTitle.textContent = topic;
    hide(hero);
    show(dashboard);
    updateStatus('Planning research strategy...');
    setStepActive('plan');
    if (stepDetails.plan) stepDetails.plan.textContent = 'Analyzing topic...';

    abortController = new AbortController();

    try {
      const response = await fetch('/api/v1/research/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
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
              // Non-JSON data line, ignore
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim().startsWith('data: ')) {
        try {
          const event = JSON.parse(buffer.trim().slice(6));
          handleEvent(event);
        } catch (e) { /* ignore */ }
      }

    } catch (err) {
      if (err.name !== 'AbortError') {
        showError(err.message || 'An unexpected error occurred.');
      }
    }
  }

  // ---- Event Handler ----
  function handleEvent(event) {
    switch (event.type) {
      case 'planning':
        setStepActive('plan');
        updateStatus(event.message || 'Planning research strategy...');
        if (stepDetails.plan) stepDetails.plan.textContent = event.message || 'Analyzing...';
        break;

      case 'plan_ready':
        setStepCompleted('plan');
        if (stepDetails.plan) {
          const n = event.subqueries?.length || 0;
          stepDetails.plan.textContent = `${n} sub-queries • ${event.complexity || 'standard'} complexity`;
        }
        setStepActive('search');
        updateStatus('Searching the web...');
        if (stepDetails.search) stepDetails.search.textContent = 'Starting searches...';
        break;

      case 'searching':
        setStepActive('search');
        updateStatus(`Searching: "${event.query}"`);
        if (stepDetails.search) {
          stepDetails.search.textContent = `Query ${event.index}/${event.total}: ${event.query}`;
        }
        break;

      case 'source':
        addSourceCard(event);
        break;

      case 'scraping':
        if (steps.search && !steps.search.classList.contains('completed')) {
          setStepCompleted('search');
          if (stepDetails.search) stepDetails.search.textContent = 'All queries completed';
        }
        setStepActive('scrape');
        updateStatus(`Scraping sources... (${event.index}/${event.total})`);
        if (stepDetails.scrape) {
          stepDetails.scrape.textContent = `Page ${event.index}/${event.total}: ${extractDomain(event.url)}`;
        }
        break;

      case 'scraped':
        scrapedCounter++;
        if (scrapedCount) scrapedCount.textContent = scrapedCounter;
        break;

      case 'writing':
        if (steps.scrape && !steps.scrape.classList.contains('completed')) {
          setStepCompleted('scrape');
          if (stepDetails.scrape) stepDetails.scrape.textContent = `${scrapedCounter} pages analyzed`;
        }
        setStepActive('write');
        updateStatus(event.message || 'Writing report...');
        if (stepDetails.write) stepDetails.write.textContent = event.message || 'Generating...';
        break;

      case 'critiquing':
        if (steps.write && !steps.write.classList.contains('completed')) {
          setStepCompleted('write');
          if (stepDetails.write) stepDetails.write.textContent = 'Report generated';
        }
        setStepActive('critique');
        updateStatus(event.message || 'Evaluating quality...');
        if (stepDetails.critique) stepDetails.critique.textContent = event.message || 'Analyzing...';
        break;

      case 'report':
        show(reportSection);
        if (reportContent) {
          reportContent.innerHTML = renderMarkdown(event.content || '');
        }
        // Smooth scroll to report
        setTimeout(() => {
          reportSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
        break;

      case 'feedback':
        show(feedbackSection);
        if (feedbackContent) {
          feedbackContent.innerHTML = renderMarkdown(event.content || '');
        }
        break;

      case 'done':
        setStepCompleted('critique');
        if (stepDetails.critique) stepDetails.critique.textContent = 'Evaluation complete';
        updateStatus('Research complete');
        if (pulseDot) pulseDot.classList.add('done');
        show(completionBanner);
        if (completionStats) {
          const mins = event.total_time ? Math.round(event.total_time) : '?';
          completionStats.textContent =
            `Completed in ${mins}s · ${event.total_sources || sourceCounter} sources found · ${event.total_scraped || scrapedCounter} pages analyzed`;
        }
        break;

      case 'error':
        showError(event.message || 'An error occurred during research.');
        break;

      default:
        // Unknown event type, silently ignore
        break;
    }
  }

  // ---- Error ----
  function showError(msg) {
    show(errorBanner);
    if (errorText) errorText.textContent = msg;
    updateStatus('Error');
    if (pulseDot) {
      pulseDot.style.background = 'var(--red)';
      pulseDot.style.animation = 'none';
    }
  }

  // ---- Reset ----
  function resetDashboard() {
    sourceCounter = 0;
    scrapedCounter = 0;

    if (sourcesCount)  sourcesCount.textContent  = '0';
    if (scrapedCount)  scrapedCount.textContent  = '0';
    if (sidebarCount)  sidebarCount.textContent  = '0';
    if (sourcesGrid)   sourcesGrid.innerHTML     = '';
    if (sidebarList)   sidebarList.innerHTML      = '';
    if (reportContent) reportContent.innerHTML    = '';
    if (feedbackContent) feedbackContent.innerHTML = '';

    hide(reportSection);
    hide(feedbackSection);
    hide(completionBanner);
    hide(errorBanner);

    // Reset steps
    Object.values(steps).forEach((el) => {
      if (el) {
        el.classList.remove('active', 'completed');
      }
    });
    Object.values(stepDetails).forEach((el) => {
      if (el) el.textContent = 'Waiting...';
    });

    // Reset pulse dot
    if (pulseDot) {
      pulseDot.classList.remove('done');
      pulseDot.style.background = '';
      pulseDot.style.animation = '';
    }
  }

  function resetToHero() {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    resetDashboard();
    hide(dashboard);
    show(hero);
    searchInput.value = '';
    searchInput.focus();
  }

  // ---- Event Listeners ----
  searchForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const topic = searchInput?.value.trim();
    if (!topic) return;
    setupMarked();
    startResearch(topic);
  });

  newResearchBtn?.addEventListener('click', resetToHero);

  toggleSourcesBtn?.addEventListener('click', () => {
    sourcesSidebar?.classList.toggle('collapsed');
    // On mobile, toggle the mobile-open class
    if (window.innerWidth <= 1024) {
      sourcesSidebar?.classList.toggle('mobile-open');
    }
  });

  // Hint chips
  $$('.hint').forEach((el) => {
    el.addEventListener('click', () => {
      const topic = el.dataset.topic;
      if (topic && searchInput) {
        searchInput.value = topic;
        searchInput.focus();
      }
    });
  });

  // Keyboard shortcut: Ctrl+K to focus search
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (!dashboard.classList.contains('hidden')) {
        resetToHero();
      } else {
        searchInput?.focus();
      }
    }
  });

  // ---- Theme Toggle ----
  function getPreferredTheme() {
    const stored = localStorage.getItem('asklumen-theme');
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('asklumen-theme', theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    setTheme(current === 'dark' ? 'light' : 'dark');
  }

  // Apply saved theme immediately
  setTheme(getPreferredTheme());

  // Bind both toggle buttons
  const themeToggleHero = $('#theme-toggle-hero');
  const themeToggleDash = $('#theme-toggle-dash');
  themeToggleHero?.addEventListener('click', toggleTheme);
  themeToggleDash?.addEventListener('click', toggleTheme);

  // Respect OS preference changes
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
    if (!localStorage.getItem('asklumen-theme')) {
      setTheme(e.matches ? 'light' : 'dark');
    }
  });

  // ---- Init ----
  setupMarked();

})();
