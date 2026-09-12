import json

from langchain_core.messages import HumanMessage, SystemMessage

from app.config import settings
from app.graph.state import GraphState
from app.llm import AllModelsFailed, invoke_with_fallback

SYSTEM_PROMPT = """You are a strict judge deciding whether retrieved documentation excerpts are \
sufficient to answer a customer's support question accurately and completely.

Answer "confident" only if the excerpts directly and specifically address the question. \
If the excerpts are only tangentially related, cover a different product area, are too vague, \
or the question asks about something not covered at all (pricing for a different product, \
account-specific issues, something outside the docs, etc.), answer "not confident".

Respond ONLY with a JSON object of this exact shape, no markdown fences, no extra text:
{"confident": true or false, "score": a number between 0.0 and 1.0, "reasoning": "one sentence"}
"""


def format_chunks_for_prompt(chunks: list[dict]) -> str:
    if not chunks:
        return "(no chunks retrieved)"
    parts = []
    for i, c in enumerate(chunks, 1):
        parts.append(f"[Excerpt {i} - {c['title']}]\n{c['text']}")
    return "\n\n".join(parts)


def parse_judgement(raw: str) -> dict:
    """Parse the judge's JSON verdict, raising if it isn't usable.

    Raising (rather than defaulting) is what lets the model chain treat a
    model that ignores the JSON contract as a failed model and move on.
    """
    text = raw.strip()
    if text.startswith("```"):
        text = text.strip("`").removeprefix("json").strip()

    # Some models wrap the object in a sentence; take the outermost braces.
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end > start:
        text = text[start : end + 1]

    parsed = json.loads(text)
    if not isinstance(parsed, dict) or "confident" not in parsed:
        raise ValueError("missing 'confident' field")

    return {
        "confident": bool(parsed["confident"]),
        "score": float(parsed.get("score", 0.0)),
        "reasoning": str(parsed.get("reasoning", "")),
    }


def check_confidence(state: GraphState) -> GraphState:
    question = state["question"]
    chunks = state.get("chunks", [])

    context = format_chunks_for_prompt(chunks)
    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=f"Question: {question}\n\nRetrieved excerpts:\n{context}"),
    ]

    try:
        verdict, model_used = invoke_with_fallback(
            messages, temperature=0.0, parse=parse_judgement
        )
    except AllModelsFailed as exc:
        # No model could judge this, so we cannot claim confidence. Escalating
        # is the safe outcome for a support bot.
        return {
            **state,
            "confidence_score": 0.0,
            "confidence_reasoning": f"Confidence check unavailable: {exc}",
            "is_confident": False,
            "judge_model": None,
        }

    is_confident = (
        verdict["confident"]
        and verdict["score"] >= settings.confidence_threshold
        and bool(chunks)
    )

    return {
        **state,
        "confidence_score": verdict["score"],
        "confidence_reasoning": verdict["reasoning"],
        "is_confident": is_confident,
        "judge_model": model_used,
    }


def route_on_confidence(state: GraphState) -> str:
    """Answer, retry the search once, or hand off to a human.

    The single retry is what makes this a loop rather than a straight pipeline:
    a question can fail on vocabulary alone, and rewriting it is cheaper than a
    human's time. Bounded at one retry so a bad question can't spin.
    """
    if state.get("is_confident"):
        return "answer"

    judge_ran = state.get("judge_model") is not None
    first_try = state.get("attempt", 1) == 1

    if settings.query_rewrite_enabled and first_try and judge_ran:
        return "rewrite"

    return "escalate"
