"""
SetuGov AI Service — Generic API-compatible provider

Speaks the widely-used "chat completions" JSON convention (a ``messages``
array in, ``choices[0].message.content`` out) — the shape shared by most
OpenAI-compatible gateways, self-hosted proxies, and managed APIs. Ollama
itself also exposes this convention at ``/v1/chat/completions``, so pointing
``AI_BASE_URL`` at that path lets this same adapter talk to a local Ollama
install with zero Ollama-specific code.

Nothing here hardcodes a vendor or model name — ``base_url``, ``api_key``,
and ``model`` are all supplied via configuration.
"""

from __future__ import annotations

import json
import logging
from typing import Any, AsyncIterator, Optional

import httpx

from providers.base import (
    AIProvider,
    EmbeddingProvider,
    InvalidAIResponseError,
    ProviderTimeoutError,
    ProviderUnavailableError,
    safe_parse_json,
)

logger = logging.getLogger("setugov.ai.provider.api_compatible")


class APICompatibleProvider(AIProvider):
    """
    Async HTTP client for any chat-completions-shaped endpoint.

    Responsibilities
    ----------------
    * Construct chat-completions request payloads
    * Send HTTP requests, with an optional bearer API key
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
        api_key: Optional[str] = None,
        timeout: int = 300,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.api_key = api_key
        self.timeout = timeout
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=httpx.Timeout(timeout, connect=10.0),
        )

    async def close(self) -> None:
        await self._client.aclose()

    def _headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    async def generate(
        self,
        prompt: str,
        system: Optional[str] = None,
        response_format: Optional[str] = "json",
    ) -> str:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        payload: dict[str, Any] = {"model": self.model, "messages": messages}
        if response_format == "json":
            # Widely supported hint; adapters that ignore it still get
            # a system-prompt instruction to return JSON, set by the caller.
            payload["response_format"] = {"type": "json_object"}

        logger.info(
            "API-compatible request — model=%s, prompt_len=%d, format=%s",
            self.model,
            len(prompt),
            response_format,
        )

        try:
            response = await self._client.post(
                "/chat/completions", json=payload, headers=self._headers()
            )
            response.raise_for_status()
        except httpx.ConnectError as exc:
            raise ProviderUnavailableError(
                f"Cannot connect to AI provider at {self.base_url}: {exc}"
            ) from exc
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError(
                f"AI provider request timed out after {self.timeout}s: {exc}"
            ) from exc
        except httpx.HTTPStatusError as exc:
            raise ProviderUnavailableError(
                f"AI provider returned HTTP {exc.response.status_code}: {exc}"
            ) from exc
        except httpx.HTTPError as exc:
            raise ProviderUnavailableError(f"AI provider HTTP error: {exc}") from exc

        try:
            body = response.json()
        except (json.JSONDecodeError, ValueError) as exc:
            raise InvalidAIResponseError(
                f"AI provider response is not valid JSON: {exc}"
            ) from exc

        try:
            raw_text = body["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise InvalidAIResponseError(
                "AI provider response did not match the expected "
                "chat-completions shape."
            ) from exc

        if not raw_text:
            raise InvalidAIResponseError("AI provider returned an empty response.")

        logger.info(
            "API-compatible response — model=%s, response_len=%d",
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

    async def generate_stream(
        self,
        prompt: str,
        system: Optional[str] = None,
    ) -> AsyncIterator[str]:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "stream": True,
        }

        logger.info(
            "API-compatible stream request — model=%s, prompt_len=%d",
            self.model,
            len(prompt),
        )

        try:
            async with self._client.stream(
                "POST", "/chat/completions", json=payload, headers=self._headers()
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    line = line.strip()
                    if not line:
                        continue
                    if line.startswith("data: "):
                        data_str = line[6:].strip()
                        if data_str == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data_str)
                            delta = chunk.get("choices", [{}])[0].get("delta", {})
                            content = delta.get("content", "")
                            if content:
                                yield content
                        except (json.JSONDecodeError, KeyError, IndexError):
                            continue
        except httpx.ConnectError as exc:
            raise ProviderUnavailableError(
                f"Cannot connect to AI provider at {self.base_url}: {exc}"
            ) from exc
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError(
                f"AI provider request timed out after {self.timeout}s: {exc}"
            ) from exc
        except httpx.HTTPStatusError as exc:
            raise ProviderUnavailableError(
                f"AI provider returned HTTP {exc.response.status_code}: {exc}"
            ) from exc
        except httpx.HTTPError as exc:
            raise ProviderUnavailableError(f"AI provider HTTP error: {exc}") from exc


class APICompatibleEmbeddingProvider(EmbeddingProvider):
    """
    Async HTTP client for any endpoint speaking the widely-used
    ``/embeddings`` convention (``{"model", "input"}`` in,
    ``{"data": [{"embedding": [...]}]}`` out) — the shape shared by
    OpenAI-compatible gateways and most managed embedding APIs. This is
    the recommended path for production: a cloud API call is typically a
    fraction of the latency of a local model.

    Nothing here hardcodes a vendor or model name — ``base_url``,
    ``api_key``, and ``model`` all come from configuration.
    """

    def __init__(
        self,
        base_url: str,
        model: str,
        api_key: Optional[str] = None,
        timeout: int = 60,
        dimensions: Optional[int] = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.api_key = api_key
        self.timeout = timeout
        # Optional output-size hint (OpenAI-style "dimensions" param) so a
        # model with a larger native output can be truncated to match a
        # fixed-width pgvector column without a database migration. Not
        # every provider supports this — if the provider ignores it, the
        # returned vectors keep their native size and the caller's
        # dimension-mismatch check will surface that clearly instead of
        # silently accepting the wrong width.
        self.dimensions = dimensions
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=httpx.Timeout(timeout, connect=10.0),
        )

    async def close(self) -> None:
        await self._client.aclose()

    def _headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    async def embed(self, texts: list[str]) -> list[list[float]]:
        payload: dict[str, Any] = {"model": self.model, "input": texts}
        if self.dimensions:
            payload["dimensions"] = self.dimensions

        logger.info(
            "API-compatible embedding request — model=%s, count=%d",
            self.model,
            len(texts),
        )

        try:
            response = await self._client.post(
                "/embeddings", json=payload, headers=self._headers()
            )
            response.raise_for_status()
        except httpx.ConnectError as exc:
            raise ProviderUnavailableError(
                f"Cannot connect to embedding provider at {self.base_url}: {exc}"
            ) from exc
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError(
                f"Embedding provider request timed out after {self.timeout}s: {exc}"
            ) from exc
        except httpx.HTTPStatusError as exc:
            raise ProviderUnavailableError(
                f"Embedding provider returned HTTP {exc.response.status_code}: {exc}"
            ) from exc
        except httpx.HTTPError as exc:
            raise ProviderUnavailableError(f"Embedding provider HTTP error: {exc}") from exc

        try:
            body = response.json()
        except (json.JSONDecodeError, ValueError) as exc:
            raise InvalidAIResponseError(
                f"Embedding provider response is not valid JSON: {exc}"
            ) from exc

        try:
            # Sort by index in case the provider doesn't preserve input order.
            items = sorted(body["data"], key=lambda item: item.get("index", 0))
            return [item["embedding"] for item in items]
        except (KeyError, TypeError) as exc:
            raise InvalidAIResponseError(
                "Embedding provider response did not match the expected "
                "'/embeddings' shape."
            ) from exc
