try:
    import webrtcvad
except ImportError:
    webrtcvad = None

import numpy as np

class VoiceActivityDetector:
    def __init__(self, sample_rate=16000, aggressiveness=3):
        self.sample_rate = sample_rate
        self.vad = webrtcvad.Vad(aggressiveness) if webrtcvad else None

    def is_speech(self, audio_frame: bytes) -> bool:
        """
        Check if the audio frame contains speech.
        Frame must be 10, 20, or 30 ms long.
        """
        if self.vad is not None:
            try:
                return self.vad.is_speech(audio_frame, self.sample_rate)
            except Exception:
                return False

        if not audio_frame:
            return False

        try:
            pcm = np.frombuffer(audio_frame, dtype=np.int16)
            energy = np.mean(pcm.astype(np.float32) ** 2) / (32767.0 ** 2)
            return energy > 1e-4
        except Exception:
            return False
