from fastapi.testclient import TestClient


def test_protected_route_missing_auth_header(client: TestClient):
    response = client.get("/api/v1/protected")
    assert response.status_code == 401
    data = response.json()
    assert data["success"] is False
    assert data["error"] == "UNAUTHORIZED"
    assert "Missing Authorization" in data["message"]
    assert "requestId" in data


def test_protected_route_malformed_auth_header(client: TestClient):
    response = client.get("/api/v1/protected", headers={"Authorization": "Basic 12345"})
    assert response.status_code == 401
    data = response.json()
    assert data["success"] is False
    assert data["error"] == "UNAUTHORIZED"
    assert "Invalid Authorization header format" in data["message"]


def test_protected_route_invalid_token(client: TestClient):
    response = client.get("/api/v1/protected", headers={"Authorization": "Bearer wrong-key"})
    assert response.status_code == 401
    data = response.json()
    assert data["success"] is False
    assert data["error"] == "UNAUTHORIZED"
    assert data["message"] == "Invalid API key"


def test_protected_route_valid_token(client: TestClient, auth_headers: dict[str, str]):
    response = client.get("/api/v1/protected", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["message"] == "Authenticated successfully"
