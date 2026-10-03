from functools import lru_cache

from langgraph.graph import END, StateGraph

from app.graph.answer import generate_answer
from app.graph.confidence import check_confidence, route_on_confidence
from app.graph.escalation import escalate
from app.graph.meta import answer_self_question, is_self_question
from app.graph.nodes import retrieve_node, rewrite_node
from app.graph.state import GraphState


def _route_entry(state: GraphState) -> str:
    return "answer_self" if is_self_question(state["question"]) else "retrieve"


@lru_cache
def build_graph():
    graph = StateGraph(GraphState)

    graph.add_node("retrieve", retrieve_node)
    graph.add_node("check_confidence", check_confidence)
    graph.add_node("rewrite", rewrite_node)
    graph.add_node("answer", generate_answer)
    graph.add_node("escalate", escalate)
    graph.add_node("answer_self", answer_self_question)

    # A question about the assistant itself is answered directly, before
    # retrieval runs at all -- there is no documentation that could ever
    # satisfy the judge for a question that isn't about the documentation.
    graph.set_conditional_entry_point(
        _route_entry, {"retrieve": "retrieve", "answer_self": "answer_self"}
    )
    graph.add_edge("retrieve", "check_confidence")

    graph.add_conditional_edges(
        "check_confidence",
        route_on_confidence,
        {"answer": "answer", "rewrite": "rewrite", "escalate": "escalate"},
    )

    # The cycle: a rewritten search is judged by the same node, which routes to
    # escalate the second time through rather than rewriting again.
    graph.add_edge("rewrite", "check_confidence")

    graph.add_edge("answer", END)
    graph.add_edge("escalate", END)
    graph.add_edge("answer_self", END)

    return graph.compile()


def run_query(question: str) -> GraphState:
    app = build_graph()
    return app.invoke({"question": question})
