from typing import TypedDict


class ChunkInfo(TypedDict):
    text: str
    source_url: str
    title: str


class GraphState(TypedDict, total=False):
    question: str
    chunks: list[ChunkInfo]
    attempt: int
    rewritten_query: str
    is_confident: bool
    confidence_score: float
    confidence_reasoning: str
    judge_model: str | None
    answer: str
    answer_model: str | None
    citations: list[str]
    escalation_summary: str
    escalation_id: str
    escalation_reason: str
    path_taken: str
