# AskLumen — AI Multi-Agent Research Engine

An autonomous **multi-agent AI research system** that performs end-to-end topic exploration by combining **web search, content extraction, research synthesis, and self-critique** into a structured research workflow with a premium real-time UI. 

Additionally, the Research Engine features a **Real-Time WebRTC Voice Agent** (Lumen Voice), allowing users to have conversational interactions with specific AI personas (like a Tutor or Researcher) using 3D Holographic or 2D avatars.

Unlike traditional chatbots, this system uses a **modular agent-based architecture** where independent AI agents collaborate to retrieve reliable information, generate evidence-backed reports, and evaluate output quality — all streamed to a beautiful glassmorphic dashboard in real time.

---

## Features

### 1. Autonomous Multi-Agent Pipeline

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

### 2. Real-Time Streaming Dashboard
- Server-Sent Events (SSE) stream every pipeline step to the UI in real time
- Live progress indicators for each agent stage
- Discovered sources appear as interactive cards with relevance scores
- Markdown-rendered research report with quality evaluation

### 3. Voice Agent (Lumen Voice)
- Real-time WebRTC audio streaming powered by Vapi and Daily.co.
- **Dual Avatars:** 
  - **3D Hologram:** Built with React Three Fiber, pulses and rotates reacting dynamically to speech volume.
  - **2D Voice Avatar:** Sleek animated CSS avatar with speaking and blinking animations.
- **Multiple Personas:** Easily switch between different AI personalities (e.g., Tutor, Researcher).
- Live subtitles tracking the AI and User's transcription.
- Seamlessly integrated URL routing (`/voice-agent`).

### 4. Premium Glassmorphic UI
- Dark / Light theme toggle with system preference detection
- Ambient animated background orbs
- Smooth micro-animations and hover effects
- Fully responsive layout with collapsible sources sidebar built purely with standard CSS classes.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 (Vite), React Router, React Three Fiber, Framer Motion |
| **Backend** | Python, FastAPI, Uvicorn |
| **Voice / WebRTC** | Vapi SDK (`@vapi-ai/web`), ElevenLabs, OpenAI |
| **AI/LLM** | Mistral AI, LangChain |
| **Search** | Tavily Search API |
| **Scraping** | BeautifulSoup, Requests |
| **Styling** | Vanilla CSS (glassmorphism, CSS custom properties) |

---

## Run Locally

### Prerequisites

- Python 3.11+
- Node.js 18+ & npm
- Accounts/Keys for: Mistral, Tavily, and Vapi.ai

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

You must create **two separate `.env` files** for this project to work properly: one for the backend and one for the frontend.

**1. Backend `.env`** (Create this file at `D:\Research Engine\Research_Engine\.env`)
This file stores the secret keys used by the Python backend for the research agents, voice features, and databases.

```env
# ==========================================
# REQUIRED CORE APIS
# ==========================================
# Main researcher LLM provider
MISTRAL_API_KEY=your_mistral_key

# Web search tool
TAVILY_API_KEY=your_tavily_key

# ==========================================
# OPTIONAL MULTIMODAL & VOICE APIS
# ==========================================
# For native WebRTC / Voice Agent endpoints
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-2.0-flash

# For native Text-to-Speech / Speech-to-Text
DEEPGRAM_API_KEY=your_deepgram_key
ELEVENLABS_API_KEY=your_elevenlabs_key

# Additional LLMs for specialized agents
OPENAI_API_KEY=your_openai_key       # (Prompt Engineer agent)
CLAUDE_API_KEY=your_claude_key       # (Academic Retriever agent)

# ==========================================
# DATABASES & INFRASTRUCTURE (Optional)
# ==========================================
POSTGRES_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/research
REDIS_URL=redis://localhost:6379/0
VECTOR_STORE=qdrant                  # Or chroma
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_qdrant_key
VECTOR_DIM=1536
```

**2. Frontend `.env`** (Create this file at `D:\Research Engine\Research_Engine\frontend\.env`)
This file stores the public keys used by the React frontend to initialize the WebRTC voice connection.
```env
# Required for the Voice Agent
VITE_VAPI_PUBLIC_KEY=your_vapi_public_key
```
*(You can get your Vapi public key from the [Vapi Dashboard](https://dashboard.vapi.ai). Note: Ensure you also have your desired LLM and Voice providers (e.g., Google/OpenAI, ElevenLabs) configured securely in your Vapi provider settings dashboard, as the Voice Agent relies on those to respond).*

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
- You can access the Voice Agent by clicking the Microphone button on the Hero screen, or by directly navigating to `http://localhost:5173/voice-agent`.

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

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Serves the web UI |
| `GET` | `/health` | Health check |
| `POST` | `/api/v1/research/stream` | SSE streaming research (used by the UI) |
| `POST` | `/api/v1/research` | Non-streaming research (returns full result) |
| `POST` | `/vapi/sessions/start` | Logs the start of a Voice Agent session |
| `PUT` | `/vapi/sessions/end` | Logs the end and duration of a Voice Agent session |
| `POST` | `/vapi/messages` | Tracks transcripts from the Voice Agent session |
| `GET` | `/docs` | Swagger API documentation |

---

## Architecture Roadmap

This repository is being upgraded into a multimodal research engine. See [ARCHITECTURE_PLAN.md](ARCHITECTURE_PLAN.md) for the full roadmap including:

1. Real-time voice pipeline with STT/TTS and VAD support *(implemented via Vapi)*
2. Academic retrieval and document parsing for PDFs and images
3. Vector database memory for embeddings and retrieval
4. Multi-LLM provider support
5. Citation-based responses and PDF report generation

---

## License

This project is for educational and research purposes.
