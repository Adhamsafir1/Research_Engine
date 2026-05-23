# AskLumen — AI Multi-Agent Research Engine

An autonomous **multi-agent AI research system** that performs end-to-end topic exploration by combining **web search, content extraction, research synthesis, and self-critique** into a structured research workflow with a premium real-time UI.

Unlike traditional chatbots, this system uses a **modular agent-based architecture** where independent AI agents collaborate to retrieve reliable information, generate evidence-backed reports, and evaluate output quality — all streamed to a glassmorphic dashboard in real time.

---

## Features

### Autonomous Multi-Agent Pipeline

```
User Query → Planner Agent → Search Agent → Scraper Agent → Writer Agent → Critic Agent
```

| Agent | Role |
|-------|------|
| **Planner** | Decomposes a topic into targeted sub-queries with complexity assessment |
| **Search** | Retrieves trusted, relevant web sources via Tavily Search API |
| **Scraper** | Extracts clean webpage content with relevance scoring |
| **Writer** | Synthesizes structured, evidence-backed research reports |
| **Critic** | Evaluates quality, factual consistency, and hallucination risk |

### Real-Time Streaming Dashboard

- Server-Sent Events (SSE) stream every pipeline step to the UI in real time
- Live progress indicators for each agent stage
- Discovered sources appear as interactive cards with relevance scores
- Markdown-rendered research report with quality evaluation

### Premium Glassmorphic UI

- Dark / Light theme toggle with system preference detection
- Ambient animated background orbs
- Smooth micro-animations and hover effects
- Fully responsive layout with collapsible sources sidebar

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 (Vite), react-markdown |
| **Backend** | Python, FastAPI, Uvicorn |
| **AI/LLM** | Mistral AI, LangChain |
| **Search** | Tavily Search API |
| **Scraping** | BeautifulSoup, Requests |
| **Styling** | Vanilla CSS (glassmorphism, CSS custom properties) |
| **Fonts** | Inter (Google Fonts) |

---

## Project Structure

```
Research_Engine/
├── backend/                    # FastAPI backend
│   ├── main.py                 # App entry point, SSE + REST endpoints
│   ├── pipeline.py             # Research pipeline orchestrator
│   ├── ranking.py              # Source relevance scoring
│   ├── tools.py                # Web search & scraping tools
│   ├── agents/                 # Specialized AI agents
│   │   ├── academic_retriever.py
│   │   ├── evaluator_agent.py
│   │   └── prompt_engineer.py
│   ├── database/               # Database clients
│   │   ├── postgres_client.py
│   │   ├── redis_client.py
│   │   └── vector_db.py
│   ├── multimodal/             # Document parsing
│   │   └── document_parser.py
│   ├── voice/                  # Voice pipeline
│   │   ├── deepgram_client.py
│   │   ├── stt.py
│   │   ├── tts.py
│   │   ├── vad.py
│   │   └── webrtc_server.py
│   └── static/                 # Production build output (auto-generated)
│
├── frontend/                   # React (Vite) frontend
│   ├── index.html              # Entry HTML
│   ├── vite.config.js          # Vite config with API proxy & build output
│   ├── package.json
│   └── src/
│       ├── main.jsx            # React DOM entry
│       ├── App.jsx             # Root component with SSE logic
│       ├── index.css           # Full design system (glassmorphism, themes)
│       └── components/
│           ├── Hero.jsx        # Landing page with search bar
│           ├── Dashboard.jsx   # Research progress & report view
│           ├── SourceCard.jsx  # Source card & sidebar item
│           ├── ThemeToggle.jsx # Dark/Light theme switcher
│           └── Icons.jsx       # SVG icon components
│
├── docker-compose.yml          # Docker stack definition
├── requirements.txt            # Python dependencies
├── ARCHITECTURE_PLAN.md        # Multimodal architecture roadmap
└── .env                        # API keys (not committed)
```

---

## Run Locally

### Prerequisites

- Python 3.11+
- Node.js 18+ & npm

### 1. Clone & Setup Backend

```bash
git clone <your_repo_url>
cd Research_Engine
```

Create and activate a virtual environment:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```env
MISTRAL_API_KEY=your_mistral_key
TAVILY_API_KEY=your_tavily_key
```

### 3. Install Frontend Dependencies

```powershell
cd frontend
npm install
cd ..
```

### 4. Run in Development Mode

Open **two terminals** from the project root (`Research_Engine/`):

**Terminal 1 — Backend (FastAPI):**

```powershell
cd "D:\Research Engine\Research_Engine"
.\venv\Scripts\Activate.ps1
python -m uvicorn backend.main:app --reload --reload-dir backend
```

> Backend runs on `http://localhost:8000`

**Terminal 2 — Frontend (Vite dev server):**

```powershell
cd "D:\Research Engine\Research_Engine\frontend"
npm run dev
```

> Frontend runs on `http://localhost:5173` and proxies `/api/*` requests to the backend.

Open **http://localhost:5173** in your browser.

### 5. Build for Production

To compile the React app into the `backend/static/` directory so the backend serves everything:

```powershell
cd frontend
npm run build
```

Then run only the backend:

```powershell
cd "D:\Research Engine\Research_Engine"
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Open **http://localhost:8000** — the backend serves both the API and the built frontend.

---

## Run with Docker

1. Ensure your `.env` file exists with all required keys.

2. From the project root:

```powershell
cd "D:\Research Engine\Research_Engine"
docker compose up --build
```

3. Access the application:
   - Frontend: `http://localhost:8501` (if using Streamlit container) or `http://localhost:8000` (backend-served)
   - Backend API: `http://localhost:8000`
   - API Docs: `http://localhost:8000/docs`

4. Stop the stack:

```powershell
docker compose down
```

> **Note:** Redis, PostgreSQL, and vector DB services are launched inside Docker — no local installation needed.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Serves the web UI |
| `GET` | `/health` | Health check |
| `POST` | `/api/v1/research/stream` | SSE streaming research (used by the UI) |
| `POST` | `/api/v1/research` | Non-streaming research (returns full result) |
| `GET` | `/docs` | Swagger API documentation |

---

## Architecture Roadmap

This repository is being upgraded into a multimodal research engine. See [ARCHITECTURE_PLAN.md](ARCHITECTURE_PLAN.md) for the full roadmap including:

1. Real-time voice pipeline with STT/TTS and VAD support
2. Academic retrieval and document parsing for PDFs and images
3. Vector database memory for embeddings and retrieval
4. Multi-LLM provider support
5. Citation-based responses and PDF report generation

---

## License

This project is for educational and research purposes.
