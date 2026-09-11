from functools import lru_cache

from langchain_openai import ChatOpenAI
from langchain_huggingface import HuggingFaceEmbeddings

from app.config import settings


@lru_cache
def get_chat_model(temperature: float = 0.0) -> ChatOpenAI:
    return ChatOpenAI(
        model=settings.openrouter_model,
        api_key=settings.openrouter_api_key,
        base_url=settings.openrouter_base_url,
        temperature=temperature,
        default_headers={
            "HTTP-Referer": "https://github.com/agentic-rag-support",
            "X-Title": "Agentic RAG Support Agent",
        },
    )


@lru_cache
def get_embeddings() -> HuggingFaceEmbeddings:
    return HuggingFaceEmbeddings(model_name=settings.embedding_model)
