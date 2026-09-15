"""Feed answers written by human agents back into the knowledge base.

An escalation is a gap in the documentation index, and resolving one produces
exactly the text that would have closed it. Without this the same question
escalates every time it is asked, and the system never improves from its own
failures.

Entries added here are marked as agent-written so they can be told apart from
scraped documentation -- in citations, and when the index is rebuilt.
"""

import logging
from datetime import datetime, timezone

from langchain_core.documents import Document

from app.graph.retriever import get_vectorstore

logger = logging.getLogger(__name__)

SOURCE_KIND = "agent_answer"


def _doc_id(ticket_id: str) -> str:
    # Stable, so re-resolving a ticket replaces its entry rather than adding a
    # second copy that competes with the first in retrieval.
    return f"agent-{ticket_id}"


def index_agent_answer(ticket: dict, answer: str) -> Document:
    """Add a resolved ticket's answer to the retrievable index.

    The question is stored alongside the answer because retrieval matches
    against a customer's phrasing, not the agent's -- embedding the answer
    alone would make it hard to find with the words that caused the escalation.
    """
    question = ticket["question"]
    text = f"Question: {question}\n\nAnswer: {answer.strip()}"

    doc = Document(
        page_content=text,
        metadata={
            "source_url": f"internal://tickets/{ticket['id']}",
            "title": "Answered by a support agent",
            "source_kind": SOURCE_KIND,
            "ticket_id": ticket["id"],
            "indexed_at": datetime.now(timezone.utc).isoformat(),
            "chunk_index": 0,
        },
    )

    store = get_vectorstore()
    doc_id = _doc_id(ticket["id"])
    # Chroma upserts on a known id, so a corrected answer overwrites the old one.
    store.add_documents([doc], ids=[doc_id])
    logger.info("Indexed agent answer for ticket %s", ticket["id"])
    return doc


def remove_agent_answer(ticket_id: str) -> None:
    """Drop a ticket's answer from the index, for when it is reopened."""
    get_vectorstore().delete(ids=[_doc_id(ticket_id)])
    logger.info("Removed agent answer for ticket %s", ticket_id)


def learned_count() -> int:
    """How many answers the knowledge base has gained from resolved tickets."""
    got = get_vectorstore().get(where={"source_kind": SOURCE_KIND})
    return len(got.get("ids", []))
