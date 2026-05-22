# AI Multi-Agent Research Assistant

An autonomous **multi-agent AI research system** that performs end-to-end topic exploration by combining **web search, content extraction, research synthesis, and self-critique** into a structured research workflow.

Unlike traditional chatbots, this system uses a **modular agent-based architecture** where independent AI agents collaborate to retrieve reliable information, generate evidence-backed reports, and evaluate output quality.

The assistant works across **any domain or topic** (technology, science, business, healthcare, geopolitics, education, finance, etc.) and dynamically gathers live information from the web.

---

## Features

**Autonomous Multi-Agent Workflow**
Implements a modular research pipeline:

**Search Agent → Scraper Agent → Writer Agent → Critic Agent**

* **Search Agent** retrieves trusted and relevant web sources using Tavily Search API.
* **Scraper Agent** extracts clean webpage content from trusted domains.
* **Writer Agent** synthesizes structured, evidence-backed research reports.
* **Critic Agent** evaluates quality, factual consistency, and hallucination risk.

---

**Real-Time Web Intelligence**

* Live web search
* Trusted-source filtering
* Dynamic knowledge retrieval
* Multi-domain research support

---

**Structured Research Reports**
Automatically generates:

* Executive Summary
* Introduction
* Background
* Key Findings
* Counterarguments
* Risks & Challenges
* Future Outlook
* Conclusion
* Sources

---

**Self-Evaluation Loop**
Includes a built-in critique system that reviews:

* Research depth
* Report structure
* Reliability
* Completeness
* Hallucination risk

---

## System Architecture

```text
User Query
     ↓
Search Agent
     ↓
Trusted Web Sources
     ↓
Scraper Agent
     ↓
Clean Content Extraction
     ↓
Writer Agent
     ↓
Structured Research Report
     ↓
Critic Agent
     ↓
Quality Evaluation
```

---

## Tech Stack

**Core Technologies**

* Python
* LangChain
* Mistral AI
* Tavily Search API
* BeautifulSoup
* FastAPI
* Streamlit

**AI/LLM Concepts**

* Multi-Agent Systems
* Tool Calling
* Retrieval-Augmented Generation (RAG)
* Prompt Engineering
* Autonomous Workflows
* Agentic AI

---

## Key Engineering Highlights

* Built a **modular multi-agent architecture** for autonomous research workflows.
* Integrated **real-time web retrieval + content extraction** for evidence-backed responses.
* Designed **LLM-based report generation and critique loops** to improve output quality.
* Developed both **frontend (Streamlit)** and **backend API layer (FastAPI)**.
* Implemented **trusted source filtering**, retry mechanisms, and structured prompting for improved reliability.

---

## Future Improvements

* Multi-source parallel research
* Citation-based responses
* Vector database memory
* Research history persistence
* PDF report generation
* Multi-LLM provider support
* Deep Research Mode

---

## Run Locally

### Clone Repository

```bash
git clone <your_repo_url>
cd ai-multi-agent-research-assistant
```

### Create Virtual Environment

```bash
python -m venv venv
```

### Activate the Virtual Environment

On Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

On Windows Command Prompt:

```cmd
venv\Scripts\activate.bat
```

On macOS/Linux:

```bash
source venv/bin/activate
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Configure Environment Variables

Create a `.env` file:

```env
MISTRAL_API_KEY=your_api_key
TAVILY_API_KEY=your_api_key
```

### Run Streamlit App

From the `frontend` folder with the venv active:

```powershell
cd frontend
streamlit run app.py
```

Then open the old Streamlit UI at:

```text
http://localhost:8501
```

### Run FastAPI Backend

From the `backend` folder with the venv active:

```powershell
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Or from the repository root with the venv active:

```powershell
cd "D:\Research Engine\ResearchTopic"
.\venv\Scripts\uvicorn.exe backend.main:app --reload --host 0.0.0.0 --port 8000
```

Then open the premium UI at:

```text
http://localhost:8000
```

### Run with Docker

1. Ensure your `.env` file exists with all required keys:

```env
MISTRAL_API_KEY=...
TAVILY_API_KEY=...
DEEPGRAM_API_KEY=...
LIVEKIT_URL=...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
GEMINI_API_KEY=...
GOOGLE_API_KEY=...
GROQ_API_KEY=...
```

2. Make sure Docker Desktop or Docker Engine is running on your machine.

3. From the repository root, build and start all containers:

```powershell
cd "D:\Research Engine\ResearchTopic"
docker compose up --build
```

3. Wait for the services to start.

4. Open the frontend at:

```text
http://localhost:8501
```

5. The backend API will be available at:

```text
http://localhost:8000
```

6. To stop the stack, press `Ctrl+C` in the terminal running Docker, then run:

```powershell
docker compose down
```

### Notes

- Redis, PostgreSQL, Chroma, and Qdrant are all launched inside Docker, so you do not need those installed locally.
- The backend will connect to the Dockerized Redis/Postgres/Qdrant services automatically through the compose network.
- If you want to reset the database data, stop the containers and delete the volumes:

```powershell
docker compose down -v
```

---

## Proposed Architecture Roadmap

This repository is being upgraded into a multimodal research engine with the following priorities:

1. Dockerized backend, frontend, Redis, Postgres, and Chroma services.
2. Real-time voice pipeline with STT/TTS and VAD support.
3. Academic retrieval and document parsing for PDFs and images.
4. Vector database memory for embeddings and retrieval.
5. Stronger research orchestration through query planning, re-ranking, and evaluation.

Suggested branch: `feature/multimodal-research-v2`

> If you want, I can continue by wiring the new voice route into the frontend UI and building the first step of the document upload workflow.
