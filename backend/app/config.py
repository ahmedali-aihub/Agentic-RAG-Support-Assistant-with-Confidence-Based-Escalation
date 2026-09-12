from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Every free OpenRouter model that can do general text QA, tried in order.
# Models advertising structured-output support come first, since the confidence
# judge must return parseable JSON; the rest follow by general capability.
#
# Worth knowing: OpenRouter's free-tier daily cap is account-wide, not per
# model. A long chain does not multiply the daily budget -- it buys resilience
# against a single model being down, overloaded or refusing a prompt, which
# happens independently of quota.
DEFAULT_FREE_MODEL_CHAIN = [
    # Structured-output capable — preferred for the JSON judge.
    "nvidia/nemotron-3-super-120b-a12b:free",
    "nex-agi/nex-n2.5-pro:free",
    "dots-studio/dots-3-note-preview:free",
    "nex-agi/nex-n2.5-mini:free",
    "liquid/lfm-2.5-2.6b:free",
    # Large general models.
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "thinkingmachines/inkling:free",
    "google/gemma-4-31b-it:free",
    "google/gemma-4-26b-a4b-it:free",
    "nvidia/nemotron-3.5-lightning:free",
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    "thinkingmachines/inkling-small:free",
    "inclusionai/ling-3.0-flash-vl:free",
    "poolside/laguna-s-2.1:free",
    "poolside/laguna-xs-2.1:free",
    # Auto-router last: it picks among free models itself.
    "openrouter/free",
]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    openrouter_api_key: str
    openrouter_base_url: str = "https://openrouter.ai/api/v1"

    # Comma-separated in .env; falls back to the curated free chain above.
    openrouter_models: str = ""

    request_timeout_seconds: float = 60.0

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

    @field_validator("openrouter_models")
    @classmethod
    def _strip(cls, v: str) -> str:
        return v.strip()

    @property
    def model_chain(self) -> list[str]:
        if not self.openrouter_models:
            return DEFAULT_FREE_MODEL_CHAIN
        return [m.strip() for m in self.openrouter_models.split(",") if m.strip()]


settings = Settings()
