from dataclasses import dataclass, field
import logging
from typing import List, Optional
from langchain_core.documents import Document

from app.services.vector_store import vector_store_service

logger = logging.getLogger("ai_service.rag_memory")


@dataclass
class RagContext:
    """
    Structured container holding RAG benchmark retrieval results and token-budgeted prompt context.
    """
    raw_documents: List[Document] = field(default_factory=list)
    formatted_prompt_block: str = ""
    has_benchmarks: bool = False
    benchmark_count: int = 0


class RagMemoryPipeline:
    """
    Deep RAG Memory Pipeline encapsulating vector similarity search,
    cross-encoder reranking, and token-budgeted context formatting into a single cohesive interface.
    """

    def __init__(self):
        self._vector_store = vector_store_service

    def _format_context_block(self, docs: List[Document]) -> str:
        """
        Formats retrieved benchmark documents into a token-budgeted, structured context block.
        """
        if not docs:
            return (
                "--- HISTORICAL CONTEXT: No prior workspace projects available. "
                "Generate estimates from first principles. ---"
            )

        formatted_items = []
        for idx, doc in enumerate(docs, 1):
            content_preview = doc.page_content.strip()[:400]
            title = (
                doc.metadata.get("title")
                or doc.metadata.get("name")
                or f"Historical Project #{idx}"
            )
            formatted_items.append(f"[{idx}] {title}:\n{content_preview}")

        body = "\n\n".join(formatted_items)
        return (
            f"--- HISTORICAL WORKSPACE PROJECTS (USE AS BENCHMARKS FOR ESTIMATION) ---\n"
            f"{body}\n"
            f"------------------------------------------------------------------------"
        )

    async def retrieve_benchmarks(
        self,
        workspace_id: Optional[str],
        query: str,
        top_k: int = 10,
        top_n: int = 3,
    ) -> RagContext:
        """
        Single deep entry point for RAG retrieval.
        Executes vector search, applies Jina cross-encoder reranking, and constructs the prompt block.
        """
        if not workspace_id or not query.strip():
            return RagContext(
                raw_documents=[],
                formatted_prompt_block=self._format_context_block([]),
                has_benchmarks=False,
                benchmark_count=0,
            )

        try:
            retrieved_docs = await self._vector_store.asearch_and_rerank(
                workspace_id=workspace_id,
                query=query,
                top_k=top_k,
                top_n=top_n,
            )
            logger.info(
                "RAG Memory Pipeline: Retrieved and reranked %d benchmarks for workspace %s",
                len(retrieved_docs),
                workspace_id,
            )
            return RagContext(
                raw_documents=retrieved_docs,
                formatted_prompt_block=self._format_context_block(retrieved_docs),
                has_benchmarks=len(retrieved_docs) > 0,
                benchmark_count=len(retrieved_docs),
            )
        except Exception as err:
            logger.warning(
                "RAG Memory Pipeline retrieval failed: %s. Falling back to default context.",
                err,
            )
            return RagContext(
                raw_documents=[],
                formatted_prompt_block=self._format_context_block([]),
                has_benchmarks=False,
                benchmark_count=0,
            )


rag_memory_pipeline = RagMemoryPipeline()
