from fastapi.testclient import TestClient


def test_health_endpoint_success_without_auth(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data.get("status") == "ok"
    assert "x-request-id" in response.headers


def test_health_endpoint_preserves_custom_request_id(client: TestClient):
    custom_id = "req_custom_test_123"
    response = client.get("/health", headers={"x-request-id": custom_id})
    assert response.status_code == 200
    assert response.headers.get("x-request-id") == custom_id
