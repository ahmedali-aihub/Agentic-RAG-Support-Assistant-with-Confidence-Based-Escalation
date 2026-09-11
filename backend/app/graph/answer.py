from langchain_core.messages import HumanMessage, SystemMessage

from app.graph.confidence import format_chunks_for_prompt
from app.graph.state import GraphState
from app.llm import get_chat_model

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
    user_prompt = f"Question: {question}\n\nDocumentation excerpts:\n{context}"

    llm = get_chat_model(temperature=0.2)
    response = llm.invoke(
        [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=user_prompt)]
    )

    citations = sorted({c["source_url"] for c in chunks})

    return {
        **state,
        "answer": response.content.strip(),
        "citations": citations,
        "path_taken": "answered",
    }
