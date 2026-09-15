from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Every free OpenRouter model that can do general text QA, tried in order.
# Models advertising structured-output support come first, since the confidence
# judge must return parseable JSON; the rest follow by general capability.
#
# Worth knowing: OpenRouter's free-tier daily cap is account-wide, not per
# model. A long chain does not multiply one account's daily budget -- it buys
# resilience against a single model being down, overloaded or refusing a
# prompt. Extra budget comes from extra accounts and other providers.
# Ordered by measured response time on a real support question, because the
# head of this list is what almost every request actually pays. The large
# reasoning models are capable but spend 20-60s thinking before answering,
# which is most of a slow reply -- they sit at the back as capable fallbacks
# rather than the default.
DEFAULT_FREE_MODEL_CHAIN = [
    # Fast and reliable (~1-3s), structured-output capable where it matters.
    "nex-agi/nex-n2.5-mini:free",
    "liquid/lfm-2.5-2.6b:free",
    "nex-agi/nex-n2.5-pro:free",
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    "poolside/laguna-s-2.1:free",
    "dots-studio/dots-3-note-preview:free",
    "openrouter/free",
    # Usually available, sometimes throttled.
    "google/gemma-4-31b-it:free",
    "google/gemma-4-26b-a4b-it:free",
    "inclusionai/ling-3.0-flash-vl:free",
    "poolside/laguna-xs-2.1:free",
    # Slow reasoning models — capable, but 20s+ before a first token.
    "nvidia/nemotron-3.5-lightning:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "nvidia/nemotron-3-ultra-550b-a55b:free",
]

# Gemini's own free tier. Lite models first: their daily allowance is the
# largest and they are ample for judging and summarising. Verified against the
# live model list -- the 2.5 generation now 404s for new keys.
DEFAULT_GEMINI_MODEL_CHAIN = [
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.8-flash",
]


def _split(raw: str) -> list[str]:
    return [part.strip() for part in raw.split(",") if part.strip()]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # OpenRouter. Several keys may be given comma-separated: each account has
    # its own daily free-model budget, so a second key is genuinely more
    # capacity rather than another way to hit the same wall.
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_models: str = ""

    # Google Gemini, through its OpenAI-compatible endpoint so the same client
    # works for both providers. Also accepts several comma-separated keys.
    gemini_api_key: str = ""
    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta/openai/"
    gemini_models: str = ""

    # Ceiling, used once the chain is nearly exhausted and there is little left
    # to fall back to.
    request_timeout_seconds: float = 20.0

    # What the first few candidates get. A model that hasn't answered in this
    # long is usually slower than simply trying the next one, and with dozens
    # of candidates available that trade is nearly always worth making.
    fast_timeout_seconds: float = 6.0

    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"

    chroma_persist_dir: str = "./data/chroma_db"
    chroma_collection_name: str = "stripe_docs"

    retrieval_top_k: int = 5
    confidence_threshold: float = 0.6

    # Reranking: pull a wider pool from the vector store, then let a local
    # cross-encoder pick the best. Runs offline, so it costs no API quota.
    rerank_enabled: bool = True
    retrieval_candidate_k: int = 20
    reranker_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"

    # One retry: on low confidence, rewrite the query and retrieve again before
    # giving up and escalating.
    query_rewrite_enabled: bool = True

    @field_validator("openrouter_api_key", "gemini_api_key", "openrouter_models", "gemini_models")
    @classmethod
    def _strip(cls, v: str) -> str:
        return v.strip()

    @property
    def openrouter_keys(self) -> list[str]:
        return _split(self.openrouter_api_key)

    @property
    def gemini_keys(self) -> list[str]:
        return _split(self.gemini_api_key)

    @property
    def model_chain(self) -> list[str]:
        if not self.openrouter_models:
            return DEFAULT_FREE_MODEL_CHAIN
        return _split(self.openrouter_models)

    @property
    def gemini_model_chain(self) -> list[str]:
        if not self.gemini_models:
            return DEFAULT_GEMINI_MODEL_CHAIN
        return _split(self.gemini_models)


settings = Settings()
