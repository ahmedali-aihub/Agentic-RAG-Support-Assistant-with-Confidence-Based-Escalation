from langchain_core.messages import HumanMessage, SystemMessage

from app.graph.confidence import format_chunks_for_prompt
from app.graph.state import GraphState
from app.llm import AllModelsFailed, invoke_with_fallback

SYSTEM_PROMPT = """You are a helpful customer support assistant for Stripe. Answer the \
customer's question using ONLY the provided documentation excerpts. Be concise and direct.

Rules:
- Do not invent details that aren't in the excerpts.
- Write a short, clear answer (2-6 sentences, or a short list if steps are involved).
- Do not mention "excerpts" or "documents" in your answer; write as if you simply know this.
"""


def generate_answer(state: GraphState) -> GraphState:
    question = state["question"]
    chunks = state.get("chunks", [])

    context = format_chunks_for_prompt(chunks)
    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=f"Question: {question}\n\nDocumentation excerpts:\n{context}"),
    ]

    try:
        answer, model_used = invoke_with_fallback(messages, temperature=0.2)
    except AllModelsFailed:
        return {
            **state,
            "answer": (
                "I found relevant documentation but couldn't generate an answer just now. "
                "Please try again in a moment."
            ),
            "citations": [],
            "answer_model": None,
            "path_taken": "answer_failed",
        }

    return {
        **state,
        "answer": answer,
        "citations": sorted({c["source_url"] for c in chunks}),
        "answer_model": model_used,
        "path_taken": "answered",
    }
