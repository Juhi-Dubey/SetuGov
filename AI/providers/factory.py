"""
SetuGov AI Service — Provider factory

The single place that branches on ``AI_PROVIDER``. Adding a new provider
means adding one branch here and one new class in this package — nothing
in ``services/``, ``prompts/``, or ``main.py`` needs to change.
"""

from __future__ import annotations

from providers.api_provider import APICompatibleEmbeddingProvider, APICompatibleProvider
from providers.base import AIProvider, EmbeddingProvider
from providers.mock_provider import MockEmbeddingProvider, MockProvider
from providers.ollama_provider import OllamaEmbeddingProvider, OllamaNativeProvider


class ProviderConfigurationError(Exception):
    """Raised at startup when AI_PROVIDER is missing required configuration."""


def get_provider(settings) -> AIProvider:  # noqa: ANN001 - Settings import avoided to prevent circular import
    """
    Build the configured ``AIProvider``.

    ``AI_PROVIDER`` selects the adapter, never a specific vendor or model:
      - "mock"          -> no network calls; safe default for dev/tests
      - "api_compatible"-> any endpoint speaking the chat-completions
                           convention (OpenAI-compatible gateways, most
                           managed APIs, and Ollama's own ``/v1`` surface)
      - "ollama_native" -> Ollama's native ``/api/generate`` endpoint
    """
    provider_name = (settings.ai_provider or "mock").lower()

    if provider_name == "mock":
        return MockProvider()

    if provider_name == "api_compatible":
        if not settings.ai_base_url or not settings.ai_model:
            raise ProviderConfigurationError(
                "AI_BASE_URL and AI_MODEL must be set when AI_PROVIDER=api_compatible."
            )
        return APICompatibleProvider(
            base_url=settings.ai_base_url,
            model=settings.ai_model,
            api_key=settings.ai_api_key,
            timeout=settings.ai_timeout,
        )

    if provider_name == "ollama_native":
        if not settings.ai_base_url or not settings.ai_model:
            raise ProviderConfigurationError(
                "AI_BASE_URL and AI_MODEL must be set when AI_PROVIDER=ollama_native."
            )
        return OllamaNativeProvider(
            base_url=settings.ai_base_url,
            model=settings.ai_model,
            timeout=settings.ai_timeout,
        )

    raise ProviderConfigurationError(
        f"Unknown AI_PROVIDER '{settings.ai_provider}'. "
        "Expected one of: 'mock', 'api_compatible', 'ollama_native'."
    )


def get_embedding_provider(settings) -> EmbeddingProvider:  # noqa: ANN001
    """
    Build the configured ``EmbeddingProvider``.

    Deliberately separate from ``get_provider()``/``AI_PROVIDER`` — an
    embedding backend is usually a different model, and often a different
    vendor entirely, from whatever handles chat/generation.

    ``EMBEDDING_PROVIDER`` selects the adapter, never a specific vendor or
    model:
      - "mock"          -> no network calls; safe default for dev/tests
      - "api_compatible"-> any endpoint speaking the ``/embeddings``
                           convention (OpenAI-compatible gateways and most
                           managed embedding APIs) — recommended for
                           production: a cloud call is typically far
                           faster than a local model
      - "ollama_native" -> Ollama's native ``/api/embed`` endpoint
    """
    provider_name = (settings.embedding_provider or "mock").lower()

    if provider_name == "mock":
        return MockEmbeddingProvider(dimension=settings.embedding_dimension)

    if provider_name == "api_compatible":
        if not settings.embedding_base_url or not settings.embedding_model:
            raise ProviderConfigurationError(
                "EMBEDDING_BASE_URL and EMBEDDING_MODEL must be set when "
                "EMBEDDING_PROVIDER=api_compatible."
            )
        return APICompatibleEmbeddingProvider(
            base_url=settings.embedding_base_url,
            model=settings.embedding_model,
            api_key=settings.embedding_api_key,
            timeout=settings.embedding_timeout,
            dimensions=(
                settings.embedding_dimension if settings.embedding_request_dimensions else None
            ),
        )

    if provider_name == "ollama_native":
        if not settings.embedding_base_url or not settings.embedding_model:
            raise ProviderConfigurationError(
                "EMBEDDING_BASE_URL and EMBEDDING_MODEL must be set when "
                "EMBEDDING_PROVIDER=ollama_native."
            )
        return OllamaEmbeddingProvider(
            base_url=settings.embedding_base_url,
            model=settings.embedding_model,
            timeout=settings.embedding_timeout,
        )

    raise ProviderConfigurationError(
        f"Unknown EMBEDDING_PROVIDER '{settings.embedding_provider}'. "
        "Expected one of: 'mock', 'api_compatible', 'ollama_native'."
    )
