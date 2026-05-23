"""
Voice endpoints for AskLumen.

1. POST /api/v1/voice/stt — Simple STT: accepts audio blob, returns transcription text.
2. WS /ws/voice-agent — Two-way voice agent: STT → LLM → TTS conversation loop.
"""

import io
import json
import wave
import asyncio
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.responses import JSONResponse

router = APIRouter()


# =========================================
# SIMPLE STT ENDPOINT (for search bar mic)
# =========================================

@router.post("/api/v1/voice/stt")
async def speech_to_text(audio: UploadFile = File(...)):
    """Transcribe an uploaded audio file using Deepgram."""
    try:
        from .deepgram_client import DeepgramClient
        client = DeepgramClient()

        audio_bytes = await audio.read()

        # Deepgram accepts raw audio in many formats (webm, wav, mp3, etc.)
        import requests
        url = f"{client._headers.__func__.__qualname__}"  # won't use this
        url = f"https://api.deepgram.com/v1/listen?model={client.stt_model}&smart_format=true"
        headers = {
            "Authorization": f"Token {client.api_key}",
            "Content-Type": audio.content_type or "audio/webm",
        }

        response = await asyncio.to_thread(
            requests.post, url, headers=headers, data=audio_bytes, timeout=30
        )
        response.raise_for_status()
        result = response.json()

        transcript = (
            result.get("results", {})
            .get("channels", [{}])[0]
            .get("alternatives", [{}])[0]
            .get("transcript", "")
        )

        return JSONResponse({"text": transcript.strip()})

    except Exception as e:
        return JSONResponse({"text": "", "error": str(e)}, status_code=500)


# =========================================
# TWO-WAY VOICE AGENT WEBSOCKET
# =========================================

@router.websocket("/ws/voice-agent")
async def voice_agent_websocket(websocket: WebSocket):
    """
    Two-way voice conversation WebSocket.

    Protocol:
    - Client sends JSON: { "type": "audio", "data": "<base64 audio>" }
    - Client sends JSON: { "type": "text", "text": "..." } (optional text input)
    - Server responds: { "type": "transcription", "text": "..." }
    - Server responds: { "type": "response", "text": "...", "audio": "<base64>" }
    - Server responds: { "type": "status", "status": "listening"|"thinking"|"speaking" }
    """
    await websocket.accept()

    from .voice_agent import VoiceAgent
    from .deepgram_client import DeepgramClient

    try:
        agent = VoiceAgent()
        deepgram = DeepgramClient()
    except Exception as e:
        await websocket.send_json({"type": "error", "message": str(e)})
        await websocket.close()
        return

    await websocket.send_json({"type": "status", "status": "ready"})

    try:
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)

            if msg.get("type") == "audio":
                # Decode base64 audio
                import base64
                audio_bytes = base64.b64decode(msg["data"])

                await websocket.send_json({"type": "status", "status": "thinking"})

                # Transcribe with Deepgram (accepts webm/opus directly)
                import requests
                url = f"https://api.deepgram.com/v1/listen?model={deepgram.stt_model}&smart_format=true"
                headers = {
                    "Authorization": f"Token {deepgram.api_key}",
                    "Content-Type": msg.get("mimeType", "audio/webm"),
                }

                stt_response = await asyncio.to_thread(
                    requests.post, url, headers=headers, data=audio_bytes, timeout=30
                )
                stt_response.raise_for_status()
                result = stt_response.json()

                transcript = (
                    result.get("results", {})
                    .get("channels", [{}])[0]
                    .get("alternatives", [{}])[0]
                    .get("transcript", "")
                ).strip()

                if not transcript:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Could not understand audio. Please try again."
                    })
                    await websocket.send_json({"type": "status", "status": "listening"})
                    continue

                # Send transcription to client
                await websocket.send_json({"type": "transcription", "text": transcript})

                # Get LLM response
                llm_response = await asyncio.to_thread(agent.respond, transcript)

                # Synthesize TTS
                await websocket.send_json({"type": "status", "status": "speaking"})

                try:
                    tts_audio = await asyncio.to_thread(deepgram.synthesize_text, llm_response)
                    audio_b64 = base64.b64encode(tts_audio).decode("utf-8")

                    await websocket.send_json({
                        "type": "response",
                        "text": llm_response,
                        "audio": audio_b64,
                    })
                except Exception:
                    # TTS failed, send text only
                    await websocket.send_json({
                        "type": "response",
                        "text": llm_response,
                    })

                await websocket.send_json({"type": "status", "status": "listening"})

            elif msg.get("type") == "text":
                # Text-based input (fallback)
                text = msg.get("text", "").strip()
                if not text:
                    continue

                await websocket.send_json({"type": "status", "status": "thinking"})
                await websocket.send_json({"type": "transcription", "text": text})

                llm_response = await asyncio.to_thread(agent.respond, text)

                await websocket.send_json({"type": "status", "status": "speaking"})

                try:
                    import base64
                    tts_audio = await asyncio.to_thread(deepgram.synthesize_text, llm_response)
                    audio_b64 = base64.b64encode(tts_audio).decode("utf-8")
                    await websocket.send_json({
                        "type": "response",
                        "text": llm_response,
                        "audio": audio_b64,
                    })
                except Exception:
                    await websocket.send_json({
                        "type": "response",
                        "text": llm_response,
                    })

                await websocket.send_json({"type": "status", "status": "listening"})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
