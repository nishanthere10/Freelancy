import hashlib
import logging
from typing import List
from langchain_core.embeddings import Embeddings
from langchain_community.embeddings import JinaEmbeddings

from app.core.config import get_settings

logger = logging.getLogger("ai_service.embeddings")


class DeterministicMockEmbeddings(Embeddings):
    """
    Deterministic 768-dimensional mock embeddings for testing and offline environments.
    Produces repeatable normalized vectors from MD5/SHA256 hashes of input text.
    """

    def __init__(self, dimension: int = 768):
        self.dimension = dimension

    def _embed_text(self, text: str) -> List[float]:
        # Hash text into deterministic pseudo-random float vector
        hasher = hashlib.sha256(text.encode("utf-8"))
        digest = hasher.digest()
        
        # Build normalized floats between -1.0 and 1.0
        raw_vector = []
        for i in range(self.dimension):
            byte_val = digest[i % len(digest)]
            # Normalize to [-1.0, 1.0] with small variation based on position
            normalized = ((byte_val / 255.0) * 2.0 - 1.0) + (i / self.dimension) * 0.1
            raw_vector.append(normalized)
            
        # Compute L2 norm
        norm = sum(x * x for x in raw_vector) ** 0.5 or 1.0
        return [x / norm for x in raw_vector]

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [self._embed_text(t) for t in texts]

    def embed_query(self, text: str) -> List[float]:
        return self._embed_text(text)


def get_embeddings_provider() -> Embeddings:
    """
    Returns configured embeddings instance.
    Uses real JinaEmbeddings if live key is provided, otherwise falls back to DeterministicMockEmbeddings.
    """
    settings = get_settings()
    api_key = settings.JINA_API_KEY

    # Check if a live production key is configured
    is_live_key = (
        bool(api_key)
        and not api_key.startswith("jina_dev_mock")
        and not api_key.startswith("jina_your_")
        and settings.ENVIRONMENT != "test"
    )

    if is_live_key:
        logger.info("Initializing JinaEmbeddings (jina-embeddings-v2-base-en)")
        return JinaEmbeddings(
            jina_api_key=api_key,
            model_name="jina-embeddings-v2-base-en",
        )

    logger.info("Using DeterministicMockEmbeddings (offline/test mode)")
    return DeterministicMockEmbeddings(dimension=768)


embeddings_provider = get_embeddings_provider()
