import pytest

from app import learning


class FakeStore:
    """Stands in for Chroma, recording what the learning module asks of it."""

    def __init__(self):
        self.docs: dict[str, object] = {}

    def add_documents(self, docs, ids):
        for doc, doc_id in zip(docs, ids):
            self.docs[doc_id] = doc

    def delete(self, ids):
        for doc_id in ids:
            self.docs.pop(doc_id, None)

    def get(self, where=None):
        kind = (where or {}).get("source_kind")
        ids = [
            i
            for i, d in self.docs.items()
            if kind is None or d.metadata.get("source_kind") == kind
        ]
        return {"ids": ids}


@pytest.fixture
def store(monkeypatch):
    fake = FakeStore()
    monkeypatch.setattr(learning, "get_vectorstore", lambda: fake)
    return fake


TICKET = {"id": "abc123", "question": "How do I issue a partial refund?"}


def test_indexes_question_and_answer_together(store):
    """Retrieval matches a customer's phrasing, so the question must be embedded."""
    doc = learning.index_agent_answer(TICKET, "Use the Dashboard overflow menu.")

    assert TICKET["question"] in doc.page_content
    assert "Use the Dashboard overflow menu." in doc.page_content


def test_marks_provenance(store):
    doc = learning.index_agent_answer(TICKET, "An answer.")

    assert doc.metadata["source_kind"] == learning.SOURCE_KIND
    assert doc.metadata["ticket_id"] == "abc123"
    assert doc.metadata["source_url"] == "internal://tickets/abc123"
    assert doc.metadata["indexed_at"]


def test_answer_is_stripped(store):
    doc = learning.index_agent_answer(TICKET, "  padded answer \n")
    assert doc.page_content.endswith("padded answer")


def test_reindexing_replaces_rather_than_duplicates(store):
    """A corrected answer must not leave the old one competing in retrieval."""
    learning.index_agent_answer(TICKET, "First attempt.")
    learning.index_agent_answer(TICKET, "Corrected answer.")

    assert len(store.docs) == 1
    assert "Corrected answer." in next(iter(store.docs.values())).page_content


def test_remove_drops_the_entry(store):
    learning.index_agent_answer(TICKET, "An answer.")
    learning.remove_agent_answer("abc123")
    assert store.docs == {}


def test_remove_is_safe_when_nothing_was_indexed(store):
    learning.remove_agent_answer("never-indexed")  # must not raise
    assert store.docs == {}


def test_learned_count_only_counts_agent_answers(store):
    from langchain_core.documents import Document

    learning.index_agent_answer(TICKET, "An answer.")
    learning.index_agent_answer({"id": "xyz", "question": "Another?"}, "Another answer.")
    # A scraped documentation chunk should not be counted as something learned.
    store.docs["doc-1"] = Document(page_content="scraped", metadata={"source_kind": "docs"})

    assert learning.learned_count() == 2
