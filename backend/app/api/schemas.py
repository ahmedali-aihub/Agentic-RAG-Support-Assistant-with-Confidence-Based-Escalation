from pydantic import BaseModel


class AskRequest(BaseModel):
    question: str


class AskResponse(BaseModel):
    answer: str
    escalated: bool
    citations: list[str] = []
    confidence_score: float | None = None
    escalation_id: str | None = None
    # Named without a `model_` prefix to stay clear of Pydantic's protected namespace.
    served_by: str | None = None


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
