"""One-shot convenience script: scrape Stripe docs, then build the Chroma index."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.ingestion import build_index, scrape_stripe_docs

if __name__ == "__main__":
    print("=== Step 1: Scraping Stripe docs ===")
    scrape_stripe_docs.fetch_all()

    print("\n=== Step 2: Building Chroma index ===")
    build_index.main()
