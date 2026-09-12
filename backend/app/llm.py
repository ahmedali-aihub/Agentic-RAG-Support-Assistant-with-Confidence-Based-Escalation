import logging
from functools import lru_cache
from itertools import count
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


class QuotaExhausted(AllModelsFailed):
    """The account's shared free-model budget is spent; no model can serve."""


_calls = count()


def _rotated_chain() -> list[str]:
    """The chain, starting one position further along on each call.

    Always starting at the head sends every request to the same model until it
    breaks, which concentrates load and makes one model's per-minute throttling
    everyone's problem. Rotating spreads calls across the chain while keeping
    the full list available as fallback.
    """
    chain = settings.model_chain
    if len(chain) < 2:
        return chain
    offset = next(_calls) % len(chain)
    return chain[offset:] + chain[:offset]


def _is_account_quota_error(exc: Exception) -> bool:
    """True when the failure is the account-wide free-tier cap.

    OpenRouter meters free models against one daily account budget rather than
    per model, so this failure means every remaining model in the chain will
    fail identically. Distinguishing it from a single model being down is what
    lets the chain keep trying in one case and stop immediately in the other.
    """
    text = str(exc)
    return "429" in text and "free-models-per-day" in text


def invoke_with_fallback(
    messages: list[BaseMessage],
    temperature: float = 0.0,
    parse: Callable[[str], T] | None = None,
) -> tuple[T | str, str]:
    """Try each free model in order; return the first usable result.

    Individual free models go down, get overloaded, or return output that can't
    be parsed, so the chain walks past any model that fails for a reason another
    model might not share — including output `parse` rejects, since a model that
    answers in prose where JSON was required is as useless as one that is down.

    The exception is the account-wide daily cap: every model draws on the same
    budget, so once that is spent the chain stops rather than spending a minute
    collecting the same refusal sixteen times.

    Returns (result, model_id) so callers can record which model answered.
    """
    errors: list[str] = []

    for model in _rotated_chain():
        try:
            response = _build_one(model, temperature).invoke(messages)
        except Exception as exc:
            if _is_account_quota_error(exc):
                logger.warning(
                    "Free-tier daily quota exhausted at %s; the rest of the chain "
                    "shares the same budget, so it is skipped",
                    model,
                )
                raise QuotaExhausted(
                    "OpenRouter's shared free-model daily quota is exhausted. "
                    "Every model in the chain draws on the same budget, so none "
                    "can serve until it resets."
                ) from exc
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
