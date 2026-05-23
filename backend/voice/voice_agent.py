"""
Voice agent module for two-way LLM conversation.
Uses Gemini for conversation and Deepgram for STT/TTS.
"""

import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

SYSTEM_INSTRUCTION = """You are AskLumen, a helpful AI research assistant. 
You are having a voice conversation with a user. Keep your responses concise and natural — 
typically 2-4 sentences unless the user asks for detail. Be warm, knowledgeable, and engaging.
If the user asks you to research something in depth, suggest they use the text research 
feature for a comprehensive report."""


class VoiceAgent:
    """Manages a multi-turn voice conversation with Gemini."""

    def __init__(self):
        if not GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is required for voice agent.")

        genai.configure(api_key=GEMINI_API_KEY)
        self.model = genai.GenerativeModel(
            model_name=GEMINI_MODEL,
            system_instruction=SYSTEM_INSTRUCTION,
        )
        self.chat = self.model.start_chat(history=[])

    def respond(self, user_message: str) -> str:
        """Send a message to the LLM and get a response."""
        try:
            response = self.chat.send_message(user_message)
            return response.text.strip()
        except Exception as e:
            return f"I'm sorry, I encountered an error: {str(e)}"
