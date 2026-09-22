"""Sweeps CONFIDENCE_THRESHOLD and reports the tradeoff it controls.

The threshold trades two errors that don't cost the same: too low, and a wrong
answer reaches a customer; too high, and answerable questions get needlessly
escalated. This re-scores one set of judged confidence scores at each
threshold rather than re-running the graph, since the judge's score doesn't
change -- only which side of the line it falls on does.

Usage: python scripts/threshold_sweep.py [path/to/comparison_results.json]
"""

import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

DEFAULT_PATH = Path(__file__).resolve().parent / "comparison_results.json"
THRESHOLDS = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]


def main(path: Path):
    rows = json.loads(path.read_text(encoding="utf-8"))
    judged = [r for r in rows if r.get("agentic_judged") and r.get("agentic_confidence") is not None]

    if not judged:
        print("No judged rows with a confidence score to sweep. Run "
              "scripts/run_comparison.py first.")
        return

    print(f"Sweeping {len(judged)} judged questions across {len(THRESHOLDS)} thresholds\n")
    print(f"{'Threshold':>9}  {'Answered':>9}  {'Escalated':>10}  "
          f"{'Over-esc.':>10}  {'Under-esc.':>11}")
    print("-" * 58)

    for t in THRESHOLDS:
        answered = escalated = over = under = 0
        for r in judged:
            # Re-derive the route this threshold would have taken, rather than
            # trusting the route the run actually chose at its own threshold.
            would_answer = r["agentic_confidence"] >= t
            if would_answer:
                answered += 1
                if r["expected"] == "escalate":
                    under += 1  # the costly error: a wrong answer would ship
            else:
                escalated += 1
                if r["expected"] == "answer":
                    over += 1  # wastes a human's time, nothing worse

        marker = "  <- current default" if t == 0.6 else ""
        print(f"{t:>9.1f}  {answered:>9}  {escalated:>10}  {over:>10}  {under:>11}{marker}")

    print("\nOver-escalated  = answerable, but this threshold would escalate it (wastes time)")
    print("Under-escalated = should escalate, but this threshold would answer anyway (risk)")
    print("\nLower the threshold to answer more; raise it to escalate more cautiously.")

    out = path.parent / "threshold_sweep.json"
    sweep = []
    for t in THRESHOLDS:
        answered = sum(1 for r in judged if r["agentic_confidence"] >= t)
        under = sum(
            1 for r in judged if r["agentic_confidence"] >= t and r["expected"] == "escalate"
        )
        over = sum(
            1 for r in judged if r["agentic_confidence"] < t and r["expected"] == "answer"
        )
        sweep.append({"threshold": t, "answered": answered,
                      "over_escalated": over, "under_escalated": under})
    out.write_text(json.dumps(sweep, indent=2), encoding="utf-8")
    print(f"\nWritten to {out}")


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PATH)
