from app.vectorstore.sqlite_store import SQLiteVectorStore


def test_sqlite_vectorstore_cosine_search(tmp_path):
    store = SQLiteVectorStore(tmp_path / "rag.db")
    store.replace_chunks(
        [
            {
                "chunk_id": "a",
                "title": "A",
                "source_document": "a.md",
                "text": "alpha",
                "token_count": 1,
                "embedding": [1.0, 0.0],
            },
            {
                "chunk_id": "b",
                "title": "B",
                "source_document": "b.md",
                "text": "beta",
                "token_count": 1,
                "embedding": [0.0, 1.0],
            },
        ],
        "hash",
    )

    results = store.search([1.0, 0.0], top_k=2)

    assert [result.chunk_id for result in results] == ["a", "b"]
    assert results[0].similarity == 1.0
