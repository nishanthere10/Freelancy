import logging
import re
from typing import List
import httpx
from langchain_core.documents import Document

from app.core.config import get_settings

logger = logging.getLogger("ai_service.reranker")


def _mock_lexical_rerank(
    query: str,
    documents: List[Document],
    top_n: int,
) -> List[Document]:
    """
    Deterministic cross-encoder scoring for offline test environments.
    Scores documents based on query term frequency and token overlap.
    """
    if not documents:
        return []
    if len(documents) == 1:
        return documents

    query_tokens = set(re.findall(r"\w+", query.lower()))
    if not query_tokens:
        return documents[:top_n]

    scored_docs = []
    for doc in documents:
        doc_tokens = set(re.findall(r"\w+", doc.page_content.lower()))
        overlap = len(query_tokens.intersection(doc_tokens))
        score = overlap / max(len(query_tokens), 1)
        scored_docs.append((score, doc))

    # Sort descending by score, maintaining stable order for ties
    scored_docs.sort(key=lambda x: x[0], reverse=True)
    return [doc for _, doc in scored_docs[:top_n]]


async def rerank_documents(
    query: str,
    documents: List[Document],
    top_n: int = 3,
) -> List[Document]:
    """
    Reranks candidate documents against user query using Jina Reranker Cross-Encoder.
    Falls back to deterministic lexical scoring in test/offline environments.
    """
    if not documents:
        return []

    if len(documents) == 1:
        return documents

    settings = get_settings()
    api_key = settings.JINA_API_KEY

    is_live_key = (
        bool(api_key)
        and not api_key.startswith("jina_dev_mock")
        and not api_key.startswith("jina_your_")
        and settings.ENVIRONMENT != "test"
    )

    if not is_live_key:
        logger.info("Using mock lexical reranker (offline/test mode)")
        return _mock_lexical_rerank(query, documents, top_n)

    texts = [doc.page_content for doc in documents]
    payload = {
        "model": settings.JINA_RERANKER_MODEL,
        "query": query,
        "documents": texts,
        "top_n": top_n,
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://api.jina.ai/v1/rerank",
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
            data = response.json()

            results = data.get("results", [])
            reranked_docs: List[Document] = []
            for item in results:
                idx = item.get("index")
                if idx is not None and 0 <= idx < len(documents):
                    doc = documents[idx]
                    # Attach reranker relevance score into metadata
                    doc.metadata["reranker_score"] = float(item.get("relevance_score", 0.0))
                    reranked_docs.append(doc)

            return reranked_docs[:top_n]
    except Exception as exc:
        logger.warning(f"Jina Reranker API call failed: {exc}. Falling back to lexical ranking.")
        return _mock_lexical_rerank(query, documents, top_n)
