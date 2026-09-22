"""
SetuGov AI Service — Configuration

Loads settings from AI/.env using pydantic-settings.
All configuration is centralized here. No hardcoded values in service files.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables / .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # AI provider configuration — fully generic, no vendor assumed.
    # ai_provider selects the ADAPTER, never a vendor: "mock" (default,
    # no network calls), "api_compatible" (any chat-completions-shaped
    # endpoint), or "ollama_native" (Ollama's native /api/generate).
    ai_provider: str = "mock"
    ai_base_url: str | None = None
    ai_api_key: str | None = None
    ai_model: str | None = None
    ai_timeout: int = 300

    # Embedding provider configuration — deliberately separate from the
    # chat/generation settings above, since embeddings are usually a
    # different model (and often a different vendor) entirely.
    # embedding_provider selects the ADAPTER, never a vendor: "mock"
    # (default, no network calls), "api_compatible" (any endpoint speaking
    # the /embeddings convention — recommended for production; a cloud
    # call is typically far faster than a local model), or "ollama_native"
    # (Ollama's native /api/embed).
    embedding_provider: str = "mock"
    embedding_base_url: str | None = None
    embedding_api_key: str | None = None
    embedding_model: str | None = None
    embedding_timeout: int = 60
    # Must match the fixed-width vector column in Postgres (pgvector).
    # Changing the embedding model to one with a different native output
    # size requires migrating that column too — this is not just service
    # config, it's a database schema constraint.
    embedding_dimension: int = 768
    # Optional: some API-compatible embedding models (e.g. OpenAI's
    # text-embedding-3-*) support requesting a smaller output size than
    # their native dimension via a "dimensions" request parameter. Set
    # this to true to send embedding_dimension as that request parameter
    # — lets a larger-native-dimension model be used against an existing
    # fixed-width pgvector column (e.g. 768) with no database migration.
    # Only applies to embedding_provider=api_compatible; ignored otherwise.
    # Not every vendor supports this param — if unsupported, the provider
    # returns its native size and the caller's dimension check will catch
    # the mismatch clearly rather than silently accepting the wrong width.
    embedding_request_dimensions: bool = False

    # AI Service
    ai_service_host: str = "0.0.0.0"
    ai_service_port: int = 8000

    # Request limits (defence against oversized / abusive payloads)
    # max_input_chars  — longest allowed single text field, in characters
    # max_list_items   — longest allowed list field, in items
    # max_request_bytes — largest allowed request body (checked via Content-Length)
    max_input_chars: int = 20_000
    max_list_items: int = 200
    max_request_bytes: int = 1_000_000

    # CORS — restrict to known frontend origins in production
    # Override via ALLOWED_ORIGINS env var: ALLOWED_ORIGINS=["https://app.setugov.in"]
    allowed_origins: list[str] = ["http://localhost:3000", "http://localhost:8080"]

    # Logging
    log_level: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    """Return cached singleton settings instance."""
    return Settings()
