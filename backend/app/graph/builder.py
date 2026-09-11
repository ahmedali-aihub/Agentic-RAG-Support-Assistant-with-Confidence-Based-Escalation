from functools import lru_cache

from langgraph.graph import END, StateGraph

from app.graph.answer import generate_answer
from app.graph.confidence import check_confidence, route_on_confidence
from app.graph.escalation import escalate
from app.graph.nodes import retrieve_node
from app.graph.state import GraphState


@lru_cache
def build_graph():
    graph = StateGraph(GraphState)

    graph.add_node("retrieve", retrieve_node)
    graph.add_node("check_confidence", check_confidence)
    graph.add_node("answer", generate_answer)
    graph.add_node("escalate", escalate)

    graph.set_entry_point("retrieve")
    graph.add_edge("retrieve", "check_confidence")
    graph.add_conditional_edges(
        "check_confidence",
        route_on_confidence,
        {"answer": "answer", "escalate": "escalate"},
    )
    graph.add_edge("answer", END)
    graph.add_edge("escalate", END)

    return graph.compile()


def run_query(question: str) -> GraphState:
    app = build_graph()
    result = app.invoke({"question": question})
    return result
