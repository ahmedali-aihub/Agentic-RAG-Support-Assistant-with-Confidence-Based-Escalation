"""Evaluate escalation accuracy and latency against a labeled query set.

Each query in eval_queries.json is labeled "answer" (should be answerable from the
Stripe docs KB) or "escalate" (should be routed to the human queue). This script
runs each through the graph and reports whether the actual routing matched the
expected label, plus latency stats.

Usage: python scripts/run_eval.py [path/to/eval_queries.json]
"""

import json
import sys
import time
from pathlib import Path
from statistics import mean, median

# Model output routinely contains characters the Windows console codepage can't
# encode; without this the run dies partway through on a print, not a real fault.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.graph.builder import run_query

DEFAULT_QUERIES_PATH = Path(__file__).resolve().parent / "eval_queries.json"


def main(queries_path: Path):
    queries = json.loads(queries_path.read_text(encoding="utf-8"))

    results = []
    latencies = []

    for item in queries:
        question = item["question"]
        expected = item["expected"]

        start = time.perf_counter()
        state = run_query(question)
        elapsed = time.perf_counter() - start
        latencies.append(elapsed)

        actual = "escalate" if state.get("path_taken") == "escalated" else "answer"
        correct = actual == expected

        results.append(
            {
                "question": question,
                "expected": expected,
                "actual": actual,
                "correct": correct,
                "confidence_score": state.get("confidence_score"),
                "latency_s": round(elapsed, 2),
            }
        )
        status = "OK " if correct else "MISS"
        score = state.get("confidence_score", 0.0)
        print(f"[{status}] ({elapsed:.2f}s, conf={score:.2f}) "
              f"expected={expected:<9} actual={actual:<9} {question}")

    n_correct = sum(r["correct"] for r in results)
    total = len(results)
    accuracy = n_correct / total if total else 0.0

    # Overall accuracy hides which way the bot errs, and the two errors are not
    # equally bad: answering something it shouldn't risks a wrong answer reaching
    # a customer, while over-escalating only costs a human's time.
    answered_ok = sum(1 for r in results if r["expected"] == "answer" and r["correct"])
    n_answerable = sum(1 for r in results if r["expected"] == "answer")
    escalated_ok = sum(1 for r in results if r["expected"] == "escalate" and r["correct"])
    n_escalatable = sum(1 for r in results if r["expected"] == "escalate")

    over_escalated = n_answerable - answered_ok
    wrongly_answered = n_escalatable - escalated_ok

    print("\n=== Summary ===")
    print(f"Escalation accuracy : {n_correct}/{total} = {accuracy:.1%}")
    print(f"  Answerable handled: {answered_ok}/{n_answerable}")
    print(f"  Unanswerable caught: {escalated_ok}/{n_escalatable}")
    print(f"  Over-escalated (answerable, but escalated): {over_escalated}")
    print(f"  Wrongly answered (should have escalated)  : {wrongly_answered}  <- the costly error")
    print(f"Latency: mean={mean(latencies):.2f}s median={median(latencies):.2f}s "
          f"max={max(latencies):.2f}s")

    misses = [r for r in results if not r["correct"]]
    if misses:
        print("\nMisses:")
        for r in misses:
            print(f"  [{r['expected']} -> {r['actual']}] conf={r['confidence_score']} {r['question']}")

    out_path = queries_path.parent / "eval_results.json"
    out_path.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(f"\nDetailed results written to {out_path}")


if __name__ == "__main__":
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_QUERIES_PATH
    main(path)
