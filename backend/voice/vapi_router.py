from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Optional, List, Dict
import datetime
import uuid

router = APIRouter()

# In-memory storage for simplicity, can be swapped for SQLite/PostgreSQL later
sessions = {}
messages = []

class VapiSessionStart(BaseModel):
    conversation_id: Optional[str] = None
    vapi_session_id: str

class VapiSessionEnd(BaseModel):
    vapi_session_id: str
    total_duration: float
    status: str

class VapiMessageCreate(BaseModel):
    conversation_id: Optional[str] = None
    vapi_session_id: str
    role: str
    content: str
    metadata: Optional[Dict] = None

class VapiBatchMessagesCreate(BaseModel):
    conversation_id: Optional[str] = None
    vapi_session_id: str
    messages: List[Dict]

@router.post("/sessions/start")
async def start_session(data: VapiSessionStart):
    sessions[data.vapi_session_id] = {
        "status": "active",
        "started_at": datetime.datetime.now().isoformat(),
        "duration": 0
    }
    return {"status": "success", "session": sessions[data.vapi_session_id]}

@router.put("/sessions/end")
async def end_session(data: VapiSessionEnd):
    if data.vapi_session_id in sessions:
        sessions[data.vapi_session_id].update({
            "status": data.status,
            "duration": data.total_duration,
            "ended_at": datetime.datetime.now().isoformat()
        })
    return {"status": "success", "message": "Session ended"}

@router.post("/messages")
async def add_message(data: VapiMessageCreate):
    msg = data.model_dump()
    msg["timestamp"] = datetime.datetime.now().isoformat()
    messages.append(msg)
    return {"status": "success"}

@router.post("/batch-messages")
async def add_batch_messages(data: VapiBatchMessagesCreate):
    for msg in data.messages:
        messages.append({
            "vapi_session_id": data.vapi_session_id,
            "role": msg.get("role"),
            "content": msg.get("content"),
            "timestamp": datetime.datetime.now().isoformat()
        })
    return {"status": "success"}

@router.get("/analytics")
async def get_analytics():
    return {
        "total_sessions": len(sessions),
        "total_messages": len(messages),
        "active_sessions": len([s for s in sessions.values() if s.get("status") == "active"])
    }
