from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    openrouter_api_key: str
    openrouter_model: str = "anthropic/claude-3.5-sonnet"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"

    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"

    chroma_persist_dir: str = "./data/chroma_db"
    chroma_collection_name: str = "stripe_docs"

    retrieval_top_k: int = 5
    confidence_threshold: float = 0.6


settings = Settings()
