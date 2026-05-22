# Multimodal Research Engine Architecture Plan

## Goal
Implement the full multimodal research architecture described in the project proposal, including:
- Robust backend API services
- Voice pipeline with real-time audio support
- Academic and deep research agent layers
- Document and image parsing for multimodal inputs
- Proper database & vector store foundation
- Dockerized deployment for reproducible development and testing

## Proposed Branch Name
- `feature/multimodal-research-v2`
- Alternative: `feature/full-architecture-v2`

## Architecture Components

### 1. Infrastructure & Dockerization
- `docker-compose.yml` defines services:
  - `backend` (FastAPI)
  - `frontend` (Streamlit or future Next.js)
  - `redis` (session cache / audio cache)
  - `postgres` (long-term memory / metadata storage)
  - `chromadb` or `qdrant` (vector database)
- Add service-specific Dockerfiles:
  - `backend/Dockerfile`
  - `frontend/Dockerfile`

### 2. Database & Memory Layer
- `backend/database/redis_client.py`
  - Low-latency user session state
  - Audio chunk cache for voice pipelines
- `backend/database/postgres_client.py`
  - Persistent memory for research sessions, extracted document metadata, user profiles
- `backend/database/vector_db.py`
  - Embeddings store for chunked academic text and retrieval
  - Support Chroma and Qdrant integration

### 3. Voice Pipeline
- `backend/voice/vad.py`
  - Voice activity detection
- `backend/voice/stt.py`
  - Speech-to-text using Whisper or Whisper API
- `backend/voice/tts.py`
  - Text-to-speech using ElevenLabs/Cartesia or provider of choice
- `backend/voice/webrtc_server.py`
  - WebRTC endpoint for real-time streaming from frontend

### 4. Multimodal Parser & Prompt Engineering
- `backend/multimodal/document_parser.py`
  - PDF upload parsing, OCR, and chunking
- `backend/agents/prompt_engineer.py`
  - Prompt conditioning for DALL-E 3 image generation, TTS, and vision prompts

### 5. Deep Research & Academic Pipeline
- `backend/agents/deep_research_agent.py`
  - Add dynamic scraping support via Playwright or Selenium
  - Add cross-encoder re-ranking of candidate passages
- `backend/agents/academic_retriever.py`
  - Specialized academic APIs (Semantic Scholar, arXiv, PubMed, Google Scholar via SerpApi)
  - Claude Opus 3 academic parsing and flashcard generation
- `backend/agents/evaluator_agent.py`
  - Stronger report evaluation with multiple hallucination checks and citation scoring

### 6. Frontend Upgrades
- `frontend/app.py`
  - Voice interaction UI
  - PDF / image upload interface
  - Markdown report with sources and flashcards
  - Optional generated media preview for images/3D

## Open Questions for Review

### Voice Pipeline Integration
- `streamlit-webrtc` can provide an MVP voice experience inside Streamlit.
- For better streaming/low-latency UX, migrating the frontend to Next.js/React is recommended.
- Recommendation: keep Streamlit for MVP, plan a gradual migration to Next.js/React for production-grade voice streaming.

### Model Providers
- Current implementation path:
  - Voice: `Deepgram` for STT/TTS
  - Audio transport: `LiveKit` for real-time streaming
  - LLM: `Gemini` / `Groq` for core reasoning and research orchestration
- Current available keys in `.env`:
  - `MISTRAL_API_KEY`, `TAVILY_API_KEY`, `LIVEKIT_*`, `DEEPGRAM_*`, `GEMINI_API_KEY`, `GOOGLE_API_KEY`, `GROQ_API_KEY`
- Future provider integrations:
  - `Claude Opus 3`
  - `DALL-E 3 / OpenAI`
  - `ElevenLabs / Cartesia`

### Database Stack
- Recommended stack:
  - Redis for session / audio cache
  - PostgreSQL for structured long-term memory
  - Chroma for rapid local vector storage, or Qdrant for production-grade scalable retrieval
- Preference needed: `Chroma` vs `Qdrant`.

### Branch Strategy
- Proposed branch: `feature/multimodal-research-v2`
- Use feature branch for architecture work and keep existing code in `main` stable.

## Verification Plan

### Automated Tests
- Pytest suites for:
  - Redis connection and cache operations
  - PostgreSQL client connectivity and schema checks
  - Vector DB client initialization and basic embeddings insert/query
  - Voice pipeline routing with mocked STT/TTS

### Manual Verification
- `docker-compose up` end-to-end stack
- Voice query flow: record → transcribe → research pipeline → TTS output
- Upload academic PDF → parse → generate glossary/flashcards/markdown

## Immediate Next Steps
1. Confirm tooling preferences:
   - TTS provider
   - Vector DB
   - Frontend strategy (Streamlit vs Next.js)
2. Create feature branch and scaffold new modules
3. Wire up backend services, database clients, voice endpoints, and multimodal parser
4. Add end-to-end orchestration in `backend/pipeline.py`
5. Test locally with Docker and validate the current `streamlit` / `torchvision` environment issues
