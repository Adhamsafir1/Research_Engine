import asyncio
import json
import time
import uuid
import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from backend.pipeline import run_research_pipeline
from backend.AAgents import chat_chain
from backend.voice.webrtc_server import router as voice_router
from backend.voice.vapi_router import router as vapi_router
from langchain_core.messages import HumanMessage, AIMessage

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
# VOICE WEBSOCKET ROUTER
# =========================================

app.include_router(voice_router)

# =========================================
# VAPI ROUTER
# =========================================
app.include_router(vapi_router, prefix="/vapi", tags=["vapi"])

# =========================================
# STATIC FILES (Premium Web UI)
# =========================================

static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")
    
    # Vite places assets in a subfolder called "assets"
    assets_dir = os.path.join(static_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

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
    mode: str = "deepresearch"

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    report: str
    history: list[ChatMessage] = []

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
# TEXT-TO-SPEECH ENDPOINT
# =========================================

class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, description="Text to synthesize")

@app.post("/api/v1/voice/tts")
async def text_to_speech(request: TTSRequest):
    """Synthesize text to speech audio using Deepgram TTS."""
    try:
        from backend.voice.tts import TextToSpeech
        tts = TextToSpeech()
        audio_bytes = await asyncio.to_thread(tts.synthesize, request.text)
        if not audio_bytes or audio_bytes == b"MOCK_AUDIO_BYTES":
            raise HTTPException(status_code=503, detail="TTS service unavailable. Check DEEPGRAM_API_KEY.")
        return Response(content=audio_bytes, media_type="audio/wav")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS failed: {str(e)}")

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
                run_research_pipeline, topic, request.mode, on_event
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
            run_research_pipeline, topic, request.mode
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

# =========================================
# FOLLOW-UP CHAT ENDPOINTS
# =========================================

@app.post("/api/v1/research/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Non-streaming endpoint for follow-up conversation.
    """
    try:
        history = []
        for msg in request.history:
            if msg.role == "user":
                history.append(HumanMessage(content=msg.content))
            else:
                history.append(AIMessage(content=msg.content))
                
        response = chat_chain.invoke({
            "message": request.message,
            "report": request.report,
            "history": history
        })
        
        return {"reply": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/research/chat/stream")
async def stream_chat(request: ChatRequest):
    """
    Streaming endpoint for follow-up conversation.
    """
    try:
        history = []
        for msg in request.history:
            if msg.role == "user":
                history.append(HumanMessage(content=msg.content))
            else:
                history.append(AIMessage(content=msg.content))
                
        async def event_generator():
            try:
                for chunk in chat_chain.stream({
                    "message": request.message,
                    "report": request.report,
                    "history": history
                }):
                    event = {"type": "token", "content": chunk}
                    yield f"data: {json.dumps(event)}\n\n"
                    
                yield f"data: {json.dumps({'type': 'done'})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))