from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import numpy as np

router = APIRouter()

# Note: In a real implementation with `aiortc`, you'd set up RTCPeerConnection.
# For simplicity with typical modern LLM architectures, WebSockets streaming raw audio is often used.
# If full WebRTC (SIP/RTP) is strictly required, aiortc would be used here.

@router.websocket("/ws/voice")
async def voice_websocket(websocket: WebSocket):
    await websocket.accept()
    # Initialize VAD, STT, TTS here
    from .vad import VoiceActivityDetector
    from .stt import SpeechToText
    from .tts import TextToSpeech
    
    vad = VoiceActivityDetector()
    stt = SpeechToText()
    tts = TextToSpeech()

    audio_buffer = []

    try:
        while True:
            data = await websocket.receive_bytes()
            # In a real app, you would chunk the data to 10-30ms for VAD
            is_speech = vad.is_speech(data)
            
            if is_speech:
                audio_buffer.append(data)
            elif audio_buffer:
                # Silence detected after speech, process buffer
                # Convert bytes to numpy array for Whisper
                audio_np = np.frombuffer(b"".join(audio_buffer), dtype=np.int16).astype(np.float32) / 32768.0
                transcription = stt.transcribe(audio_np)
                
                if transcription:
                    # Echo transcription to client
                    await websocket.send_json({"type": "transcription", "text": transcription})
                    
                    # (In a real app, send transcription to Agent here)
                    # For now, just generate TTS
                    audio_stream = tts.synthesize_stream(transcription)
                    for chunk in audio_stream:
                        await websocket.send_bytes(chunk)
                
                audio_buffer = []
                
    except WebSocketDisconnect:
        print("Client disconnected")
