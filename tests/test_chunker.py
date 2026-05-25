from app.services.chunker import chunk_document


def test_chunk_document_applies_metadata_and_limits():
    content = " ".join(f"token{i}" for i in range(900))

    chunks = chunk_document(
        title="Title",
        source_document="source.md",
        content=content,
        min_tokens=300,
        max_tokens=500,
        overlap_tokens=50,
    )

    assert len(chunks) == 2
    assert chunks[0].title == "Title"
    assert chunks[0].source_document == "source.md"
    assert chunks[0].chunk_id == "source.md::chunk-0"
    assert 300 <= chunks[0].token_count <= 500
    assert 300 <= chunks[1].token_count <= 500
