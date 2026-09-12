from langchain_core.documents import Document

from app.graph.retriever import retrieve, rewrite_query
from app.graph.state import GraphState


def _to_chunks(docs: list[Document]) -> list[dict]:
    return [
        {
            "text": d.page_content,
            "source_url": d.metadata.get("source_url", ""),
            "title": d.metadata.get("title", ""),
        }
        for d in docs
    ]


def retrieve_node(state: GraphState) -> GraphState:
    docs = retrieve(state["question"])
    return {**state, "chunks": _to_chunks(docs), "attempt": 1}


def rewrite_node(state: GraphState) -> GraphState:
    """Second attempt: search again with the question restated in doc vocabulary."""
    rewritten = rewrite_query(state["question"])
    docs = retrieve(rewritten)
    return {
        **state,
        "chunks": _to_chunks(docs),
        "rewritten_query": rewritten,
        "attempt": 2,
    }
