import pytest

from app.config import Settings
from app.services.embeddings import LocalEmbeddingClient
from app.services.llm import FALLBACK_ANSWER, LocalLLMClient
from app.services.rag import RAGService
from app.vectorstore.sqlite_store import SQLiteVectorStore


@pytest.mark.asyncio
async def test_rag_returns_fallback_below_threshold(tmp_path):
    settings = Settings(
        database_path=tmp_path / "rag.db",
        similarity_threshold=1.1,
        top_k=1,
        embedding_provider="local",
        llm_provider="local",
    )
    store = SQLiteVectorStore(settings.database_path)
    embedder = LocalEmbeddingClient(settings.embedding_dimensions)
    embedding = (await embedder.embed(["password reset instructions"]))[0]
    store.replace_chunks(
        [
            {
                "chunk_id": "chunk-1",
                "title": "Password",
                "source_document": "password.md",
                "text": "Use Forgot password to reset an account password.",
                "token_count": 9,
                "embedding": embedding,
            }
        ],
        "hash",
    )
    service = RAGService(settings, store, embedder, LocalLLMClient())

    response = await service.answer("session", "How do I reset my password?")

    assert response.fallback is True
    assert response.answer == FALLBACK_ANSWER
