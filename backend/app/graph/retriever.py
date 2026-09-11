from functools import lru_cache

from langchain_chroma import Chroma
from langchain_core.documents import Document

from app.config import settings
from app.llm import get_embeddings


@lru_cache
def get_vectorstore() -> Chroma:
    return Chroma(
        collection_name=settings.chroma_collection_name,
        embedding_function=get_embeddings(),
        persist_directory=settings.chroma_persist_dir,
    )


def retrieve(question: str, k: int | None = None) -> list[Document]:
    k = k or settings.retrieval_top_k
    vectorstore = get_vectorstore()
    return vectorstore.similarity_search(question, k=k)
