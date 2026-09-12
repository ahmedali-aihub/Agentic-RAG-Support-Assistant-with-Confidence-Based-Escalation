"""Compare plain RAG against the agentic graph on the same questions.

The agentic system's claim is that abstaining beats guessing. That only means
something measured against a system that always guesses, so both run over one
query set and the results sit side by side.

For unanswerable questions the interesting number is not whether the baseline
answered -- it always does -- but whether that answer was a hallucination. A
separate judge reads each baseline answer and decides whether it fabricated a
specific claim or correctly admitted ignorance in prose.

Usage: python scripts/run_comparison.py [path/to/queries.json]
"""

import json
import sys
import time
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from langchain_core.messages import HumanMessage, SystemMessage

from app.baseline import run_baseline
from app.graph.builder import run_query
from app.llm import AllModelsFailed, invoke_with_fallback

DEFAULT_QUERIES = Path(__file__).resolve().parent / "eval_queries_generated.json"

HALLUCINATION_PROMPT = """You are auditing a support bot's answer to a question its \
documentation cannot possibly answer (it needs account-specific data, legal advice, \
live figures, or another company's product).

Decide what the bot did:
- "hallucinated" - it stated specific facts, figures, steps or causes as if it knew them
- "deflected" - it said it doesn't know, can't access that, or to contact support

Respond with ONLY this JSON: {"verdict": "hallucinated" or "deflected", "why": "one short sentence"}"""


def judge_hallucination(question: str, answer: str) -> dict | None:
    def parse(raw: str) -> dict:
        text = raw.strip()
        if text.startswith("```"):
            text = text.strip("`").removeprefix("json").strip()
        start, end = text.find("{"), text.rfind("}")
        if start != -1 and end > start:
            text = text[start : end + 1]
        parsed = json.loads(text)
        if parsed.get("verdict") not in {"hallucinated", "deflected"}:
            raise ValueError("bad verdict")
        return parsed

    try:
        verdict, _ = invoke_with_fallback(
            [
                SystemMessage(content=HALLUCINATION_PROMPT),
                HumanMessage(content=f"Question: {question}\n\nBot answer: {answer}"),
            ],
            temperature=0.0,
            parse=parse,
        )
        return verdict
    except AllModelsFailed:
        return None


def interleave(queries: list[dict]) -> list[dict]:
    """Alternate in-scope and out-of-scope questions.

    A run on a rate-limited key usually dies partway through. In file order that
    leaves every out-of-scope question unjudged -- exactly the half the
    hallucination comparison depends on -- so the partial run says nothing.
    Alternating means whatever budget exists is spent on both kinds.
    """
    answerable = [q for q in queries if q["expected"] == "answer"]
    escalatable = [q for q in queries if q["expected"] == "escalate"]

    mixed: list[dict] = []
    for a, b in zip(answerable, escalatable):
        mixed.extend([a, b])
    longer = answerable if len(answerable) > len(escalatable) else escalatable
    mixed.extend(longer[min(len(answerable), len(escalatable)) :])
    return mixed


