import os
import numpy as np
from typing import Optional

from .deepgram_client import DeepgramClient

USE_DEEPGRAM = bool(os.getenv("DEEPGRAM_API_KEY"))

class SpeechToText:
    def __init__(self, model_name: str = "base"):
        self.use_deepgram = USE_DEEPGRAM
        if self.use_deepgram:
            self.client = DeepgramClient()
        else:
            import whisper
            self.model = whisper.load_model(model_name)

    def _normalize_audio(self, audio_data: np.ndarray) -> bytes:
        pcm16 = (audio_data * 32767).astype(np.int16)
        return pcm16.tobytes()

    def transcribe(self, audio_data: np.ndarray, sample_rate: int = 16000) -> str:
        """
        Transcribe audio data using Deepgram if configured, otherwise Whisper.
        audio_data should be a numpy array of floats (-1.0 to 1.0) at 16kHz.
        """
        if self.use_deepgram:
            audio_bytes = self._normalize_audio(audio_data)
            return self.client.transcribe_audio(audio_bytes, sample_rate=sample_rate)

        result = self.model.transcribe(audio_data, fp16=False)
        return result["text"].strip()
