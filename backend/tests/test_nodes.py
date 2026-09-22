from langchain_core.documents import Document

from app.graph.nodes import _to_chunks, retrieve_node, rewrite_node


def doc(text: str, url: str = "https://docs.stripe.com/x", title: str = "X", score=None):
    return Document(
        page_content=text,
        metadata={"source_url": url, "title": title, "rerank_score": score},
    )


def test_to_chunks_maps_document_fields():
    chunks = _to_chunks([doc("hello", url="https://x", title="Title", score=1.5)])
    assert chunks == [
        {"text": "hello", "source_url": "https://x", "title": "Title", "rerank_score": 1.5}
    ]


def test_to_chunks_defaults_missing_metadata():
    bare = Document(page_content="text", metadata={})
    assert _to_chunks([bare]) == [
        {"text": "text", "source_url": "", "title": "", "rerank_score": None}
    ]


def test_to_chunks_empty_list():
    assert _to_chunks([]) == []


def test_retrieve_node_populates_chunks_and_marks_first_attempt(monkeypatch):
    import app.graph.nodes as nodes

    monkeypatch.setattr(nodes, "retrieve", lambda q: [doc("a"), doc("b")])

    result = retrieve_node({"question": "how do refunds work?"})

    assert len(result["chunks"]) == 2
    assert result["attempt"] == 1
    assert result["question"] == "how do refunds work?"


def test_retrieve_node_preserves_existing_state(monkeypatch):
    import app.graph.nodes as nodes

    monkeypatch.setattr(nodes, "retrieve", lambda q: [])

    result = retrieve_node({"question": "q", "escalation_id": "keep-me"})
    assert result["escalation_id"] == "keep-me"


def test_rewrite_node_searches_with_the_rewritten_query(monkeypatch):
    import app.graph.nodes as nodes

    seen = {}

    def fake_retrieve(q):
        seen["query"] = q
        return [doc("found via rewrite")]

    monkeypatch.setattr(nodes, "rewrite_query", lambda q: "refund policy documentation")
    monkeypatch.setattr(nodes, "retrieve", fake_retrieve)

    result = rewrite_node({"question": "why no money back"})

    assert seen["query"] == "refund policy documentation"
    assert result["rewritten_query"] == "refund policy documentation"
    assert result["attempt"] == 2
    assert len(result["chunks"]) == 1


def test_rewrite_node_marks_second_attempt_even_after_first(monkeypatch):
    import app.graph.nodes as nodes

    monkeypatch.setattr(nodes, "rewrite_query", lambda q: q)
    monkeypatch.setattr(nodes, "retrieve", lambda q: [])

    result = rewrite_node({"question": "q", "attempt": 1})
    assert result["attempt"] == 2
