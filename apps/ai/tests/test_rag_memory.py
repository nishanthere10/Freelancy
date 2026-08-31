import pytest
from unittest.mock import AsyncMock, patch
from langchain_core.documents import Document

from app.services.rag_memory import RagMemoryPipeline, RagContext


@pytest.mark.asyncio
async def test_rag_memory_pipeline_empty_workspace():
    """Verify pipeline handles missing or empty workspace without throwing."""
    pipeline = RagMemoryPipeline()
    context = await pipeline.retrieve_benchmarks(
        workspace_id=None,
        query="Build a Next.js app",
    )

    assert isinstance(context, RagContext)
    assert context.has_benchmarks is False
    assert context.benchmark_count == 0
    assert "No prior workspace projects available" in context.formatted_prompt_block


@pytest.mark.asyncio
async def test_rag_memory_pipeline_retrieval_and_formatting():
    """Verify pipeline properly coordinates vector search, reranking, and formatted markdown blocks."""
    pipeline = RagMemoryPipeline()

    mock_docs = [
        Document(
            page_content="Project Alpha: E-Commerce store with Stripe and Neon DB. Budget $5000.",
            metadata={"title": "E-Commerce Alpha", "workspace_id": "ws_test_123"},
        ),
        Document(
            page_content="Project Beta: Mobile delivery app with geolocation. Budget $7000.",
            metadata={"title": "Delivery Beta", "workspace_id": "ws_test_123"},
        ),
    ]

    with patch.object(
        pipeline._vector_store,
        "asearch_and_rerank",
        new_callable=AsyncMock,
    ) as mock_search:
        mock_search.return_value = mock_docs

        context = await pipeline.retrieve_benchmarks(
            workspace_id="ws_test_123",
            query="Build an online marketplace store",
            top_k=10,
            top_n=2,
        )

        mock_search.assert_awaited_once_with(
            workspace_id="ws_test_123",
            query="Build an online marketplace store",
            top_k=10,
            top_n=2,
        )

        assert context.has_benchmarks is True
        assert context.benchmark_count == 2
        assert len(context.raw_documents) == 2
        assert "HISTORICAL WORKSPACE PROJECTS" in context.formatted_prompt_block
        assert "E-Commerce Alpha" in context.formatted_prompt_block
        assert "Delivery Beta" in context.formatted_prompt_block


@pytest.mark.asyncio
async def test_rag_memory_pipeline_handles_exception_fail_safely():
    """Verify pipeline falls back gracefully to default prompt block when search fails."""
    pipeline = RagMemoryPipeline()

    with patch.object(
        pipeline._vector_store,
        "asearch_and_rerank",
        side_effect=RuntimeError("Chroma connection refused"),
    ):
        context = await pipeline.retrieve_benchmarks(
            workspace_id="ws_fail_test",
            query="Build something",
        )

        assert context.has_benchmarks is False
        assert context.benchmark_count == 0
        assert "No prior workspace projects available" in context.formatted_prompt_block
