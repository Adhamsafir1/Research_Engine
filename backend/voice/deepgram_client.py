import os
import io
import wave
import requests

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
DEEPGRAM_STT_MODEL = os.getenv("DEEPGRAM_STT_MODEL", "nova-2")
DEEPGRAM_TTS_MODEL = os.getenv("DEEPGRAM_TTS_MODEL", "aura-2-thalia-en")
DEEPGRAM_STT_BASE_URL = os.getenv("DEEPGRAM_STT_BASE_URL", "https://api.deepgram.com/v1/listen")
DEEPGRAM_TTS_BASE_URL = os.getenv("DEEPGRAM_TTS_BASE_URL", "https://api.deepgram.com/v1/speech")

class DeepgramClient:
    def __init__(self):
        if not DEEPGRAM_API_KEY:
            raise ValueError("DEEPGRAM_API_KEY is required for Deepgram voice integration.")
        self.api_key = DEEPGRAM_API_KEY
        self.stt_model = DEEPGRAM_STT_MODEL
        self.tts_model = DEEPGRAM_TTS_MODEL

    def _headers(self, content_type: str = "application/json") -> dict:
        return {
            "Authorization": f"Token {self.api_key}",
            "Content-Type": content_type,
        }

    def _build_wav(self, pcm_data: bytes, sample_rate: int = 16000, channels: int = 1, sample_width: int = 2) -> bytes:
        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wf:
            wf.setnchannels(channels)
            wf.setsampwidth(sample_width)
            wf.setframerate(sample_rate)
            wf.writeframes(pcm_data)
        return buffer.getvalue()

    def transcribe_audio(self, audio_bytes: bytes, sample_rate: int = 16000) -> str:
        wav_bytes = self._build_wav(audio_bytes, sample_rate=sample_rate)
        url = f"{DEEPGRAM_STT_BASE_URL}?model={self.stt_model}"
        response = requests.post(
            url,
            headers=self._headers("audio/wav"),
            data=wav_bytes,
            timeout=30,
        )
        response.raise_for_status()
        result = response.json()
        transcript = result.get("results", {}).get("channels", [{}])[0].get("alternatives", [{}])[0].get("transcript", "")
        return transcript.strip()

    def synthesize_text(self, text: str) -> bytes:
        url = f"{DEEPGRAM_TTS_BASE_URL}?voice={self.tts_model}&model={self.tts_model}"
        response = requests.post(
            url,
            headers={
                "Authorization": f"Token {self.api_key}",
                "Content-Type": "application/json",
                "Accept": "audio/wav",
            },
            json={"text": text},
            timeout=30,
        )
        response.raise_for_status()
        return response.content

    def synthesize_text_stream(self, text: str):
        audio_bytes = self.synthesize_text(text)
        yield audio_bytes
