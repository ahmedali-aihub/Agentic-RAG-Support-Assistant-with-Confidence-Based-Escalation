import pytest

from app.graph.confidence import (
    format_chunks_for_prompt,
    parse_judgement,
    route_on_confidence,
)


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


def test_parse_judgement_plain_json():
    result = parse_judgement('{"confident": true, "score": 0.9, "reasoning": "clear"}')
    assert result == {"confident": True, "score": 0.9, "reasoning": "clear"}


def test_parse_judgement_strips_markdown_fence():
    raw = '```json\n{"confident": false, "score": 0.1, "reasoning": "unrelated"}\n```'
    assert parse_judgement(raw)["confident"] is False


def test_parse_judgement_extracts_object_from_surrounding_prose():
    raw = 'Here is my verdict: {"confident": true, "score": 0.8, "reasoning": "ok"} Hope that helps!'
    assert parse_judgement(raw)["score"] == 0.8


def test_parse_judgement_rejects_non_json():
    with pytest.raises(Exception):
        parse_judgement("I think the docs probably cover this.")


def test_parse_judgement_rejects_json_missing_confident_field():
    with pytest.raises(ValueError):
        parse_judgement('{"score": 0.9}')
