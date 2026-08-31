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


def test_post_test_echo_endpoint(client: TestClient, auth_headers: dict[str, str]):
    payload = {
        "workspaceId": "ws_123",
        "actorId": "usr_456",
        "actorRole": "owner",
        "requestId": "req_echo_789",
        "input": {"task": "scope_analysis"},
    }
    response = client.post("/api/v1/test", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["status"] == "received"
    assert data["data"]["workspaceId"] == "ws_123"
    assert data["data"]["actorRole"] == "owner"
    assert data["data"]["echoInput"]["task"] == "scope_analysis"


def test_post_scope_endpoint(client: TestClient, auth_headers: dict[str, str]):
    payload = {
        "workspaceId": "ws_123",
        "actorId": "usr_456",
        "actorRole": "owner",
        "requestId": "req_scope_789",
        "input": {"inputText": "Build a React Native delivery application"},
    }
    response = client.post("/api/v1/scope", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "summary" in data["data"]
    assert "deliverables" in data["data"]
    assert len(data["data"]["deliverables"]) > 0
    assert "timeline_weeks" in data["data"]
    assert "confidence_score" in data["data"]

