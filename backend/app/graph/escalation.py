import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock

from langchain_core.messages import HumanMessage, SystemMessage

from app.graph.confidence import format_chunks_for_prompt
from app.graph.state import GraphState, timed
from app.llm import AllModelsFailed, invoke_with_fallback

QUEUE_PATH = Path(__file__).resolve().parents[2] / "data" / "processed" / "human_queue.json"
_queue_lock = Lock()

SYSTEM_PROMPT = """You are triaging a customer support question that a documentation-based \
assistant could not answer confidently. Write a brief internal summary for the human agent \
who will pick this up, including:
- What the customer is asking
- What (if anything) partial/related documentation was found
- Why it's likely insufficient

Keep it to 2-4 sentences. Write for a support agent, not the customer.
"""


def _read_queue() -> list[dict]:
    if not QUEUE_PATH.exists():
        return []
    return json.loads(QUEUE_PATH.read_text(encoding="utf-8"))


def _write_queue(items: list[dict]) -> None:
    QUEUE_PATH.parent.mkdir(parents=True, exist_ok=True)
    QUEUE_PATH.write_text(json.dumps(items, indent=2), encoding="utf-8")


def enqueue_ticket(ticket: dict) -> None:
    with _queue_lock:
        items = _read_queue()
        items.append(ticket)
        _write_queue(items)


def list_tickets() -> list[dict]:
    with _queue_lock:
        return _read_queue()


@timed("escalate")
def escalate(state: GraphState) -> GraphState:
    question = state["question"]
    chunks = state.get("chunks", [])

    context = format_chunks_for_prompt(chunks)
    user_prompt = f"Question: {question}\n\nPartial/related excerpts found:\n{context}"

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=user_prompt),
    ]

    # The ticket must be filed even if every model is down — losing the
    # customer's question is worse than filing it without a triage summary.
    try:
        summary, summary_model = invoke_with_fallback(messages, temperature=0.2)
    except AllModelsFailed:
        summary = "(Automatic triage summary unavailable — see the raw question.)"
        summary_model = None

    ticket_id = str(uuid.uuid4())[:8]
    ticket = {
        "id": ticket_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "question": question,
        "summary": summary,
        "summary_model": summary_model,
        "confidence_score": state.get("confidence_score"),
        "confidence_reasoning": state.get("confidence_reasoning"),
        "judge_model": state.get("judge_model"),
        "related_sources": sorted({c["source_url"] for c in chunks}),
        "status": "open",
    }
    enqueue_ticket(ticket)

    # A judge that never ran means the models were unreachable, not that the
    # question was judged unanswerable. Saying "I'm not confident" there blames
    # the question for what is actually an outage.
    service_down = state.get("judge_model") is None

    if service_down:
        message = (
            "Our answering service is temporarily unavailable, so I couldn't check "
            "this against our documentation. I've passed your question to our support "
            f"team so nothing is lost. (Ticket #{ticket_id})"
        )
    else:
        message = (
            "I'm not confident I can answer this accurately from our documentation, "
            "so I've escalated it to our support team. They'll follow up shortly. "
            f"(Ticket #{ticket_id})"
        )

    return {
        **state,
        "escalation_summary": summary,
        "escalation_id": ticket_id,
        "answer": message,
        "citations": [],
        "path_taken": "escalated",
        "escalation_reason": "service_unavailable" if service_down else "low_confidence",
    }
