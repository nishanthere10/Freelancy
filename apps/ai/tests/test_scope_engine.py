import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from langchain_core.documents import Document

from app.schemas.scope import Deliverable, ScopeAnalysisResult
from app.services.llm_service import llm_scope_engine


def test_deliverable_pydantic_schema_validation():
    deliverable = Deliverable(
        title="Database Schema & Auth Setup",
        description="Design PostgreSQL Drizzle schema and integrate Clerk JWT authentication.",
        estimated_hours=12,
        complexity="high",
        skills_required=["Drizzle ORM", "PostgreSQL", "Clerk"],
    )
    data = deliverable.model_dump()
    assert data["title"] == "Database Schema & Auth Setup"
    assert data["estimated_hours"] == 12
    assert data["complexity"] == "high"
    assert "Drizzle ORM" in data["skills_required"]


def test_scope_analysis_result_schema_validation():
    result = ScopeAnalysisResult(
        summary="End-to-end SaaS application development with responsive dashboard.",
        deliverables=[
            Deliverable(
                title="API Engineering",
                description="RESTful Express API on Cloudflare Workers.",
                estimated_hours=24,
            ),
        ],
        timeline_weeks=2,
        risks_and_dependencies=["Third-party payment gateway approval"],
        recommended_tech_stack=["Next.js", "Express", "Neon PostgreSQL"],
        confidence_score=95,
    )
    dumped = result.model_dump()
    assert dumped["timeline_weeks"] == 2
    assert dumped["confidence_score"] == 95
    assert len(dumped["deliverables"]) == 1
    assert dumped["deliverables"][0]["estimated_hours"] == 24


@pytest.mark.asyncio
async def test_llm_service_generate_scope_from_brief():
    brief = "Develop an automated billing and recurring invoicing SaaS application with Stripe checkout."
    result = await llm_scope_engine.generate_scope_from_brief(brief)

    assert isinstance(result, ScopeAnalysisResult)
    assert len(result.deliverables) >= 3
    assert result.timeline_weeks >= 1
    assert 1 <= result.confidence_score <= 100
    assert len(result.recommended_tech_stack) > 0


@pytest.mark.asyncio
async def test_llm_service_with_workspace_rag_context():
    """Verify LLM service queries vector store for historical workspace benchmarks."""
    brief = "Develop a high-performance e-commerce backend API."
    mock_docs = [
        Document(
            page_content="Historical Project: E-Commerce Store. Total budget $8000. Delivered in 4 weeks.",
            metadata={"title": "Previous Store", "workspace_id": "ws_test_rag"},
        )
    ]

    from app.services.rag_memory import RagContext

    mock_context = RagContext(
        raw_documents=mock_docs,
        formatted_prompt_block="--- HISTORICAL CONTEXT MOCK ---",
        has_benchmarks=True,
        benchmark_count=1,
    )

    with patch(
        "app.services.llm_service.rag_memory_pipeline.retrieve_benchmarks",
        new_callable=AsyncMock,
    ) as mock_rag:
        mock_rag.return_value = mock_context

        result = await llm_scope_engine.generate_scope_from_brief(
            brief=brief,
            workspace_id="ws_test_rag",
        )

        mock_rag.assert_awaited_once_with(
            workspace_id="ws_test_rag",
            query=brief,
            top_k=10,
            top_n=3,
        )
        assert isinstance(result, ScopeAnalysisResult)
        assert result.confidence_score == 95


@pytest.mark.asyncio
async def test_llm_service_short_brief_raises_error():
    with pytest.raises(Exception) as exc_info:
        await llm_scope_engine.generate_scope_from_brief("Too short")
    assert "at least 10 characters" in str(exc_info.value)


def test_post_scope_endpoint_success(client: TestClient, auth_headers: dict[str, str]):
    payload = {
        "workspaceId": "ws_1111_1111_1111",
        "actorId": "usr_2222_2222_2222",
        "actorRole": "owner",
        "requestId": "req_scope_test_123",
        "input": {
            "inputText": "Build a real-time freelance operating system with client CRM, invoicing, and analytics.",
            "projectId": "11111111-1111-1111-1111-111111111111",
        },
    }

    response = client.post("/api/v1/scope", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    assert data["success"] is True
    assert data["requestId"] == "req_scope_test_123"
    assert "summary" in data["data"]
    assert "deliverables" in data["data"]
    assert len(data["data"]["deliverables"]) > 0
    assert "timeline_weeks" in data["data"]
    assert "confidence_score" in data["data"]
    assert "recommended_tech_stack" in data["data"]


def test_post_scope_endpoint_unauthorized(client: TestClient):
    payload = {
        "workspaceId": "ws_1111",
        "actorId": "usr_2222",
        "actorRole": "owner",
        "requestId": "req_unauth",
        "input": {"inputText": "Build an e-commerce platform"},
    }
    response = client.post("/api/v1/scope", json=payload)
    assert response.status_code == 401
    data = response.json()
    assert data["success"] is False
    assert data["error"] == "UNAUTHORIZED"


def test_post_scope_endpoint_validation_error(client: TestClient, auth_headers: dict[str, str]):
    payload = {
        "workspaceId": "ws_1111",
        "actorId": "usr_2222",
        "actorRole": "owner",
        "requestId": "req_val_err",
        "input": {"inputText": "tiny"},
    }
    response = client.post("/api/v1/scope", json=payload, headers=auth_headers)
    assert response.status_code == 422
    data = response.json()
    assert data["success"] is False
    assert data["error"] == "VALIDATION_ERROR"


def test_post_ingest_endpoint(client: TestClient, auth_headers: dict[str, str]):
    """Verify REST ingestion endpoint for workspace indexing."""
    with patch(
        "app.api.routes.ingest.ingest_workspace_data",
        new_callable=AsyncMock,
    ) as mock_ingest:
        mock_ingest.return_value = 5

        response = client.post(
            "/api/v1/ingest/workspace/ws_target_123",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["workspaceId"] == "ws_target_123"
        assert data["data"]["indexedCount"] == 5
