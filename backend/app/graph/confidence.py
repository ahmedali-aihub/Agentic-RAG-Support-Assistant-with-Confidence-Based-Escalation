import json

from langchain_core.messages import HumanMessage, SystemMessage

from app.config import settings
from app.graph.state import GraphState
from app.llm import get_chat_model

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


def check_confidence(state: GraphState) -> GraphState:
    question = state["question"]
    chunks = state.get("chunks", [])

    context = format_chunks_for_prompt(chunks)
    user_prompt = f"Question: {question}\n\nRetrieved excerpts:\n{context}"

    llm = get_chat_model(temperature=0.0)
    response = llm.invoke(
        [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=user_prompt)]
    )

    raw = response.content.strip()
    if raw.startswith("```"):
        raw = raw.strip("`").removeprefix("json").strip()

    try:
        parsed = json.loads(raw)
        score = float(parsed.get("score", 0.0))
        reasoning = str(parsed.get("reasoning", ""))
        confident_flag = bool(parsed.get("confident", False))
    except (json.JSONDecodeError, TypeError, ValueError):
        score = 0.0
        reasoning = f"Failed to parse judge response: {raw[:200]}"
        confident_flag = False

    is_confident = confident_flag and score >= settings.confidence_threshold and bool(chunks)

    return {
        **state,
        "confidence_score": score,
        "confidence_reasoning": reasoning,
        "is_confident": is_confident,
    }


def route_on_confidence(state: GraphState) -> str:
    return "answer" if state.get("is_confident") else "escalate"
