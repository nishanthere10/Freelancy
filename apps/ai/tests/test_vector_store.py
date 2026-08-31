import pytest
from unittest.mock import AsyncMock, patch
import chromadb
from chromadb.config import Settings as ChromaSettings
from langchain_core.documents import Document

from app.core.embeddings import DeterministicMockEmbeddings
from app.core.reranker import rerank_documents
from app.services.vector_store import VectorStoreService


@pytest.fixture
def ephemeral_vector_service():
    """
    Creates an isolated in-memory vector store service per test to ensure clean state.
    """
    test_client = chromadb.EphemeralClient(
        settings=ChromaSettings(anonymized_telemetry=False)
    )
    service = VectorStoreService(client=test_client)
    return service


def test_embedding_generation():
    """
    Verify embedding provider returns deterministic float vectors of expected dimension.
    """
    embeddings = DeterministicMockEmbeddings(dimension=768)
    query_vector = embeddings.embed_query("Design a Next.js e-commerce app")

    assert isinstance(query_vector, list)
    assert len(query_vector) == 768
    assert all(isinstance(val, float) for val in query_vector)

    docs_vectors = embeddings.embed_documents([
        "Document 1 description",
        "Document 2 description",
    ])
    assert len(docs_vectors) == 2
    assert len(docs_vectors[0]) == 768
    assert len(docs_vectors[1]) == 768


def test_tenant_isolation_boundary(ephemeral_vector_service: VectorStoreService):
    """
    CRITICAL TEST: Verify that Tenant A never retrieves Tenant B's data,
    even when Tenant A searches for the exact semantic content of Tenant B's documents.
    """
    tenant_a_docs = [
        Document(
            page_content="E-Commerce backend API with Node.js, Express, and Neon PostgreSQL database.",
            metadata={"title": "E-Commerce API", "type": "project"},
        ),
        Document(
            page_content="Weekly invoice retainer agreement for client Acme Corp.",
            metadata={"title": "Acme Retainer", "type": "invoice"},
        ),
    ]

    tenant_b_docs = [
        Document(
            page_content="Mobile Flutter delivery app with live GPS tracking and customer notifications.",
            metadata={"title": "Courier App", "type": "project"},
        ),
    ]

    ephemeral_vector_service.add_documents(
        workspace_id="tenant_workspace_aaa",
        documents=tenant_a_docs,
    )
    ephemeral_vector_service.add_documents(
        workspace_id="tenant_workspace_bbb",
        documents=tenant_b_docs,
    )

    # 1. Tenant A searches for Tenant B's content ("Flutter delivery app")
    tenant_a_results = ephemeral_vector_service.search_documents(
        workspace_id="tenant_workspace_aaa",
        query="Mobile Flutter delivery app with GPS",
        top_k=5,
    )

    # Assert Tenant A gets NO results from Tenant B
    for doc in tenant_a_results:
        assert doc.metadata["workspace_id"] == "tenant_workspace_aaa"
        assert "Flutter" not in doc.page_content

    # 2. Tenant B searches for Tenant B's content
    tenant_b_results = ephemeral_vector_service.search_documents(
        workspace_id="tenant_workspace_bbb",
        query="Mobile Flutter delivery app with GPS",
        top_k=5,
    )

    assert len(tenant_b_results) > 0
    assert tenant_b_results[0].metadata["workspace_id"] == "tenant_workspace_bbb"
    assert "Flutter" in tenant_b_results[0].page_content


async def test_async_vector_store_methods(ephemeral_vector_service: VectorStoreService):
    """
    Verify async non-blocking wrappers (aadd_documents, asearch_documents).
    """
    doc = Document(
        page_content="Async workflow engine for AI task orchestration.",
        metadata={"id": "async_wf_1"},
    )

    ids = await ephemeral_vector_service.aadd_documents(
        workspace_id="ws_async_test",
        documents=[doc],
    )
    assert len(ids) == 1

    results = await ephemeral_vector_service.asearch_documents(
        workspace_id="ws_async_test",
        query="AI task orchestration",
        top_k=3,
    )
    assert len(results) == 1
    assert "AI task orchestration" in results[0].page_content


