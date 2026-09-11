from app.graph.confidence import format_chunks_for_prompt, route_on_confidence


def test_format_chunks_empty():
    assert format_chunks_for_prompt([]) == "(no chunks retrieved)"


def test_format_chunks_includes_title_and_text():
    chunks = [{"title": "Refunds", "text": "You can refund a charge via the API."}]
    formatted = format_chunks_for_prompt(chunks)
    assert "Refunds" in formatted
    assert "You can refund a charge via the API." in formatted


def test_route_on_confidence_answer():
    assert route_on_confidence({"is_confident": True}) == "answer"


def test_route_on_confidence_escalate():
    assert route_on_confidence({"is_confident": False}) == "escalate"


def test_route_on_confidence_missing_key_defaults_to_escalate():
    assert route_on_confidence({}) == "escalate"
