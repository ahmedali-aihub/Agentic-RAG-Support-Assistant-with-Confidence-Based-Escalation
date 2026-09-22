"""Exercises the compiled graph itself, not stand-ins for LangGraph.

Every LLM-calling node is monkeypatched at the point builder.py imports it, so
these run the real StateGraph -- real conditional edges, real cycle -- against
scripted judge verdicts. That is the only way to test that the wiring (as
opposed to any single node) does what routing.py claims it does.
"""

import pytest

from app.graph import builder


@pytest.fixture(autouse=True)
def clear_graph_cache():
    # build_graph is memoised; a stale compiled graph from an earlier test
    # would silently ignore this test's patches.
    builder.build_graph.cache_clear()
    yield
    builder.build_graph.cache_clear()


def fake_retrieve(chunks):
    def node(state):
        return {**state, "chunks": chunks, "attempt": 1}

    return node


def fake_rewrite(chunks):
    def node(state):
        return {**state, "chunks": chunks, "rewritten_query": "rewritten", "attempt": 2}

    return node


def scripted_judge(verdicts):
    """Returns confident=verdicts[call_index], then holds the last value."""
    calls = {"n": 0}

    def node(state):
        i = min(calls["n"], len(verdicts) - 1)
        calls["n"] += 1
        confident = verdicts[i]
        return {
            **state,
            "is_confident": confident,
            "confidence_score": 0.9 if confident else 0.2,
            "judge_model": "fake-judge",
        }

    return node


def fake_answer(state):
    return {**state, "answer": "the answer", "path_taken": "answered"}


def fake_escalate(state):
    return {**state, "answer": "escalated", "path_taken": "escalated", "escalation_id": "t1"}


def test_confident_first_pass_answers_without_rewriting(monkeypatch):
    monkeypatch.setattr(builder, "retrieve_node", fake_retrieve([{"text": "good chunk"}]))
    monkeypatch.setattr(builder, "check_confidence", scripted_judge([True]))
    monkeypatch.setattr(builder, "generate_answer", fake_answer)
    monkeypatch.setattr(builder, "escalate", fake_escalate)

    result = builder.build_graph().invoke({"question": "q"})

    assert result["path_taken"] == "answered"
    assert result["attempt"] == 1


def test_low_confidence_then_recovery_answers_after_one_retry(monkeypatch):
    monkeypatch.setattr(builder, "retrieve_node", fake_retrieve([{"text": "weak"}]))
    monkeypatch.setattr(builder, "rewrite_node", fake_rewrite([{"text": "better chunk"}]))
    monkeypatch.setattr(builder, "check_confidence", scripted_judge([False, True]))
    monkeypatch.setattr(builder, "generate_answer", fake_answer)
    monkeypatch.setattr(builder, "escalate", fake_escalate)

    result = builder.build_graph().invoke({"question": "q"})

    assert result["path_taken"] == "answered"
    assert result["attempt"] == 2
    assert result["rewritten_query"] == "rewritten"


def test_low_confidence_on_both_passes_escalates_not_loops_forever(monkeypatch):
    """The bounded retry is the point: a bad question must not spin."""
    monkeypatch.setattr(builder, "retrieve_node", fake_retrieve([{"text": "weak"}]))
    monkeypatch.setattr(builder, "rewrite_node", fake_rewrite([{"text": "still weak"}]))
    monkeypatch.setattr(builder, "check_confidence", scripted_judge([False, False]))
    monkeypatch.setattr(builder, "generate_answer", fake_answer)
    monkeypatch.setattr(builder, "escalate", fake_escalate)

    result = builder.build_graph().invoke({"question": "q"})

    assert result["path_taken"] == "escalated"
    assert result["attempt"] == 2


def test_no_chunks_retrieved_still_reaches_a_terminal_state(monkeypatch):
    monkeypatch.setattr(builder, "retrieve_node", fake_retrieve([]))
    monkeypatch.setattr(builder, "rewrite_node", fake_rewrite([]))
    monkeypatch.setattr(builder, "check_confidence", scripted_judge([False, False]))
    monkeypatch.setattr(builder, "generate_answer", fake_answer)
    monkeypatch.setattr(builder, "escalate", fake_escalate)

    result = builder.build_graph().invoke({"question": "q"})
    assert result["path_taken"] == "escalated"


def test_run_query_returns_final_state(monkeypatch):
    monkeypatch.setattr(builder, "retrieve_node", fake_retrieve([{"text": "x"}]))
    monkeypatch.setattr(builder, "check_confidence", scripted_judge([True]))
    monkeypatch.setattr(builder, "generate_answer", fake_answer)
    monkeypatch.setattr(builder, "escalate", fake_escalate)

    result = builder.run_query("does this work?")
    assert result["question"] == "does this work?"
    assert result["answer"] == "the answer"


def test_graph_has_no_edge_out_of_rewrite_back_to_itself(monkeypatch):
    """Structural check that the retry is bounded by the graph shape, not just
    by the judge's own bookkeeping -- rewrite has exactly one way out."""
    monkeypatch.setattr(builder, "retrieve_node", fake_retrieve([]))
    monkeypatch.setattr(builder, "check_confidence", scripted_judge([False]))
    monkeypatch.setattr(builder, "generate_answer", fake_answer)
    monkeypatch.setattr(builder, "escalate", fake_escalate)

    graph = builder.build_graph().get_graph()
    rewrite_targets = {e.target for e in graph.edges if e.source == "rewrite"}
    assert rewrite_targets == {"check_confidence"}
