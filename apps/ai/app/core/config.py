from functools import lru_cache
from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: Literal["development", "staging", "production", "test"] = "development"
    AI_SERVICE_API_KEY: str
    GROQ_API_KEY: str = "gsk_dev_mock_key"
    GROQ_MODEL: str = "openai/gpt-oss-120b"
    CHROMA_URL: str | None = None
    CHROMA_AUTH_TOKEN: str | None = None
    CHROMA_COLLECTION_NAME: str = "freelance_os_projects"
    JINA_API_KEY: str = "jina_dev_mock_key"
    JINA_RERANKER_MODEL: str = "jina-reranker-v2-base-multilingual"
    DATABASE_URL: str | None = None
    LOG_LEVEL: str = "INFO"
    PORT: int = 8000
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:5001",
        "http://localhost:5000",
        "http://127.0.0.1:5001",
        "http://127.0.0.1:5000",
    ]

    # LangSmith Observability & Tracing
    LANGCHAIN_TRACING_V2: str | None = "false"
    LANGCHAIN_ENDPOINT: str | None = "https://api.smith.langchain.com"
    LANGCHAIN_API_KEY: str | None = None
    LANGCHAIN_PROJECT: str | None = "freelance-os-ai"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
