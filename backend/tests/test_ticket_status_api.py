"""The customer-facing ticket lookup, tested at the HTTP layer.

This is specifically about what crosses the API boundary: a ticket number is
the only access control there is, so the response shape itself is the privacy
guarantee. TicketOut (the agent view) is allowed to carry the triage summary
and judge reasoning; TicketStatusOut must not, regardless of what the stored
ticket dict happens to contain.
"""

import pytest
from fastapi.testclient import TestClient

from app.graph import escalation


@pytest.fixture
def client(tmp_path, monkeypatch):
    # Route the queue at a temp file before the app (and its lifespan) exist,
    # and skip the model warmup -- this suite never calls /ask.
    monkeypatch.setattr(escalation, "QUEUE_PATH", tmp_path / "human_queue.json")

    import app.main as main

    async def noop_lifespan(_app):
        yield

    monkeypatch.setattr(main, "lifespan", noop_lifespan)
    main.app.router.lifespan_context = noop_lifespan

    return TestClient(main.app)


def seed(status: str = "open", **overrides) -> dict:
    ticket = {
        "id": "abc123",
        "created_at": "2026-01-01T00:00:00+00:00",
        "question": "Why did my payout fail?",
        "summary": "Internal triage notes the customer must never see.",
        "confidence_score": 0.2,
        "confidence_reasoning": "Judge's internal reasoning, also not for the customer.",
        "judge_model": "some-internal-model-name",
        "related_sources": [],
        "status": status,
        **overrides,
    }
    escalation.enqueue_ticket(ticket)
    return ticket


def test_open_ticket_has_no_answer_yet(client):
    seed(status="open")
    res = client.get("/tickets/abc123/status")

    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "open"
    assert body["answer"] is None


def test_resolved_ticket_returns_the_agent_answer(client):
    seed(status="resolved", agent_answer="Use test card 4242 4242 4242 4242.")
    res = client.get("/tickets/abc123/status")

    assert res.json()["answer"] == "Use test card 4242 4242 4242 4242."


def test_in_progress_ticket_has_no_answer_yet(client):
    seed(status="in_progress", agent_answer="draft, not confirmed")
    res = client.get("/tickets/abc123/status")

    # Only a resolved ticket's answer is trustworthy enough to hand to a customer.
    assert res.json()["answer"] is None


def test_internal_fields_never_appear_in_the_response(client):
    seed(status="resolved", agent_answer="the real answer")
    body = client.get("/tickets/abc123/status").json()

    assert set(body.keys()) == {"id", "question", "status", "created_at", "answer"}
    assert "summary" not in body
    assert "confidence_score" not in body
    assert "confidence_reasoning" not in body
    assert "judge_model" not in body
    assert "Internal triage notes" not in str(body)
    assert "internal-model-name" not in str(body)


def test_unknown_ticket_id_is_404(client):
    res = client.get("/tickets/does-not-exist/status")
    assert res.status_code == 404


def test_lookup_does_not_leak_other_tickets(client):
    seed(status="open")
    escalation.enqueue_ticket(
        {
            "id": "other-ticket",
            "created_at": "2026-01-01T00:00:00+00:00",
            "question": "Someone else's private question",
            "summary": "s",
            "related_sources": [],
            "status": "open",
        }
    )

    body = client.get("/tickets/abc123/status").json()
    assert "Someone else" not in str(body)
