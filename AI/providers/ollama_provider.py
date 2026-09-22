"""
SetuGov AI Service — Ollama-native provider

Speaks Ollama's native ``/api/generate`` wire format. This is ONE of several
selectable ``AIProvider`` implementations (see ``providers/factory.py``) —
it is never assumed or defaulted to. Nothing here hardcodes a model name;
``base_url``, ``model``, and ``timeout`` all come from configuration
(``AI_BASE_URL`` / ``AI_MODEL`` / ``AI_TIMEOUT``).

Pure transport layer: no business logic, no prompts, no scoring, no domain
knowledge.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Optional

import httpx

from providers.base import (
    AIProvider,
    EmbeddingProvider,
    InvalidAIResponseError,
    ProviderTimeoutError,
    ProviderUnavailableError,
    safe_parse_json,
)

logger = logging.getLogger("setugov.ai.provider.ollama_native")


class OllamaNativeProvider(AIProvider):
    """
    Async HTTP client for Ollama's native ``/api/generate`` endpoint.

    Responsibilities
    ----------------
    * Construct request payloads in Ollama's native shape
    * Send HTTP requests
    * Handle connection failures and timeouts
    * Receive and return model output
    * Expose controlled, provider-agnostic exceptions

    Non-responsibilities
    --------------------
    * Challenge logic, scoring, KPI calculations, prompts, procurement rules
    """

    def __init__(
        self,
        base_url: str,
        model: str,
        timeout: int = 300,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=httpx.Timeout(timeout, connect=10.0),
        )

    async def close(self) -> None:
        await self._client.aclose()

    async def generate(
        self,
        prompt: str,
        system: Optional[str] = None,
        response_format: Optional[str] = "json",
    ) -> str:
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
            "Ollama-native request — model=%s, prompt_len=%d, format=%s",
            self.model,
            len(prompt),
            response_format,
        )

        try:
            response = await self._client.post("/api/generate", json=payload)
            response.raise_for_status()
        except httpx.ConnectError as exc:
            raise ProviderUnavailableError(
                f"Cannot connect to Ollama at {self.base_url}: {exc}"
            ) from exc
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError(
                f"Ollama request timed out after {self.timeout}s: {exc}"
            ) from exc
        except httpx.HTTPStatusError as exc:
            raise ProviderUnavailableError(
                f"Ollama returned HTTP {exc.response.status_code}: {exc}"
            ) from exc
        except httpx.HTTPError as exc:
            raise ProviderUnavailableError(f"Ollama HTTP error: {exc}") from exc

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
            "Ollama-native response — model=%s, response_len=%d",
            self.model,
            len(raw_text),
        )
        return raw_text

    async def generate_json(
        self,
        prompt: str,
        system: Optional[str] = None,
    ) -> dict[str, Any]:
        raw = await self.generate(prompt, system=system, response_format="json")
        return safe_parse_json(raw)


class OllamaEmbeddingProvider(EmbeddingProvider):
    """
    Async HTTP client for Ollama's native ``/api/embed`` endpoint.

    Ports the exact wire format the Backend used to call directly
    (``{"model", "input"}`` in, ``{"embeddings": [...]}`` out) — now behind
    the same provider-agnostic interface as every other embedding backend.
    Nothing here hardcodes a model name; ``base_url``, ``model``, and
    ``timeout`` all come from configuration.
    """

    def __init__(self, base_url: str, model: str, timeout: int = 60) -> None:
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=httpx.Timeout(timeout, connect=10.0),
        )

    async def close(self) -> None:
        await self._client.aclose()

    async def embed(self, texts: list[str]) -> list[list[float]]:
        payload = {"model": self.model, "input": texts}

        logger.info(
            "Ollama-native embedding request — model=%s, count=%d",
            self.model,
            len(texts),
        )

        try:
            response = await self._client.post("/api/embed", json=payload)
            response.raise_for_status()
        except httpx.ConnectError as exc:
            raise ProviderUnavailableError(
                f"Cannot connect to Ollama at {self.base_url}: {exc}"
            ) from exc
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError(
                f"Ollama embedding request timed out after {self.timeout}s: {exc}"
            ) from exc
        except httpx.HTTPStatusError as exc:
            raise ProviderUnavailableError(
                f"Ollama returned HTTP {exc.response.status_code}: {exc}"
            ) from exc
        except httpx.HTTPError as exc:
            raise ProviderUnavailableError(f"Ollama HTTP error: {exc}") from exc

        try:
            body = response.json()
        except (json.JSONDecodeError, ValueError) as exc:
            raise InvalidAIResponseError(
                f"Ollama embedding response is not valid JSON: {exc}"
            ) from exc

        embeddings = body.get("embeddings")
        if not isinstance(embeddings, list) or not embeddings:
            raise InvalidAIResponseError(
                "Ollama embedding response does not contain an embeddings array."
            )

        return embeddings
