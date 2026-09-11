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

    print("\n=== Summary ===")
    print(f"Escalation accuracy: {n_correct}/{total} = {accuracy:.1%}")
    print(f"Latency: mean={mean(latencies):.2f}s median={median(latencies):.2f}s "
          f"max={max(latencies):.2f}s")

    out_path = queries_path.parent / "eval_results.json"
    out_path.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(f"\nDetailed results written to {out_path}")


if __name__ == "__main__":
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_QUERIES_PATH
    main(path)
