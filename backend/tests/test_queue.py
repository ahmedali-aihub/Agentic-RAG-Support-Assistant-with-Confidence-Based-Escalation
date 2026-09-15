import json

import pytest

from app.graph import escalation


@pytest.fixture
def queue(tmp_path, monkeypatch):
    """Point the queue at a temp file so tests never touch the real one."""
    path = tmp_path / "human_queue.json"
    monkeypatch.setattr(escalation, "QUEUE_PATH", path)
    return path


def ticket(tid: str, status: str = "open", created: str = "2026-01-01T00:00:00+00:00") -> dict:
    return {
        "id": tid,
        "created_at": created,
        "question": f"question {tid}",
        "summary": "summary",
        "related_sources": [],
        "status": status,
    }


def test_empty_queue_reads_as_empty(queue):
    assert escalation.list_tickets() == []


def test_enqueue_then_list(queue):
    escalation.enqueue_ticket(ticket("a"))
    items = escalation.list_tickets()
    assert [t["id"] for t in items] == ["a"]


def test_listed_newest_first(queue):
    escalation.enqueue_ticket(ticket("old", created="2026-01-01T00:00:00+00:00"))
    escalation.enqueue_ticket(ticket("new", created="2026-06-01T00:00:00+00:00"))
    assert [t["id"] for t in escalation.list_tickets()] == ["new", "old"]


def test_set_status_updates_and_stamps(queue):
    escalation.enqueue_ticket(ticket("a"))
    updated = escalation.set_ticket_status("a", "resolved", note="answered by hand")

    assert updated is not None
    assert updated["status"] == "resolved"
    assert updated["resolution_note"] == "answered by hand"
    assert updated["updated_at"]

    # The change survives a round trip to disk, not just in memory.
    stored = json.loads(queue.read_text(encoding="utf-8"))
    assert stored[0]["status"] == "resolved"


def test_set_status_on_missing_ticket_returns_none(queue):
    escalation.enqueue_ticket(ticket("a"))
    assert escalation.set_ticket_status("nope", "resolved") is None


def test_set_status_leaves_other_tickets_alone(queue):
    escalation.enqueue_ticket(ticket("a"))
    escalation.enqueue_ticket(ticket("b"))
    escalation.set_ticket_status("a", "resolved")

    by_id = {t["id"]: t for t in escalation.list_tickets()}
    assert by_id["a"]["status"] == "resolved"
    assert by_id["b"]["status"] == "open"


def test_note_is_optional(queue):
    escalation.enqueue_ticket(ticket("a"))
    updated = escalation.set_ticket_status("a", "in_progress")
    assert "resolution_note" not in updated


def test_stats_counts_by_status(queue):
    escalation.enqueue_ticket(ticket("a", "open"))
    escalation.enqueue_ticket(ticket("b", "open"))
    escalation.enqueue_ticket(ticket("c", "in_progress"))
    escalation.enqueue_ticket(ticket("d", "resolved"))

    s = escalation.queue_stats()
    assert (s["total"], s["open"], s["in_progress"], s["resolved"]) == (4, 2, 1, 1)
    assert s["resolution_rate"] == 0.25


def test_stats_on_empty_queue_does_not_divide_by_zero(queue):
    s = escalation.queue_stats()
    assert s["total"] == 0
    assert s["resolution_rate"] == 0.0
