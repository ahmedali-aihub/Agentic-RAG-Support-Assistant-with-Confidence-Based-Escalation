"""Generate a labeled eval set instead of hand-writing one.

Hand-written questions grade their own homework: the author picks both the test
and the answer key, and unconsciously writes questions the system already
handles. Here the answerable half is generated from chunks the index actually
contains -- the chunk is the ground truth, not the author's memory -- and the
unanswerable half is drawn from fixed categories that the docs genuinely cannot
cover (account-specific state, legal advice, other companies, live data).

Usage: python scripts/generate_eval_set.py [n_answerable]
"""

import json
import random
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from langchain_core.messages import HumanMessage, SystemMessage

from app.graph.retriever import get_vectorstore
from app.llm import AllModelsFailed, invoke_with_fallback

OUT_PATH = Path(__file__).resolve().parent / "eval_queries_generated.json"

QUESTION_PROMPT = """You write realistic customer support questions.

Given an excerpt from Stripe's documentation, write ONE question that a real customer \
would type into a support chat, and that this excerpt genuinely answers.

Rules:
- Phrase it the way a customer would, not the way the docs do. Customers describe what \
they want or what went wrong; they don't quote API field names.
- It must be answerable from the excerpt alone.
- No meta-references ("according to the docs", "in this excerpt").
- One sentence. Respond with ONLY the question."""

# Questions the documentation structurally cannot answer. These are not "hard"
# questions -- they are the wrong kind of question for a docs-backed bot, which
# is exactly what the escalation path exists to catch.
UNANSWERABLE = [
    # Account-specific state the docs never contain
    "Why did my payout pay_9f8e7d fail last night?",
    "Can you cancel my subscription sub_1A2B3C right now?",
    "Why was my account flagged for review last Tuesday?",
    "How much money is in my Stripe balance today?",
    "Why did charge ch_3PqR2s get refunded without my approval?",
    "Can you reactivate my suspended Stripe account?",
    "What is the email address on file for my account?",
    # Legal / financial advice
    "Does my business need a money transmitter license?",
    "Am I liable if a customer disputes a charge I already shipped?",
    "Should I register for VAT before accepting EU payments?",
    # Other companies / outside scope
    "How do I connect this to my Shopify store's inventory system?",
    "Is PayPal cheaper than Stripe for my business?",
    "What is the weather in San Francisco today?",
    # Live/proprietary data
    "How much revenue did Stripe make last quarter?",
    "How many customers does Stripe have right now?",
]


def sample_chunks(n: int) -> list[dict]:
    """Pull a spread of chunks, one per source page where possible."""
    store = get_vectorstore()
    data = store.get()

    by_source: dict[str, list[tuple[str, dict]]] = {}
    for text, meta in zip(data["documents"], data["metadatas"]):
        # Very short chunks are usually nav or headings and answer nothing.
        if len(text) < 400:
            continue
        by_source.setdefault(meta.get("source_url", ""), []).append((text, meta))

    rng = random.Random(17)
    picked: list[dict] = []
    sources = sorted(by_source)

    # Round-robin across pages so one giant doc can't dominate the set.
    while len(picked) < n and sources:
        for src in list(sources):
            if len(picked) >= n:
                break
            bucket = by_source[src]
            if not bucket:
                sources.remove(src)
                continue
            text, meta = bucket.pop(rng.randrange(len(bucket)))
            picked.append({"text": text, "meta": meta})

    return picked


def main(n_answerable: int):
    chunks = sample_chunks(n_answerable)
    print(f"Sampled {len(chunks)} chunks across the index\n")

    queries = []
    for i, c in enumerate(chunks, 1):
        try:
            question, model = invoke_with_fallback(
                [
                    SystemMessage(content=QUESTION_PROMPT),
                    HumanMessage(content=c["text"][:2500]),
                ],
                temperature=0.7,
            )
        except AllModelsFailed as exc:
            print(f"[{i}/{len(chunks)}] generation failed, stopping: {exc}")
            break

        question = question.strip().strip('"').splitlines()[0].strip()
        queries.append(
            {
                "question": question,
                "expected": "answer",
                "source_url": c["meta"].get("source_url", ""),
                "generated_by": model,
            }
        )
        print(f"[{i}/{len(chunks)}] {question}")

    for q in UNANSWERABLE:
        queries.append({"question": q, "expected": "escalate", "source_url": None})

    OUT_PATH.write_text(json.dumps(queries, indent=2), encoding="utf-8")
    n_ans = sum(1 for q in queries if q["expected"] == "answer")
    print(f"\nWrote {len(queries)} queries ({n_ans} answerable, "
          f"{len(queries) - n_ans} unanswerable) to {OUT_PATH}")


if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 20)
