from typing import TypedDict


class ChunkInfo(TypedDict):
    text: str
    source_url: str
    title: str


class GraphState(TypedDict, total=False):
    question: str
    chunks: list[ChunkInfo]
    is_confident: bool
    confidence_score: float
    confidence_reasoning: str
    answer: str
    citations: list[str]
    escalation_summary: str
    escalation_id: str
    path_taken: str
