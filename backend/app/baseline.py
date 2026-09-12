"""Plain RAG: retrieve, then always answer.

This is the thing the agentic graph is claimed to improve on. Without it there
is nothing to compare against, and "my system escalates correctly" is an
assertion rather than a result.
"""

from langchain_core.messages import HumanMessage, SystemMessage

from app.graph.confidence import format_chunks_for_prompt
from app.graph.retriever import retrieve
from app.llm import AllModelsFailed, invoke_with_fallback

SYSTEM_PROMPT = """You are a customer support assistant for Stripe. Answer the \
customer's question using the provided documentation excerpts. Be concise and direct.

Write a short, clear answer (2-6 sentences, or a short list if steps are involved)."""


def run_baseline(question: str) -> dict:
    docs = retrieve(question)
    context = format_chunks_for_prompt(
        [
            {
                "text": d.page_content,
                "source_url": d.metadata.get("source_url", ""),
                "title": d.metadata.get("title", ""),
            }
            for d in docs
        ]
    )

    try:
        answer, model = invoke_with_fallback(
            [
                SystemMessage(content=SYSTEM_PROMPT),
                HumanMessage(
                    content=f"Question: {question}\n\nDocumentation excerpts:\n{context}"
                ),
            ],
            temperature=0.2,
        )
    except AllModelsFailed:
        return {"answer": None, "served_by": None, "failed": True}

    return {"answer": answer, "served_by": model, "failed": False}
