"""Fetch a curated set of public Stripe docs pages and save them as clean text/JSON.

Stripe's docs are a JS-rendered SPA in many places, so instead of crawling we hit
a fixed, curated list of well-known guide URLs that are known to serve readable
static HTML for their main article content. This keeps the pipeline deterministic
and avoids needing a headless browser.
"""

import json
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

RAW_DIR = Path(__file__).resolve().parents[2] / "data" / "raw"

STRIPE_DOC_URLS = [
    "https://docs.stripe.com/payments/accept-a-payment",
    "https://docs.stripe.com/payments/checkout",
    "https://docs.stripe.com/payments/payment-intents",
    "https://docs.stripe.com/refunds",
    "https://docs.stripe.com/disputes",
    "https://docs.stripe.com/billing/subscriptions/overview",
    "https://docs.stripe.com/billing/subscriptions/trials",
    "https://docs.stripe.com/billing/subscriptions/cancel",
    "https://docs.stripe.com/invoicing/overview",
    "https://docs.stripe.com/payouts",
    "https://docs.stripe.com/connect",
    "https://docs.stripe.com/webhooks",
    "https://docs.stripe.com/testing",
    "https://docs.stripe.com/error-codes",
    "https://docs.stripe.com/declines",
    "https://docs.stripe.com/security",
    "https://docs.stripe.com/api/authentication",
    "https://docs.stripe.com/keys",
    "https://docs.stripe.com/development/quickstart",
    "https://docs.stripe.com/customer-management",
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
}


def clean_page(html: str) -> tuple[str, str]:
    soup = BeautifulSoup(html, "html.parser")

    title_tag = soup.find("h1")
    title = title_tag.get_text(strip=True) if title_tag else "Untitled"

    for tag in soup(["script", "style", "nav", "footer", "header", "svg", "button"]):
        tag.decompose()

    main = soup.find("main") or soup.find("article") or soup.body
    if main is None:
        return title, ""

    text = main.get_text(separator="\n", strip=True)
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    return title, "\n".join(lines)


def fetch_all(delay: float = 1.0) -> list[dict]:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    docs = []
    for url in STRIPE_DOC_URLS:
        try:
            resp = requests.get(url, headers=HEADERS, timeout=15)
            resp.raise_for_status()
        except requests.RequestException as exc:
            print(f"[skip] {url}: {exc}")
            continue

        title, text = clean_page(resp.text)
        if len(text) < 200:
            print(f"[skip] {url}: page content too short ({len(text)} chars), likely JS-rendered")
            continue

        docs.append({"url": url, "title": title, "text": text})
        print(f"[ok] {url} -> {title!r} ({len(text)} chars)")
        time.sleep(delay)

    out_path = RAW_DIR / "stripe_docs.json"
    out_path.write_text(json.dumps(docs, indent=2), encoding="utf-8")
    print(f"\nSaved {len(docs)} docs to {out_path}")
    return docs


if __name__ == "__main__":
    fetch_all()
