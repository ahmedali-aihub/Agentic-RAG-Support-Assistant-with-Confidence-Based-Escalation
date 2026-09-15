from typing import Literal

from pydantic import BaseModel


class AskRequest(BaseModel):
    question: str


class AskResponse(BaseModel):
    answer: str
    escalated: bool
    citations: list[str] = []
    confidence_score: float | None = None
    confidence_reasoning: str | None = None
    escalation_id: str | None = None
    # "low_confidence" (judged unanswerable) or "service_unavailable" (models down).
    escalation_reason: str | None = None
    # Named without a `model_` prefix to stay clear of Pydantic's protected namespace.
    served_by: str | None = None
    attempts: int | None = None
    rewritten_query: str | None = None
    # Milliseconds per graph node, so the extra cost of judging is attributable
    # rather than hidden in one total.
    timings: dict[str, float] = {}
    chunks_considered: int | None = None
    chunks_used: int | None = None
    top_relevance: float | None = None


class TicketUpdate(BaseModel):
    status: Literal["open", "in_progress", "resolved"]
    note: str | None = None
    # The agent's answer. Supplied on resolve, it is embedded into the knowledge
    # base so the same question is answered directly next time.
    answer: str | None = None
    # The agent's answer. Supplied on resolve, it enters the knowledge base so
    # the same question is answered directly next time.
    answer: str | None = None


class QueueStats(BaseModel):
    total: int
    open: int
    in_progress: int
    resolved: int
    resolution_rate: float
    # Answers the knowledge base has gained from resolved tickets.
    learned: int = 0


class TicketOut(BaseModel):
    id: str
    created_at: str
    question: str
    summary: str
    summary_model: str | None = None
    confidence_score: float | None = None
    confidence_reasoning: str | None = None
    judge_model: str | None = None
    related_sources: list[str] = []
    status: str
    updated_at: str | None = None
    resolution_note: str | None = None
    agent_answer: str | None = None
    learned: bool = False
