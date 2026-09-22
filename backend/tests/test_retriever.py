from langchain_core.documents import Document

from app.graph import retriever


def doc(text: str, doc_id: str = "d") -> Document:
    return Document(page_content=text, metadata={"id": doc_id})


class FakeReranker:
    """Scores by position in a caller-supplied ranking, worst first.

    Standing in for the cross-encoder: what matters here is that `rerank`
    reorders by score and truncates correctly, not what the model itself
    predicts, which is exercised live in test_learning.py against a real store.
    """

    def __init__(self, order: list[str]):
        self.order = order

    def predict(self, pairs):
        return [float(self.order.index(text)) for _, text in pairs]


def test_rerank_orders_by_score_descending(monkeypatch):
    docs = [doc("low"), doc("high"), doc("mid")]
    monkeypatch.setattr(retriever, "get_reranker", lambda: FakeReranker(["low", "mid", "high"]))

    ranked = retriever.rerank("q", docs, top_k=3)

    assert [d.page_content for d in ranked] == ["high", "mid", "low"]


def test_rerank_truncates_to_top_k(monkeypatch):
    docs = [doc(str(i)) for i in range(5)]
    monkeypatch.setattr(retriever, "get_reranker", lambda: FakeReranker([str(i) for i in range(5)]))

    ranked = retriever.rerank("q", docs, top_k=2)

    assert len(ranked) == 2
    assert [d.page_content for d in ranked] == ["4", "3"]


def test_rerank_annotates_every_candidate_not_just_kept_ones(monkeypatch):
    """The dropped candidates' scores matter too -- they explain why they lost."""
    docs = [doc("a"), doc("b"), doc("c")]
    monkeypatch.setattr(retriever, "get_reranker", lambda: FakeReranker(["a", "b", "c"]))

    retriever.rerank("q", docs, top_k=1)

    assert all(d.metadata.get("rerank_score") is not None for d in docs)


def test_rerank_on_empty_input_skips_the_model_entirely(monkeypatch):
    """Calling the model with zero pairs would be pure overhead."""
    calls = []
    monkeypatch.setattr(
        retriever, "get_reranker", lambda: (_ for _ in ()).throw(AssertionError("should not load"))
    )
    assert retriever.rerank("q", [], top_k=5) == []
    assert calls == []


def test_retrieve_reranks_a_wider_pool_than_it_returns(monkeypatch):
    seen = {}

    class FakeStore:
        def similarity_search(self, question, k):
            seen["k"] = k
            return [doc(str(i)) for i in range(k)]

    monkeypatch.setattr(retriever, "get_vectorstore", lambda: FakeStore())
    monkeypatch.setattr(retriever.settings, "rerank_enabled", True)
    monkeypatch.setattr(retriever.settings, "retrieval_candidate_k", 20)
    monkeypatch.setattr(retriever.settings, "retrieval_top_k", 5)
    monkeypatch.setattr(
        retriever, "get_reranker", lambda: FakeReranker([str(i) for i in range(20)])
    )

    result = retriever.retrieve("question")

    assert seen["k"] == 20, "must pull the wider candidate pool, not just top_k"
    assert len(result) == 5


def test_retrieve_skips_reranking_when_disabled(monkeypatch):
    class FakeStore:
        def similarity_search(self, question, k):
            return [doc(str(i)) for i in range(k)]

    monkeypatch.setattr(retriever, "get_vectorstore", lambda: FakeStore())
    monkeypatch.setattr(retriever.settings, "rerank_enabled", False)
    monkeypatch.setattr(retriever.settings, "retrieval_top_k", 5)
    monkeypatch.setattr(
        retriever, "get_reranker", lambda: (_ for _ in ()).throw(AssertionError("should not load"))
    )

    result = retriever.retrieve("question")
    assert len(result) == 5


def test_rewrite_query_falls_back_to_original_on_total_failure(monkeypatch):
    def fail(*a, **kw):
        raise retriever.AllModelsFailed("all down")

    monkeypatch.setattr(retriever, "invoke_with_fallback", fail)
    assert retriever.rewrite_query("why declined") == "why declined"


def test_rewrite_query_takes_only_the_first_line(monkeypatch):
    """A model sometimes adds commentary after the query; only the query is used."""
    monkeypatch.setattr(
        retriever, "invoke_with_fallback", lambda *a, **kw: ("card decline codes\nextra", "m")
    )
    assert retriever.rewrite_query("q") == "card decline codes"


def test_rewrite_query_strips_wrapping_quotes(monkeypatch):
    monkeypatch.setattr(
        retriever, "invoke_with_fallback", lambda *a, **kw: ('"card decline codes"', "m")
    )
    assert retriever.rewrite_query("q") == "card decline codes"


def test_rewrite_query_falls_back_when_model_returns_nothing_usable(monkeypatch):
    monkeypatch.setattr(retriever, "invoke_with_fallback", lambda *a, **kw: ("   ", "m"))
    assert retriever.rewrite_query("original question") == "original question"