def test_search_with_scores_and_deletion(ephemeral_vector_service: VectorStoreService):
    """
    Verify similarity search with relevance scores and document deletion.
    """
    doc = Document(
        page_content="Security audit and penetration testing for SaaS web app.",
        metadata={"id": "sec_audit_100"},
    )

    ids = ephemeral_vector_service.add_documents(
        workspace_id="ws_scores_test",
        documents=[doc],
    )

    results_with_scores = ephemeral_vector_service.search_documents_with_score(
        workspace_id="ws_scores_test",
        query="penetration testing",
        top_k=3,
    )

    assert len(results_with_scores) == 1
    doc_match, score = results_with_scores[0]
    assert doc_match.metadata["workspace_id"] == "ws_scores_test"
    assert isinstance(score, float)

    # Test deletion
    ephemeral_vector_service.delete_documents(
        workspace_id="ws_scores_test",
        ids=ids,
    )

    empty_results = ephemeral_vector_service.search_documents(
        workspace_id="ws_scores_test",
        query="penetration testing",
    )
    assert empty_results == []


async def test_search_and_rerank_integration(ephemeral_vector_service: VectorStoreService):
    """
    Verify search_and_rerank candidates sorting and top_n reduction.
    """
    docs = [
        Document(page_content="Next.js React dashboard for invoicing and metrics.", metadata={"id": "1", "title": "Dashboard"}),
        Document(page_content="Python FastAPI microservice with Groq LLM.", metadata={"id": "2", "title": "AI Service"}),
        Document(page_content="Flutter mobile application for iOS and Android.", metadata={"id": "3", "title": "Mobile App"}),
        Document(page_content="PostgreSQL database schema migrations and indexing.", metadata={"id": "4", "title": "Database"}),
    ]

    await ephemeral_vector_service.aadd_documents(
        workspace_id="ws_rerank_test",
        documents=docs,
    )

    # Search for dashboard
    top_reranked = await ephemeral_vector_service.asearch_and_rerank(
        workspace_id="ws_rerank_test",
        query="React Next.js invoicing dashboard",
        top_k=4,
        top_n=2,
    )

    assert len(top_reranked) <= 2
    assert "dashboard" in top_reranked[0].page_content.lower() or "invoicing" in top_reranked[0].page_content.lower()


async def test_jina_reranker_mocked_http_api():
    """
    Verify Jina Reranker parses live HTTP response format correctly.
    """
    docs = [
        Document(page_content="Document Alpha: Machine Learning Pipeline"),
        Document(page_content="Document Beta: Modern React Next.js Web App"),
    ]

    mock_response = {
        "results": [
            {"index": 1, "relevance_score": 0.98},
            {"index": 0, "relevance_score": 0.45},
        ]
    }

    from app.core.config import get_settings

    mock_settings = get_settings().model_copy(
        update={
            "ENVIRONMENT": "production",
            "JINA_API_KEY": "jina_live_test_key_12345",
        }
    )

    with patch("httpx.AsyncClient.post") as mock_post:
        mock_post.return_value = AsyncMock(
            status_code=200,
            json=lambda: mock_response,
            raise_for_status=lambda: None,
        )

        with patch("app.core.reranker.get_settings", return_value=mock_settings):
            results = await rerank_documents(
                query="Next.js Web Application",
                documents=docs,
                top_n=2,
            )

            assert len(results) == 2
            assert results[0].page_content == "Document Beta: Modern React Next.js Web App"
            assert results[0].metadata.get("reranker_score") == 0.98


def test_vector_store_validation_guardrails(ephemeral_vector_service: VectorStoreService):
    """
    Verify security guards prevent requests without workspace_id.
    """
    doc = Document(page_content="Test data", metadata={})

    with pytest.raises(ValueError, match="workspace_id is required"):
        ephemeral_vector_service.add_documents(workspace_id="", documents=[doc])

    with pytest.raises(ValueError, match="workspace_id is required"):
        ephemeral_vector_service.search_documents(workspace_id="", query="search terms")

    with pytest.raises(ValueError, match="workspace_id is required"):
        ephemeral_vector_service.search_documents_with_score(workspace_id="", query="search")

    with pytest.raises(ValueError, match="workspace_id is required"):
        ephemeral_vector_service.delete_documents(workspace_id="", ids=["id_1"])

    empty_results = ephemeral_vector_service.search_documents(
        workspace_id="ws_123",
        query="   ",
    )
    assert empty_results == []


def test_deterministic_document_id_idempotency(ephemeral_vector_service: VectorStoreService):
    """
    Verify re-adding identical documents uses deterministic IDs and doesn't duplicate embeddings.
    """
    doc = Document(
        page_content="Standard branding package for digital agency.",
        metadata={"id": "branding_pkg_1"},
    )

    ids_first = ephemeral_vector_service.add_documents(
        workspace_id="ws_idempotency",
        documents=[doc],
    )
    ids_second = ephemeral_vector_service.add_documents(
        workspace_id="ws_idempotency",
        documents=[doc],
    )

    assert len(ids_first) == 1
    assert len(ids_second) == 1
    assert ids_first[0] == ids_second[0]
