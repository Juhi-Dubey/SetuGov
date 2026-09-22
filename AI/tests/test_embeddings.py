"""
Tests for the embeddings capability: EmbeddingProvider factory, concrete
adapters, and the /ai/embeddings + /health/embeddings routes.

No real embedding backend needed — the default EMBEDDING_PROVIDER=mock is
used, and MockEmbeddingProvider is monkeypatched where a specific vector
shape needs to be forced (e.g. to exercise dimension-mismatch handling).
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import main
import providers.mock_provider as mock_provider_module
from config import Settings
from providers.base import EmbeddingProvider
from providers.factory import ProviderConfigurationError, get_embedding_provider
from providers.mock_provider import MockEmbeddingProvider


# ═══════════════════════════════════════════════════════════════════════════
# Factory
# ═══════════════════════════════════════════════════════════════════════════


def test_factory_returns_mock_embedding_provider_by_default():
    settings = Settings(_env_file=None)
    provider = get_embedding_provider(settings)
    assert isinstance(provider, MockEmbeddingProvider)


def test_factory_raises_on_unknown_embedding_provider():
    settings = Settings(_env_file=None, embedding_provider="totally_unknown")
    with pytest.raises(ProviderConfigurationError):
        get_embedding_provider(settings)


def test_factory_raises_when_api_compatible_missing_config():
    settings = Settings(
        _env_file=None, embedding_provider="api_compatible", embedding_base_url=None, embedding_model=None
    )
    with pytest.raises(ProviderConfigurationError):
        get_embedding_provider(settings)


def test_factory_raises_when_ollama_native_missing_config():
    settings = Settings(
        _env_file=None, embedding_provider="ollama_native", embedding_base_url=None, embedding_model=None
    )
    with pytest.raises(ProviderConfigurationError):
        get_embedding_provider(settings)


def test_factory_returns_api_compatible_when_configured():
    from providers.api_provider import APICompatibleEmbeddingProvider

    settings = Settings(
        _env_file=None,
        embedding_provider="api_compatible",
        embedding_base_url="https://example.com/v1",
        embedding_model="text-embedding-3-small",
        embedding_api_key="secret",
    )
    provider = get_embedding_provider(settings)
    assert isinstance(provider, APICompatibleEmbeddingProvider)
    assert provider.model == "text-embedding-3-small"
    assert provider.dimensions is None  # opt-in only


def test_factory_passes_dimensions_hint_when_requested():
    from providers.api_provider import APICompatibleEmbeddingProvider

    settings = Settings(
        _env_file=None,
        embedding_provider="api_compatible",
        embedding_base_url="https://example.com/v1",
        embedding_model="text-embedding-3-large",
        embedding_dimension=768,
        embedding_request_dimensions=True,
    )
    provider = get_embedding_provider(settings)
    assert isinstance(provider, APICompatibleEmbeddingProvider)
    assert provider.dimensions == 768


# ═══════════════════════════════════════════════════════════════════════════
# MockEmbeddingProvider
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_mock_embedding_provider_returns_configured_dimension():
    provider = MockEmbeddingProvider(dimension=768)
    vectors = await provider.embed(["hello", "world"])
    assert len(vectors) == 2
    assert all(len(v) == 768 for v in vectors)


@pytest.mark.asyncio
async def test_mock_embedding_provider_is_deterministic_per_text():
    provider = MockEmbeddingProvider(dimension=32)
    v1 = await provider.embed(["same text"])
    v2 = await provider.embed(["same text"])
    assert v1 == v2


@pytest.mark.asyncio
async def test_mock_embedding_provider_close_is_noop():
    provider = MockEmbeddingProvider()
    await provider.close()  # should not raise


# ═══════════════════════════════════════════════════════════════════════════
# API endpoint
# ═══════════════════════════════════════════════════════════════════════════


@pytest.fixture
def api_client():
    with TestClient(main.app, raise_server_exceptions=False) as client:
        yield client


def test_embeddings_endpoint_returns_vectors(api_client):
    resp = api_client.post("/ai/embeddings", json={"texts": ["hospital queue management"]})
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert len(body["data"]["embeddings"]) == 1
    assert len(body["data"]["embeddings"][0]) == body["data"]["dimension"]


def test_embeddings_endpoint_preserves_order_and_count(api_client):
    texts = ["alpha", "beta", "gamma"]
    resp = api_client.post("/ai/embeddings", json={"texts": texts})
    assert resp.status_code == 200
    embeddings = resp.json()["data"]["embeddings"]
    assert len(embeddings) == len(texts)
    # Distinct texts should not collapse to identical vectors under the mock.
    assert embeddings[0] != embeddings[1]


def test_embeddings_endpoint_rejects_empty_texts_list(api_client):
    resp = api_client.post("/ai/embeddings", json={"texts": []})
    assert resp.status_code == 422


def test_embeddings_endpoint_rejects_oversized_input(api_client):
    resp = api_client.post("/ai/embeddings", json={"texts": ["x" * 30000]})
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "INVALID_REQUEST"


def test_embeddings_endpoint_returns_dimension_mismatch_as_clean_502(api_client, monkeypatch):
    async def wrong_dimension(self, texts):
        return [[0.1, 0.2, 0.3] for _ in texts]  # 3-dim, not the configured 768

    monkeypatch.setattr(mock_provider_module.MockEmbeddingProvider, "embed", wrong_dimension)

    resp = api_client.post("/ai/embeddings", json={"texts": ["mismatched"]})
    assert resp.status_code == 502
    assert resp.json()["error"]["code"] == "EMBEDDING_DIMENSION_MISMATCH"


def test_health_embeddings_endpoint_reports_connected(api_client):
    resp = api_client.get("/health/embeddings")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "connected"
    assert body["provider"] == "mock"


def test_health_embeddings_endpoint_reports_unavailable_on_failure(api_client, monkeypatch):
    async def broken(self, texts):
        raise RuntimeError("embedding backend down")

    monkeypatch.setattr(mock_provider_module.MockEmbeddingProvider, "embed", broken)

    resp = api_client.get("/health/embeddings")
    assert resp.status_code == 503
    assert resp.json()["status"] == "unavailable"


# ═══════════════════════════════════════════════════════════════════════════
# Statelessness — the AI service never persists or scores, only embeds
# ═══════════════════════════════════════════════════════════════════════════


def test_embedding_provider_is_a_distinct_interface_from_ai_provider():
    """EmbeddingProvider must not require generate()/generate_json() — it's a
    separate concern from chat/generation, even for providers that offer both."""
    from providers.base import AIProvider

    assert not issubclass(EmbeddingProvider, AIProvider)
    assert not hasattr(EmbeddingProvider, "generate")
