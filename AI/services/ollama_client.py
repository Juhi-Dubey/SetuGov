"""
SetuGov AI Service — Ollama Client

Pure transport layer. The ONLY module that communicates with Ollama.
Contains no business logic, no prompts, no scoring, no domain knowledge.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Optional

import httpx

logger = logging.getLogger("setugov.ai.ollama")


# ═══════════════════════════════════════════════════════════════════════════
# Exceptions
# ═══════════════════════════════════════════════════════════════════════════


class OllamaUnavailableError(Exception):
    """Raised when the Ollama server cannot be reached."""


class OllamaTimeoutError(Exception):
    """Raised when an Ollama request times out."""


class InvalidAIResponseError(Exception):
    """Raised when the Ollama response cannot be parsed or validated."""


# ═══════════════════════════════════════════════════════════════════════════
# Client
# ═══════════════════════════════════════════════════════════════════════════


class OllamaClient:
    """
    Async HTTP client for the Ollama ``/api/generate`` endpoint.

    Responsibilities
    ----------------
    * Construct Ollama request payloads
    * Send HTTP requests
    * Handle connection failures and timeouts
    * Receive and return model output
    * Expose controlled exceptions

    Non-responsibilities
    --------------------
    * Challenge logic, scoring, KPI calculations, prompts, procurement rules
    """

    def __init__(
        self,
        base_url: str = "http://localhost:11434",
        model: str = "llama3.2:3b",
        timeout: int = 120,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=httpx.Timeout(timeout, connect=10.0),
        )

    async def close(self) -> None:
        """Close the underlying HTTP client."""
        await self._client.aclose()

    # ── Core generation ───────────────────────────────────────────────────

    async def generate(
        self,
        prompt: str,
        system: Optional[str] = None,
        response_format: Optional[str] = "json",
    ) -> str:
        """
        Send a generation request to Ollama and return the raw response text.

        Parameters
        ----------
        prompt : str
            The user prompt.
        system : str, optional
            The system prompt.
        response_format : str, optional
            Set to ``"json"`` to request JSON mode. ``None`` for free text.

        Returns
        -------
        str
            Raw text response from the model.

        Raises
        ------
        OllamaUnavailableError
            If the server is unreachable.
        OllamaTimeoutError
            If the request times out.
        InvalidAIResponseError
            If the response cannot be decoded.
        """
        payload: dict[str, Any] = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
        }
        if system:
            payload["system"] = system
        if response_format == "json":
            payload["format"] = "json"

        logger.info(
            "Ollama request — model=%s, prompt_len=%d, format=%s",
            self.model,
            len(prompt),
            response_format,
        )

        try:
            response = await self._client.post("/api/generate", json=payload)
            response.raise_for_status()
        except httpx.ConnectError as exc:
            raise OllamaUnavailableError(
                f"Cannot connect to Ollama at {self.base_url}: {exc}"
            ) from exc
        except httpx.TimeoutException as exc:
            raise OllamaTimeoutError(
                f"Ollama request timed out after {self.timeout}s: {exc}"
            ) from exc
        except httpx.HTTPStatusError as exc:
            raise OllamaUnavailableError(
                f"Ollama returned HTTP {exc.response.status_code}: {exc}"
            ) from exc
        except httpx.HTTPError as exc:
            raise OllamaUnavailableError(
                f"Ollama HTTP error: {exc}"
            ) from exc

        try:
            body = response.json()
        except (json.JSONDecodeError, ValueError) as exc:
            raise InvalidAIResponseError(
                f"Ollama response is not valid JSON: {exc}"
            ) from exc

        raw_text = body.get("response", "")
        if not raw_text:
            raise InvalidAIResponseError("Ollama returned an empty response.")

        logger.info(
            "Ollama response — model=%s, response_len=%d",
            self.model,
            len(raw_text),
        )
        return raw_text

    # ── Structured JSON generation ────────────────────────────────────────

    async def generate_json(
        self,
        prompt: str,
        system: Optional[str] = None,
    ) -> dict[str, Any]:
        """
        Generate and parse a JSON response.

        Attempts safe parsing with fallback extraction for markdown-wrapped
        JSON. Raises ``InvalidAIResponseError`` if parsing fails.
        """
        raw = await self.generate(prompt, system=system, response_format="json")
        return self._safe_parse_json(raw)

    # ── Safe JSON parsing ─────────────────────────────────────────────────

    @staticmethod
    def _safe_parse_json(text: str) -> dict[str, Any]:
        """
        Parse JSON from LLM output, handling common issues:
        - Leading/trailing whitespace
        - Markdown code fences
        - Partial JSON
        """
        cleaned = text.strip()

        # Strip markdown code fences
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            # Remove first line (```json) and last line (```)
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

        # Attempt to find JSON object in the text
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                parsed = json.loads(cleaned[start : end + 1])
                if isinstance(parsed, dict):
                    return parsed
            except json.JSONDecodeError:
                pass

        raise InvalidAIResponseError(
            "Could not parse valid JSON from AI response."
        )
