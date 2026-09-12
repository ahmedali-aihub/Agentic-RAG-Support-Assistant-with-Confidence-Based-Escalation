import logging
from functools import lru_cache

from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_core.messages import HumanMessage, SystemMessage

from app.config import settings
from app.llm import AllModelsFailed, get_embeddings, invoke_with_fallback

logger = logging.getLogger(__name__)


@lru_cache
def get_vectorstore() -> Chroma:
    return Chroma(
        collection_name=settings.chroma_collection_name,
        embedding_function=get_embeddings(),
        persist_directory=settings.chroma_persist_dir,
    )


@lru_cache
def get_reranker():
    from sentence_transformers import CrossEncoder

    return CrossEncoder(settings.reranker_model)


REWRITE_PROMPT = """You rewrite customer support questions into search queries for a \
documentation index.

Rewrite the question using the vocabulary the documentation itself would use. Expand \
vague phrasing into the concrete terms a product manual would contain. Keep it under 20 \
words. Respond with ONLY the rewritten query, no quotes, no explanation."""


def rewrite_query(question: str) -> str:
    """Restate the question in documentation vocabulary.

    Customers describe symptoms ("my card got rejected"); docs describe mechanisms
    ("card declined decline_code"). Embedding a symptom and matching it against
    mechanism text is the main reason a plainly answerable question retrieves
    badly, so the rewrite bridges that vocabulary gap.
    """
    try:
        rewritten, _ = invoke_with_fallback(
            [
                SystemMessage(content=REWRITE_PROMPT),
                HumanMessage(content=question),
            ],
            temperature=0.0,
        )
    except AllModelsFailed:
        return question

    cleaned = rewritten.strip().strip('"').splitlines()[0].strip()
    return cleaned or question


def rerank(question: str, docs: list[Document], top_k: int) -> list[Document]:
    """Re-score candidates with a cross-encoder and keep the best.

    Embedding search scores question and chunk separately, so it rewards general
    topical overlap. A cross-encoder reads both together and can tell that a page
    mentioning refunds throughout still never explains how to issue a partial one.
    """
    if not docs:
        return []

    scores = get_reranker().predict([(question, d.page_content) for d in docs])
    ranked = sorted(zip(docs, scores), key=lambda p: p[1], reverse=True)

    for doc, score in ranked:
        doc.metadata["rerank_score"] = float(score)

    return [doc for doc, _ in ranked[:top_k]]


def retrieve(question: str, k: int | None = None) -> list[Document]:
    """Fetch a wide candidate pool, then narrow it with the cross-encoder.

    Reranking can only promote what the first stage returned, so the pool is
    deliberately wider than the final k.
    """
    k = k or settings.retrieval_top_k
    store = get_vectorstore()

    if not settings.rerank_enabled:
        return store.similarity_search(question, k=k)

    candidates = store.similarity_search(question, k=settings.retrieval_candidate_k)
    return rerank(question, candidates, k)
