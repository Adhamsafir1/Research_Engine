import asyncio
import json
import time
import uuid
import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from pipeline import run_research_pipeline

# =========================================
# FASTAPI CONFIG
# =========================================

app = FastAPI(
    title="AskLumen Research API",
    description="AI-native deep research engine with real-time streaming",
    version="3.0.0"
)

# =========================================
# CORS CONFIG
# =========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================
# STATIC FILES (Premium Web UI)
# =========================================

static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

# =========================================
# REQUEST SCHEMA
# =========================================

class ResearchRequest(BaseModel):
    topic: str = Field(
        ...,
        min_length=3,
        max_length=500,
        description="Research topic to investigate"
    )

# =========================================
# SERVE WEB UI
# =========================================

@app.get("/")
async def serve_ui():
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {
        "service": "AskLumen Research API",
        "status": "running",
        "version": "3.0.0",
        "ui": "Visit /static/index.html or add static files to backend/static/",
        "docs": "/docs"
    }

# =========================================
# HEALTH CHECK
# =========================================

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "AskLumen Research API",
        "version": "3.0.0",
        "pipeline": "active",
    }

# =========================================
# SSE STREAMING RESEARCH ENDPOINT
# =========================================

@app.post("/api/v1/research/stream")
async def stream_research(request: ResearchRequest):
    """
    Execute deep research pipeline with real-time Server-Sent Events (SSE).
    Each step emits events so the frontend can show live progress.
    """

    topic = request.topic.strip()
    if not topic:
        raise HTTPException(status_code=400, detail="Topic cannot be empty.")

    queue = asyncio.Queue()

    def on_event(event_type, data):
        """Callback invoked by the pipeline to push SSE events."""
        event = {"type": event_type, **data}
        queue.put_nowait(event)

    async def run_pipeline():
        """Run the blocking pipeline in a background thread."""
        try:
            result = await asyncio.to_thread(
                run_research_pipeline, topic, on_event
            )
            # Push final state for the non-streaming fallback
            queue.put_nowait({"type": "_result", "data": result})
        except Exception as e:
            queue.put_nowait({"type": "error", "message": str(e)})
        finally:
            # Sentinel to signal stream end
            queue.put_nowait(None)

    # Start pipeline in background
    asyncio.create_task(run_pipeline())

    async def event_generator():
        """Yield SSE-formatted events from the queue."""
        while True:
            event = await queue.get()
            if event is None:
                break
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )

# =========================================
# STANDARD (NON-STREAMING) RESEARCH ENDPOINT
# =========================================

@app.post("/api/v1/research")
async def start_research(request: ResearchRequest):
    """
    Execute complete research pipeline (non-streaming).
    Returns full result when done.
    """

    request_id = str(uuid.uuid4())[:8]
    api_start = time.time()

    try:
        topic = request.topic.strip()

        if not topic:
            raise HTTPException(
                status_code=400,
                detail="Research topic cannot be empty."
            )

        result = await asyncio.to_thread(
            run_research_pipeline, topic
        )

        if result.get("status") == "failed":
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "Pipeline failed.")
            )

        api_time = round(time.time() - api_start, 2)

        return {
            "status": "success",
            "request_id": request_id,
            "topic": topic,
            "report": result.get("report", ""),
            "feedback": result.get("feedback", ""),
            "query_plan": result.get("query_plan", {}),
            "logs": result.get("logs", []),
            "metadata": {
                **result.get("metadata", {}),
                "api_execution_time": api_time
            }
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "message": "Internal server error",
                "request_id": request_id,
                "error": str(e)
            }
        )