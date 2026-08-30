import os
from typing import Generator
import pytest
from fastapi.testclient import TestClient

# Ensure test environment variables are set before importing app modules
os.environ["ENVIRONMENT"] = "test"
os.environ["AI_SERVICE_API_KEY"] = "test-secret-key-12345"
os.environ["LOG_LEVEL"] = "DEBUG"

from app.core.config import get_settings
from app.main import create_app

# Clear cached settings to pick up test environment
get_settings.cache_clear()


@pytest.fixture
def valid_api_key() -> str:
    return "test-secret-key-12345"


@pytest.fixture
def auth_headers(valid_api_key: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {valid_api_key}"}


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client
