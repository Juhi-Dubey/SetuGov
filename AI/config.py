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

    # Ollama
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2:3b"
    ollama_timeout: int = 300

    # AI Service
    ai_service_host: str = "0.0.0.0"
    ai_service_port: int = 8000

    # Logging
    log_level: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    """Return cached singleton settings instance."""
    return Settings()
