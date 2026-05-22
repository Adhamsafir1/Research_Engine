import redis
import os
import json
from typing import Any, Optional

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

class RedisClient:
    def __init__(self):
        self.client = redis.from_url(REDIS_URL, decode_responses=True)

    def set_session_data(self, session_id: str, data: dict, expire_seconds: int = 3600):
        self.client.setex(session_id, expire_seconds, json.dumps(data))

    def get_session_data(self, session_id: str) -> Optional[dict]:
        data = self.client.get(session_id)
        return json.loads(data) if data else None

    def cache_audio_chunk(self, chunk_id: str, audio_data: bytes, expire_seconds: int = 60):
        # Decode responses is true, so we need a separate connection or cast for bytes
        # Using a fresh connection for bytes if needed, but for simplicity, we can use the same url
        pass

redis_client = RedisClient()
