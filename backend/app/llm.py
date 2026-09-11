import logging
from functools import lru_cache
from typing import Callable, TypeVar

from langchain_core.messages import BaseMessage
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_openai import ChatOpenAI

from app.config import settings

logger = logging.getLogger(__name__)

T = TypeVar("T")


class AllModelsFailed(RuntimeError):
    """Every model in the chain failed or returned unusable output."""


@lru_cache
def _build_one(model: str, temperature: float) -> ChatOpenAI:
    return ChatOpenAI(
        model=model,
        api_key=settings.openrouter_api_key,
        base_url=settings.openrouter_base_url,
        temperature=temperature,
        timeout=settings.request_timeout_seconds,
        max_retries=0,
        default_headers={
            "HTTP-Referer": "https://github.com/agentic-rag-support",
            "X-Title": "Agentic RAG Support Agent",
        },
    )


def invoke_with_fallback(
    messages: list[BaseMessage],
    temperature: float = 0.0,
    parse: Callable[[str], T] | None = None,
) -> tuple[T | str, str]:
    """Try each free model in order; return the first usable result.

    Free OpenRouter models are rate-limited and intermittently unavailable, so a
    single model isn't dependable. A model is skipped both when the call raises
    (429, 5xx, timeout) and when `parse` rejects its output — a model that
    answers with prose where JSON was required is as useless here as one that
    is down.

    Returns (result, model_id) so callers can record which model answered.
    """
    errors: list[str] = []

    for model in settings.model_chain:
        try:
            response = _build_one(model, temperature).invoke(messages)
        except Exception as exc:
            errors.append(f"{model}: {type(exc).__name__}: {exc}")
            logger.warning("Model %s failed: %s", model, exc)
            continue

        text = (response.content or "").strip()
        if not text:
            errors.append(f"{model}: empty response")
            continue

        if parse is None:
            return text, model

        try:
            return parse(text), model
        except Exception as exc:
            errors.append(f"{model}: unusable output: {exc}")
            logger.warning("Model %s returned unusable output: %s", model, exc)
            continue

    raise AllModelsFailed(
        "All models in the chain failed:\n" + "\n".join(errors)
    )


@lru_cache
def get_embeddings() -> HuggingFaceEmbeddings:
    return HuggingFaceEmbeddings(model_name=settings.embedding_model)
