"""
SetuGov AI Service — Provider Interface

The abstract contract every AI transport implements. ``AIService`` and every
brain-facing caller depend ONLY on this interface — never on a concrete
vendor client. Swapping the configured provider/model never requires
touching ``services/ai_service.py``, ``services/parsers/*``, or any prompt
module.

Contains no business logic, no prompts, no scoring, no domain knowledge —
pure transport contract + shared parsing utilities.
"""

from __future__ import annotations

import json
from abc import ABC, abstractmethod
from typing import Any, AsyncIterator, Optional


# ═══════════════════════════════════════════════════════════════════════════
# Exceptions
# ═══════════════════════════════════════════════════════════════════════════


class ProviderUnavailableError(Exception):
    """Raised when the configured AI provider cannot be reached."""


class ProviderTimeoutError(Exception):
    """Raised when a request to the AI provider times out."""


class InvalidAIResponseError(Exception):
    """Raised when the AI provider's response cannot be parsed or validated."""


class EmbeddingDimensionError(Exception):
    """Raised when an embedding provider returns a vector of the wrong length."""


# ═══════════════════════════════════════════════════════════════════════════
# Shared JSON-repair helper (used by every concrete provider)
# ═══════════════════════════════════════════════════════════════════════════


def safe_parse_json(text: str) -> dict[str, Any]:
    """
    Parse JSON from LLM output, handling common issues:
    - Leading/trailing whitespace
    - Markdown code fences
    - Partial JSON / surrounding prose

    Raises ``InvalidAIResponseError`` if no valid JSON object can be recovered.
    Never silently fabricates a value — callers get a controlled error.
    """
    cleaned = text.strip()

    # Strip markdown code fences
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        cleaned = "\n".join(lines).strip()

    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict):
            return parsed
        raise InvalidAIResponseError(
            f"Expected JSON object, got {type(parsed).__name__}"
        )
    except json.JSONDecodeError:
        pass

    # Attempt to find a JSON object embedded in surrounding text
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            parsed = json.loads(cleaned[start : end + 1])
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass

    raise InvalidAIResponseError("Could not parse valid JSON from AI response.")


# ═══════════════════════════════════════════════════════════════════════════
# Abstract provider interface
# ═══════════════════════════════════════════════════════════════════════════


class AIProvider(ABC):
    """
    Provider-agnostic contract. Any AI backend — a cloud API, a
    self-hosted OpenAI-compatible endpoint, or a local server such as
    Ollama — is implemented behind this interface. Brains and
    ``AIService`` never see provider-specific details (auth scheme,
    payload shape, wire protocol).
    """

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system: Optional[str] = None,
        response_format: Optional[str] = "json",
    ) -> str:
        """Send a generation request and return the raw response text."""
        raise NotImplementedError

    @abstractmethod
    async def generate_json(
        self,
        prompt: str,
        system: Optional[str] = None,
    ) -> dict[str, Any]:
        """Generate and parse a JSON response."""
        raise NotImplementedError

    @abstractmethod
    async def generate_stream(
        self,
        prompt: str,
        system: Optional[str] = None,
    ) -> AsyncIterator[str]:
        """Stream generated text chunks incrementally."""
        raise NotImplementedError
        yield ""  # generator signature helper

    @abstractmethod
    async def close(self) -> None:
        """Release any underlying network resources."""
        raise NotImplementedError


# ═══════════════════════════════════════════════════════════════════════════
# Abstract embedding-provider interface
# ═══════════════════════════════════════════════════════════════════════════


class EmbeddingProvider(ABC):
    """
    Provider-agnostic contract for text embeddings — kept separate from
    ``AIProvider`` because an embedding backend is a distinct concern from
    chat/generation (different endpoint, different model, often a
    different vendor entirely), even when both happen to be served by the
    same base URL.

    ``AIService`` and the embeddings route depend only on this interface;
    which vendor/model sits behind it is a configuration choice
    (``EMBEDDING_PROVIDER`` / ``EMBEDDING_BASE_URL`` / ``EMBEDDING_MODEL``).
    """

    @abstractmethod
    async def embed(self, texts: list[str]) -> list[list[float]]:
        """Return one embedding vector per input text, in the same order."""
        raise NotImplementedError

    @abstractmethod
    async def close(self) -> None:
        """Release any underlying network resources."""
        raise NotImplementedError