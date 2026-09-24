"""
SetuGov AI Service — Mock provider

Used when ``AI_PROVIDER=mock`` (the safe default), and available for local
development or smoke-testing the API shape with no external calls and no
API key. Returns clearly-labeled placeholder content — it never pretends to
be a real model's output.
"""

from __future__ import annotations

import asyncio
import json
from typing import Any, AsyncIterator, Optional

from providers.base import AIProvider, EmbeddingProvider


class MockProvider(AIProvider):
    """No network calls. Returns a clearly-labeled placeholder JSON object."""

    async def generate(
        self,
        prompt: str,
        system: Optional[str] = None,
        response_format: Optional[str] = "json",
    ) -> str:
        return json.dumps(
            {
                "_mock": True,
                "message": (
                    "No real AI provider is configured. Set AI_PROVIDER, "
                    "AI_BASE_URL, AI_API_KEY, and AI_MODEL to enable real "
                    "generation."
                ),
            }
        )

    async def generate_json(
        self,
        prompt: str,
        system: Optional[str] = None,
    ) -> dict[str, Any]:
        raw = await self.generate(prompt, system=system, response_format="json")
        return json.loads(raw)

    async def generate_stream(
        self,
        prompt: str,
        system: Optional[str] = None,
    ) -> AsyncIterator[str]:
        raw = await self.generate(prompt, system=system, response_format="json")
        # Yield in small pieces with brief delays to simulate token streaming
        chunk_size = 32
        for i in range(0, len(raw), chunk_size):
            yield raw[i : i + chunk_size]
            await asyncio.sleep(0.01)

    async def close(self) -> None:
        return None


class MockEmbeddingProvider(EmbeddingProvider):
    """
    No network calls. Returns deterministic, clearly-fake vectors of the
    configured dimension — stable per input text (same text -> same
    vector) so callers can exercise dimension/shape handling without a
    real embedding backend.
    """

    def __init__(self, dimension: int = 768) -> None:
        self.dimension = dimension

    async def embed(self, texts: list[str]) -> list[list[float]]:
        vectors: list[list[float]] = []
        for text in texts:
            seed = sum(ord(c) for c in text) or 1
            vectors.append([((seed * (i + 1)) % 1000) / 1000.0 for i in range(self.dimension)])
        return vectors

    async def close(self) -> None:
        return None
