import asyncio
import hashlib
import logging
from typing import List, Optional, Tuple
import chromadb
from chromadb.config import Settings as ChromaSettings
from langchain_chroma import Chroma
from langchain_core.documents import Document

from app.core.config import get_settings
from app.core.embeddings import get_embeddings_provider
from app.core.reranker import rerank_documents

logger = logging.getLogger("ai_service.vector_store")


class VectorStoreService:
    """
    Multi-tenant Chroma Vector Store Service.
    Enforces strict tenant isolation: every document must have workspace_id metadata,
    and every similarity search forces a filter on workspace_id.
    Provides synchronous and async execution methods for non-blocking FastAPI operations.
    """

    def __init__(self, client: Optional[chromadb.ClientAPI] = None):
        self._custom_client = client
        self._vector_store: Optional[Chroma] = None

    def _get_client(self) -> chromadb.ClientAPI:
        if self._custom_client is not None:
            return self._custom_client

        settings = get_settings()

        if settings.CHROMA_URL:
            logger.info(f"Connecting to Chroma HTTP Server at {settings.CHROMA_URL}")
            headers = {}
            if settings.CHROMA_AUTH_TOKEN:
                headers["Authorization"] = f"Bearer {settings.CHROMA_AUTH_TOKEN}"
            return chromadb.HttpClient(
                host=settings.CHROMA_URL,
                headers=headers,
                settings=ChromaSettings(anonymized_telemetry=False),
            )

        logger.info("Initializing in-memory EphemeralClient for Chroma")
        return chromadb.EphemeralClient(
            settings=ChromaSettings(anonymized_telemetry=False)
        )

    def get_vector_store(self) -> Chroma:
        """
        Returns or lazily initializes the LangChain Chroma vector store.
        """
        if self._vector_store is None:
            settings = get_settings()
            client = self._get_client()
            embeddings = get_embeddings_provider()

            self._vector_store = Chroma(
                client=client,
                collection_name=settings.CHROMA_COLLECTION_NAME,
                embedding_function=embeddings,
            )
        return self._vector_store

    def add_documents(
        self,
        workspace_id: str,
        documents: List[Document],
        ids: Optional[List[str]] = None,
    ) -> List[str]:
        """
        Add documents to the vector store with strict workspace_id metadata enforcement
        and deterministic document ID hashing for idempotency.
        """
        if not workspace_id:
            raise ValueError("workspace_id is required for multi-tenant data storage")

        if not documents:
            return []

        vector_store = self.get_vector_store()
        sanitized_docs = []
        doc_ids = []

        for idx, doc in enumerate(documents):
            # Guarantee workspace_id exists in metadata
            doc.metadata["workspace_id"] = workspace_id

            # Determine deterministic document ID
            if ids and idx < len(ids):
                assigned_id = ids[idx]
            else:
                entity_id = str(doc.metadata.get("id") or doc.metadata.get("entityId") or "")
                raw_key = f"{workspace_id}:{entity_id}:{idx}:{doc.page_content}"
                assigned_id = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

            doc_ids.append(assigned_id)
            sanitized_docs.append(doc)

        logger.info(
            f"Indexing {len(sanitized_docs)} documents into vector store for workspace {workspace_id}"
        )
        return vector_store.add_documents(documents=sanitized_docs, ids=doc_ids)

    async def aadd_documents(
        self,
        workspace_id: str,
        documents: List[Document],
        ids: Optional[List[str]] = None,
    ) -> List[str]:
        """
        Async non-blocking wrapper for add_documents.
        """
        return await asyncio.to_thread(self.add_documents, workspace_id, documents, ids)

    def search_documents(
        self,
        workspace_id: str,
        query: str,
        top_k: int = 5,
    ) -> List[Document]:
        """
        Perform similarity search strictly scoped to the caller's workspace_id.
        Applies both database-level filter and defense-in-depth post-verification.
        """
        if not workspace_id:
            raise ValueError("workspace_id is required for multi-tenant search")

        if not query.strip():
            return []

        vector_store = self.get_vector_store()

        # Database-level filter forced for Chroma
        search_filter = {"workspace_id": workspace_id}

        raw_results = vector_store.similarity_search(
            query=query,
            k=top_k,
            filter=search_filter,
        )

        # Defense-in-depth: Ensure no cross-tenant leakage occurred
        sanitized_results = [
            doc
            for doc in raw_results
            if doc.metadata.get("workspace_id") == workspace_id
        ]

        return sanitized_results

    async def asearch_documents(
        self,
        workspace_id: str,
        query: str,
        top_k: int = 5,
    ) -> List[Document]:
        """
        Async non-blocking wrapper for search_documents.
        """
        return await asyncio.to_thread(self.search_documents, workspace_id, query, top_k)

    def search_documents_with_score(
        self,
        workspace_id: str,
        query: str,
        top_k: int = 5,
    ) -> List[Tuple[Document, float]]:
        """
        Perform similarity search with distance / relevance score strictly scoped to caller workspace.
        """
        if not workspace_id:
            raise ValueError("workspace_id is required for multi-tenant search")

        if not query.strip():
            return []

        vector_store = self.get_vector_store()
        search_filter = {"workspace_id": workspace_id}

        raw_results = vector_store.similarity_search_with_score(
            query=query,
            k=top_k,
            filter=search_filter,
        )

        sanitized_results = [
            (doc, score)
            for doc, score in raw_results
            if doc.metadata.get("workspace_id") == workspace_id
        ]

        return sanitized_results

    async def asearch_and_rerank(
        self,
        workspace_id: str,
        query: str,
        top_k: int = 10,
        top_n: int = 3,
    ) -> List[Document]:
        """
        Retrieve candidate documents via Chroma vector search, then apply Jina Cross-Encoder reranker.
        """
        candidates = await self.asearch_documents(
            workspace_id=workspace_id,
            query=query,
            top_k=top_k,
        )
        if not candidates:
            return []

        return await rerank_documents(
            query=query,
            documents=candidates,
            top_n=top_n,
        )

    def search_and_rerank(
        self,
        workspace_id: str,
        query: str,
        top_k: int = 10,
        top_n: int = 3,
    ) -> List[Document]:
        """
        Synchronous wrapper for search_and_rerank.
        """
        candidates = self.search_documents(
            workspace_id=workspace_id,
            query=query,
            top_k=top_k,
        )
        if not candidates:
            return []

        # Run async reranker safely in isolated thread if inside an existing event loop
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                return executor.submit(asyncio.run, rerank_documents(query, candidates, top_n)).result()
        
        return asyncio.run(rerank_documents(query, candidates, top_n))

    def delete_documents(
        self,
        workspace_id: str,
        ids: List[str],
    ) -> None:
        """
        Delete specific document IDs from vector store.
        """
        if not workspace_id:
            raise ValueError("workspace_id is required for document deletion")

        if not ids:
            return

        vector_store = self.get_vector_store()
        vector_store.delete(ids=ids)


vector_store_service = VectorStoreService()