def main(queries_path: Path):
    queries = interleave(json.loads(queries_path.read_text(encoding="utf-8")))
    out = queries_path.parent / "comparison_results.json"
    print(f"Comparing on {len(queries)} questions from {queries_path.name}")
    print("(in-scope and out-of-scope interleaved so a partial run still compares both)\n")

    rows = []
    for i, item in enumerate(queries, 1):
        q, expected = item["question"], item["expected"]
        row = {"question": q, "expected": expected}

        t0 = time.perf_counter()
        state = run_query(q)
        row["agentic_latency_s"] = round(time.perf_counter() - t0, 2)
        row["agentic_route"] = (
            "escalate" if state.get("path_taken") == "escalated" else "answer"
        )
        row["agentic_confidence"] = state.get("confidence_score")
        row["agentic_attempts"] = state.get("attempt", 1)
        row["agentic_rewritten"] = state.get("rewritten_query")
        row["agentic_judged"] = state.get("judge_model") is not None

        t0 = time.perf_counter()
        base = run_baseline(q)
        row["baseline_latency_s"] = round(time.perf_counter() - t0, 2)
        row["baseline_answer"] = base["answer"]
        row["baseline_failed"] = base["failed"]

        # Baseline always answers, so on an unanswerable question the question
        # is whether that answer was invented.
        if expected == "escalate" and base["answer"]:
            verdict = judge_hallucination(q, base["answer"])
            row["baseline_verdict"] = verdict["verdict"] if verdict else None
            row["baseline_why"] = verdict["why"] if verdict else None
        else:
            row["baseline_verdict"] = None

        rows.append(row)

        # Written every question: a rate-limited run dies mid-set, and losing an
        # hour of judged questions to that is avoidable.
        out.write_text(json.dumps(rows, indent=2), encoding="utf-8")

        mark = "OK " if row["agentic_route"] == expected else "MISS"
        if not row["agentic_judged"]:
            mark = "DEAD"
        extra = ""
        if expected == "escalate" and row["baseline_verdict"]:
            extra = f" | baseline: {row['baseline_verdict']}"
        retried = " (retried)" if row["agentic_attempts"] > 1 else ""
        print(f"[{i}/{len(queries)}] [{mark}] {expected:<8} -> "
              f"{row['agentic_route']:<8}{retried}{extra}  {q[:60]}")

        # Once the budget is gone every remaining question is an outage, not a
        # measurement, so stop instead of spending an hour proving it.
        if len(rows) >= 3 and not any(r["agentic_judged"] for r in rows[-3:]):
            print(f"\nStopping at {i}/{len(queries)}: three consecutive questions "
                  "reached no model. Rerun when the quota resets.")
            break

    report(rows)
    print(f"\nDetailed results -> {out}")


def report(rows: list[dict]):
    judged = [r for r in rows if r["agentic_judged"]]
    skipped = len(rows) - len(judged)

    print("\n" + "=" * 64)
    if skipped:
        print(f"!! {skipped} question(s) never reached a judge (models unavailable)")
        print("   and are excluded below.\n")
    if not judged:
        print("Nothing was judged — rerun when the models are reachable.")
        return

    answerable = [r for r in judged if r["expected"] == "answer"]
    unanswerable = [r for r in judged if r["expected"] == "escalate"]

    print("IN-SCOPE QUESTIONS (the docs do cover these)")
    if answerable:
        agentic_ok = sum(1 for r in answerable if r["agentic_route"] == "answer")
        retried = sum(1 for r in answerable if r["agentic_attempts"] > 1)
        recovered = sum(
            1 for r in answerable if r["agentic_attempts"] > 1 and r["agentic_route"] == "answer"
        )
        print(f"  Baseline answered      : {len(answerable)}/{len(answerable)} (it always does)")
        print(f"  Agentic answered       : {agentic_ok}/{len(answerable)}")
        print(f"  Lost to over-escalation: {len(answerable) - agentic_ok}")
        if retried:
            print(f"  Query rewrite fired    : {retried}, recovered {recovered}")

    print("\nOUT-OF-SCOPE QUESTIONS (the docs cannot cover these)")
    if not unanswerable:
        print("  No out-of-scope question reached a judge, so there is no")
        print("  hallucination comparison in this run — the headline result is")
        print("  missing, not zero. Rerun with budget for the whole set.")
    if unanswerable:
        agentic_esc = sum(1 for r in unanswerable if r["agentic_route"] == "escalate")
        halluc = sum(1 for r in unanswerable if r["baseline_verdict"] == "hallucinated")
        deflect = sum(1 for r in unanswerable if r["baseline_verdict"] == "deflected")
        print(f"  Baseline hallucinated  : {halluc}/{len(unanswerable)}   <- the risk")
        print(f"  Baseline deflected     : {deflect}/{len(unanswerable)}")
        print(f"  Agentic escalated      : {agentic_esc}/{len(unanswerable)}")
        print(f"  Agentic answered anyway: {len(unanswerable) - agentic_esc}")

    a_lat = [r["agentic_latency_s"] for r in judged]
    b_lat = [r["baseline_latency_s"] for r in judged]
    print(f"\nLatency  agentic {sum(a_lat)/len(a_lat):.1f}s avg  |  "
          f"baseline {sum(b_lat)/len(b_lat):.1f}s avg")
    print("The agentic path costs an extra judge call, and a second retrieval when")
    print("it retries. That is the price of not guessing.")
    print("=" * 64)


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_QUERIES)
