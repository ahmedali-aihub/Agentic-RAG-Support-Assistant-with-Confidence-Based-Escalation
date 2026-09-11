"""Chunk the scraped Stripe docs and load them into a persistent Chroma collection."""

import json
from pathlib import Path

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_core.documents import Document

from app.config import settings
from app.llm import get_embeddings

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
RAW_PATH = DATA_DIR / "raw" / "stripe_docs.json"


def load_raw_docs() -> list[dict]:
    if not RAW_PATH.exists():
        raise FileNotFoundError(
            f"{RAW_PATH} not found. Run `python -m app.ingestion.scrape_stripe_docs` first."
        )
    return json.loads(RAW_PATH.read_text(encoding="utf-8"))


def build_documents(raw_docs: list[dict]) -> list[Document]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=150,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    documents = []
    for doc in raw_docs:
        chunks = splitter.split_text(doc["text"])
        for i, chunk in enumerate(chunks):
            documents.append(
                Document(
                    page_content=chunk,
                    metadata={
                        "source_url": doc["url"],
                        "title": doc["title"],
                        "chunk_index": i,
                    },
                )
            )
    return documents


def main():
    raw_docs = load_raw_docs()
    print(f"Loaded {len(raw_docs)} raw docs")

    documents = build_documents(raw_docs)
    print(f"Split into {len(documents)} chunks")

    persist_dir = Path(settings.chroma_persist_dir)
    persist_dir.mkdir(parents=True, exist_ok=True)

    vectorstore = Chroma(
        collection_name=settings.chroma_collection_name,
        embedding_function=get_embeddings(),
        persist_directory=str(persist_dir),
    )

    existing = vectorstore.get()
    if existing["ids"]:
        print(f"Clearing {len(existing['ids'])} existing vectors from collection")
        vectorstore.delete(ids=existing["ids"])

    batch_size = 100
    for i in range(0, len(documents), batch_size):
        batch = documents[i : i + batch_size]
        vectorstore.add_documents(batch)
        print(f"Indexed {min(i + batch_size, len(documents))}/{len(documents)} chunks")

    print(f"\nDone. Collection '{settings.chroma_collection_name}' persisted at {persist_dir}")


if __name__ == "__main__":
    main()
