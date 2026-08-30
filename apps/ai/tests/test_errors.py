from fastapi import APIRouter, FastAPI
from fastapi.testclient import TestClient
from pydantic import BaseModel, Field
from app.core.errors import AppError, register_error_handlers


class SampleModel(BaseModel):
    name: str = Field(min_length=3)
    age: int = Field(gt=0)


def test_404_not_found_envelope(client: TestClient):
    response = client.get("/non-existent-endpoint-12345")
    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert data["error"] == "NOT_FOUND"
    assert "requestId" in data
    assert data["requestId"].startswith("req_")
    assert response.headers.get("x-request-id") == data["requestId"]


def test_422_validation_error_envelope():
    app = FastAPI()
    register_error_handlers(app)

    router = APIRouter()

    @router.post("/test-validation")
    async def sample_endpoint(payload: SampleModel):
        return {"data": payload.model_dump()}

    app.include_router(router)

    with TestClient(app) as test_client:
        # Invalid body (name too short, age negative)
        response = test_client.post(
            "/test-validation",
            json={"name": "a", "age": -5},
            headers={"x-request-id": "req_val_test_99"},
        )
        assert response.status_code == 422
        data = response.json()
        assert data["success"] is False
        assert data["error"] == "VALIDATION_ERROR"
        assert data["message"] == "Request validation failed"
        assert data["requestId"] == "req_val_test_99"
        assert isinstance(data["details"], list)
        assert len(data["details"]) > 0
        assert response.headers.get("x-request-id") == "req_val_test_99"


def test_custom_app_error_handler():
    app = FastAPI()
    register_error_handlers(app)

    router = APIRouter()

    @router.get("/trigger-app-error")
    async def trigger_error():
        raise AppError(
            message="Domain rule failed",
            error_code="INVALID_STATE",
            status_code=400,
            details={"field": "status"},
        )

    app.include_router(router)

    with TestClient(app) as test_client:
        response = test_client.get("/trigger-app-error")
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert data["error"] == "INVALID_STATE"
        assert data["message"] == "Domain rule failed"
        assert data["details"] == {"field": "status"}
        assert "requestId" in data


def test_unhandled_exception_500_handler():
    app = FastAPI()
    register_error_handlers(app)

    router = APIRouter()

    @router.get("/trigger-crash")
    async def trigger_crash():
        raise RuntimeError("Unexpected internal explosion")

    app.include_router(router)

    with TestClient(app, raise_server_exceptions=False) as test_client:
        response = test_client.get("/trigger-crash")
        assert response.status_code == 500
        data = response.json()
        assert data["success"] is False
        assert data["error"] == "INTERNAL_SERVER_ERROR"
        assert data["message"] == "An unexpected error occurred"
        assert "requestId" in data
