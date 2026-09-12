import time
from functools import wraps
from typing import Callable, TypedDict


class ChunkInfo(TypedDict):
    text: str
    source_url: str
    title: str
    rerank_score: float | None


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
    # Milliseconds spent in each node, keyed by node name. Retries accumulate,
    # so a re-searched query shows the total time spent retrieving, not the last.
    timings: dict[str, float]


def timed(name: str) -> Callable:
    """Record how long a graph node took.

    Latency here is the cost of not guessing -- an extra judge call, sometimes a
    second retrieval -- so it is worth attributing to the step that spent it
    rather than reporting one opaque total.
    """

    def decorate(fn: Callable[[GraphState], GraphState]) -> Callable[[GraphState], GraphState]:
        @wraps(fn)
        def wrapper(state: GraphState) -> GraphState:
            start = time.perf_counter()
            result = fn(state)
            elapsed = (time.perf_counter() - start) * 1000
            timings = {**result.get("timings", {})}
            timings[name] = timings.get(name, 0.0) + elapsed
            return {**result, "timings": timings}

        return wrapper

    return decorate
