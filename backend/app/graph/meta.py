"""Answers questions about the assistant itself, before retrieval runs.

The confidence judge only ever asks one question: do these documentation
excerpts answer this? A meta-question like "tell me about yourself" has no
excerpts that could ever satisfy that test, no matter how the query is
rewritten -- so it escalated every time, which is the wrong outcome for a
question the assistant can answer about itself with total confidence.

This is intentionally not an LLM call. The assistant's self-description is
fixed content, not something to retrieve or judge, and keeping it out of the
judge's path means the judge's strictness about *documentation* questions is
never loosened to accommodate it.
"""

import re

from app.graph.state import GraphState

SELF_DESCRIPTION = (
    "I'm a support assistant that answers questions using Stripe's official "
    "documentation -- things like payments, refunds, subscriptions, webhooks, "
    "payouts, and testing. Before I answer, I check whether the documentation "
    "actually covers what you're asking. If it does, I'll answer and cite the "
    "source. If it doesn't -- or if your question needs access to your specific "
    "account -- I'll hand it to a person on the support team instead of guessing."
)

# Deliberately narrow and anchored, so a real documentation question that
# happens to contain one of these words ("what are you using webhooks for")
# does not get swept up by accident.
_PATTERNS = [
    r"\btell me about yourself\b",
    r"\bwho are you\b",
    r"\bwhat are you\b",
    r"\bwhat can you (do|help with|answer)\b",
    r"\bhow (do|does) you work\b",
    r"\bare you (a bot|an ai|human)\b",
    r"\bintroduce yourself\b",
    r"\bwhat is this (assistant|bot|chatbot)\b",
]
_COMPILED = [re.compile(p, re.IGNORECASE) for p in _PATTERNS]


def is_self_question(question: str) -> bool:
    return any(p.search(question) for p in _COMPILED)


def answer_self_question(state: GraphState) -> GraphState:
    return {
        **state,
        "answer": SELF_DESCRIPTION,
        "citations": [],
        "confidence_score": 1.0,
        "confidence_reasoning": "Question is about the assistant itself, not the documentation.",
        "judge_model": None,
        "answer_model": None,
        "path_taken": "answered_self",
    }
