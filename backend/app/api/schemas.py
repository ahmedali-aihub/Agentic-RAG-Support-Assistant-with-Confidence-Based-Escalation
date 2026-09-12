from pydantic import BaseModel


class AskRequest(BaseModel):
    question: str


class AskResponse(BaseModel):
    answer: str
    escalated: bool
    citations: list[str] = []
    confidence_score: float | None = None
    escalation_id: str | None = None
    # "low_confidence" (judged unanswerable) or "service_unavailable" (models down).
    escalation_reason: str | None = None
    # Named without a `model_` prefix to stay clear of Pydantic's protected namespace.
    served_by: str | None = None
    attempts: int | None = None
    rewritten_query: str | None = None


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
