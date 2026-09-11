from app.graph.retriever import retrieve
from app.graph.state import GraphState


def retrieve_node(state: GraphState) -> GraphState:
    docs = retrieve(state["question"])
    chunks = [
        {
            "text": d.page_content,
            "source_url": d.metadata.get("source_url", ""),
            "title": d.metadata.get("title", ""),
        }
        for d in docs
    ]
    return {**state, "chunks": chunks}
