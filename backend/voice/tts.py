import os
from typing import Iterator

from .deepgram_client import DeepgramClient

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")

class TextToSpeech:
    def __init__(self, provider: str = "deepgram"):
        self.provider = provider
        self.use_deepgram = provider == "deepgram" and bool(DEEPGRAM_API_KEY)
        if self.use_deepgram:
            self.client = DeepgramClient()

    def synthesize(self, text: str) -> bytes:
        """
        Synthesize text to speech bytes.
        """
        if self.use_deepgram:
            return self.client.synthesize_text(text)

        if self.provider == "elevenlabs" and ELEVENLABS_API_KEY:
            try:
                from elevenlabs import generate, set_api_key
                set_api_key(ELEVENLABS_API_KEY)
                audio = generate(text=text, voice="Rachel", model="eleven_monolingual_v1")
                return audio
            except Exception as e:
                print(f"TTS Error: {e}")
                return b""

        # Fallback mock audio
        return b"MOCK_AUDIO_BYTES"

    def synthesize_stream(self, text: str) -> Iterator[bytes]:
        """
        Stream synthesized audio.
        """
        if self.use_deepgram:
            yield from self.client.synthesize_text_stream(text)
            return

        if self.provider == "elevenlabs" and ELEVENLABS_API_KEY:
            try:
                from elevenlabs import generate, set_api_key
                set_api_key(ELEVENLABS_API_KEY)
                audio_stream = generate(text=text, voice="Rachel", stream=True)
                for chunk in audio_stream:
                    yield chunk
            except Exception as e:
                print(f"TTS Streaming Error: {e}")
                return

        yield b"MOCK_AUDIO_STREAM_CHUNK"
