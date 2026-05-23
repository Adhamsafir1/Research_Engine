import sys
import os

# Add the project root to sys.path so we can import backend modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from backend.voice.voice_agent import VoiceAgent
    print("VoiceAgent imported successfully!")
    agent = VoiceAgent()
    print("VoiceAgent constructed successfully!")
except Exception as e:
    print("Error importing/constructing VoiceAgent:")
    import traceback
    traceback.print_exc()

try:
    from backend.voice.deepgram_client import DeepgramClient
    print("DeepgramClient imported successfully!")
    dg = DeepgramClient()
    print("DeepgramClient constructed successfully!")
except Exception as e:
    print("Error importing/constructing DeepgramClient:")
    import traceback
    traceback.print_exc()
