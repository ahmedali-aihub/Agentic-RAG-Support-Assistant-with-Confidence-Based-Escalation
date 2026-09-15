import logging
from dataclasses import dataclass
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
    """Every candidate in the chain failed or returned unusable output."""


class QuotaExhausted(AllModelsFailed):
    """Every provider's free budget is spent; nothing can serve until reset."""


@dataclass(frozen=True)
class Candidate:
    """One (provider, key, model) the chain can try.

    Keys are separate entries rather than a property of the provider because a
    daily quota belongs to an account: when one key is spent the same model on
    another key is still worth trying.
    """

    provider: str
    model: str
    key: str
    base_url: str
    key_index: int

    @property
    def label(self) -> str:
        # Never the key itself — these land in logs and API responses.
        return f"{self.provider}[{self.key_index}]/{self.model}"


def build_candidates() -> list[Candidate]:
    """All provider/key/model combinations, best-quota-first.

    Gemini's free tier is far larger than OpenRouter's 50-a-day, but OpenRouter
    is tried first: it costs nothing to exhaust and keeps the scarcer allowance
    in reserve rather than spending the generous one on every request.
    """
    out: list[Candidate] = []

    for i, key in enumerate(settings.openrouter_keys, 1):
        for model in settings.model_chain:
            out.append(
                Candidate("openrouter", model, key, settings.openrouter_base_url, i)
            )

    for i, key in enumerate(settings.gemini_keys, 1):
        for model in settings.gemini_model_chain:
            out.append(Candidate("gemini", model, key, settings.gemini_base_url, i))

    return out


@lru_cache(maxsize=512)
def _client(
    provider: str, model: str, key: str, base_url: str, temperature: float, timeout: float
) -> ChatOpenAI:
    headers = (
        {
            "HTTP-Referer": "https://github.com/agentic-rag-support",
            "X-Title": "Agentic RAG Support Agent",
        }
        if provider == "openrouter"
        else None
    )
    return ChatOpenAI(
        model=model,
        api_key=key,
        base_url=base_url,
        temperature=temperature,
        timeout=timeout,
        max_retries=0,
        default_headers=headers,
    )


def _timeout_for(attempt: int) -> float:
    """Patience grows as the chain is exhausted.

    With dozens of candidates left, a model that hasn't answered in a few
    seconds is better abandoned than waited on -- the next one is usually
    faster than the remainder of this one. Once few are left, there is nothing
    to fall back to, so waiting beats failing.
    """
    full = settings.request_timeout_seconds
    if attempt < 3:
        return min(settings.fast_timeout_seconds, full)
    if attempt < 8:
        return min(settings.fast_timeout_seconds * 2, full)
    return full


def _is_account_quota_error(exc: Exception) -> bool:
    """True when the failure is a whole account's daily allowance, not one model.

    Both providers meter free usage per account, so this failure means every
    remaining model on that key will refuse identically. Telling it apart from a
    single model being down is what lets the chain skip a spent account without
    abandoning the accounts that still have budget.
    """
    text = str(exc).lower()
    if "429" not in text and "resource_exhausted" not in text:
        return False
    return any(
        marker in text
        for marker in (
            "free-models-per-day",  # OpenRouter
            "quota",  # Gemini
            "resource_exhausted",
        )
    )


_calls = count()


ROTATION_WINDOW = 4


def _rotate(items: list[Candidate]) -> list[Candidate]:
    """Start each call at a different point near the head of the chain.

    Spreading load matters, but rotating across the whole chain would start some
    requests at the slow reasoning models parked at the back — so a user's
    latency would depend on where the counter happened to land. Rotation is
    confined to the fast head; everything behind it keeps its order and stays
    available as fallback.
    """
    if len(items) < 2:
        return items
    offset = next(_calls) % min(ROTATION_WINDOW, len(items))
    return items[offset:] + items[:offset]


def invoke_with_fallback(
    messages: list[BaseMessage],
    temperature: float = 0.0,
    parse: Callable[[str], T] | None = None,
) -> tuple[T | str, str]:
    """Try each provider/key/model until one returns usable output.

    A candidate is skipped when the call fails and also when `parse` rejects the
    response — a model answering in prose where JSON was required is as useless
    as one that is down.

    A spent daily allowance retires every remaining candidate on that key, since
    they all draw on the same budget, while leaving other keys and providers to
    be tried. Returns (result, label) so callers can record what answered.
    """
    candidates = build_candidates()
    if not candidates:
        raise AllModelsFailed(
            "No API keys configured. Set OPENROUTER_API_KEY or GEMINI_API_KEY in "
            "backend/.env (comma-separate several keys to pool their quotas)."
        )

    errors: list[str] = []
    spent_keys: set[tuple[str, int]] = set()

    attempted = 0
    for cand in _rotate(candidates):
        account = (cand.provider, cand.key_index)
        if account in spent_keys:
            continue

        timeout = _timeout_for(attempted)
        attempted += 1

        try:
            response = _client(
                cand.provider, cand.model, cand.key, cand.base_url, temperature, timeout
            ).invoke(messages)
        except Exception as exc:
            if _is_account_quota_error(exc):
                spent_keys.add(account)
                logger.warning(
                    "%s daily allowance exhausted on key %d; skipping its remaining models",
                    cand.provider,
                    cand.key_index,
                )
                errors.append(f"{cand.provider}[{cand.key_index}]: daily quota exhausted")
                continue
            errors.append(f"{cand.label}: {type(exc).__name__}: {exc}")
            logger.warning("%s failed: %s", cand.label, exc)
            continue

        text = (response.content or "").strip()
        if not text:
            errors.append(f"{cand.label}: empty response")
            continue

        if parse is None:
            return text, cand.label

        try:
            return parse(text), cand.label
        except Exception as exc:
            errors.append(f"{cand.label}: unusable output: {exc}")
            logger.warning("%s returned unusable output: %s", cand.label, exc)
            continue

    accounts = {(c.provider, c.key_index) for c in candidates}
    if spent_keys >= accounts:
        raise QuotaExhausted(
            "Every configured account's free daily allowance is exhausted. "
            "Add another key, or wait for the quotas to reset."
        )

    raise AllModelsFailed("All candidates failed:\n" + "\n".join(errors))


@lru_cache
def get_embeddings() -> HuggingFaceEmbeddings:
    return HuggingFaceEmbeddings(model_name=settings.embedding_model)
