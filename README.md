# Agentic RAG Support Agent

A support chatbot that knows the limits of its own knowledge. Instead of answering
every question, it retrieves relevant documentation, **judges whether that context is
actually sufficient**, and either answers with citations or escalates to a human queue.

Built on a real knowledge base (public Stripe docs) so the escalation path has genuine
in-scope and out-of-scope questions to work with.

## Architecture

```
User question
     |
     v
FastAPI /ask
     |
     v
LangGraph:
  retrieve -> check_confidence -> [answer | escalate] -> END
```

- **retrieve**: semantic search over a Chroma collection of chunked Stripe docs.
- **check_confidence**: an LLM-judge node that scores whether the retrieved chunks
  actually answer the question (JSON score + reasoning), routing via a LangGraph
  conditional edge.
- **answer**: generates a cited answer strictly from retrieved context.
- **escalate**: summarizes the question + partial findings and writes a ticket to a
  mock human queue (`backend/data/processed/human_queue.json`), returned via `/tickets`.

## Stack

- Orchestration: LangGraph
- LLM: OpenRouter free models, with automatic fallback across a chain (see below)
- Embeddings: local HuggingFace sentence-transformer (`all-MiniLM-L6-v2`) — no API cost
- Vector DB: Chroma (local, persistent)
- Backend: FastAPI
- Frontend: React + TypeScript (Vite)

Running entirely on free models means the whole project costs nothing to demo.

## Model fallback

Free OpenRouter models are rate-limited and intermittently unavailable, so every
LLM call walks a chain of them and takes the first usable result. A model is
skipped both when the call raises (429, 5xx, timeout) **and** when its output
fails the caller's parse step — for the confidence judge, a model that replies in
prose where JSON was required is as useless as one that's down, and that failure
would otherwise be silent.

The chain is set in `app/config.py` and overridable via `OPENROUTER_MODELS`
(comma-separated, tried left to right). Responses report which model answered,
via `served_by` on `/ask` and `judge_model` / `summary_model` on tickets.

If every model fails, each node degrades deliberately rather than crashing: the
judge reports no confidence (so the query escalates to a human), and escalation
still files the ticket without its triage summary.

## Setup

### Backend

```bash
cd backend
python -m venv .venv
./.venv/Scripts/activate        # Windows
pip install -r requirements.txt

cp .env.example .env            # then fill in OPENROUTER_API_KEY
```

Build the knowledge base (scrapes a curated set of public Stripe doc pages, chunks, embeds, and loads into Chroma):

```bash
python scripts/run_ingestion.py
```

Run the API:

```bash
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env            # defaults to http://localhost:8000
npm run dev
```

Open the printed local URL (default `http://localhost:5173`).

## Testing

**Unit tests** — no API key needed, covers the judge's JSON parsing and the
model fallback chain:

```bash
cd backend
python -m pytest -q
```

**Single question** through the graph:

```bash
cd backend
python -c "from app.graph.builder import run_query; s = run_query('How do I cancel a subscription?'); print(s['path_taken'], s['confidence_score']); print(s['answer'])"
```

**Inspect the escalation queue** after some questions have escalated:

```bash
cd backend
python -c "import json; from app.graph.escalation import list_tickets; print(json.dumps(list_tickets(), indent=2))"
```

Or hit `GET /tickets` once the API is running.

## Evaluation

A labeled set of in-scope and out-of-scope questions lives in
`backend/scripts/eval_queries.json`. Run:

```bash
cd backend
python scripts/run_eval.py
```

This reports **escalation accuracy** (did it answer the answerable questions and
escalate the genuinely unanswerable ones?) and latency, and writes per-question
results to `backend/scripts/eval_results.json`.

It breaks the errors out by direction, because they don't cost the same:

- **Over-escalated** — answerable, but escalated. Wastes a human's time.
- **Wrongly answered** — should have escalated, but answered anyway. This is the
  expensive one: it's a potentially wrong answer reaching a customer, and it's
  exactly the failure this project exists to prevent.

Tune `CONFIDENCE_THRESHOLD` to trade one against the other.

## Project layout

```
backend/
  app/
    config.py          # env-driven settings
    llm.py              # OpenRouter chat model + local embeddings
    ingestion/           # scrape + chunk + index Stripe docs
    graph/
      state.py           # LangGraph shared state schema
      retriever.py        # Chroma similarity search
      confidence.py        # LLM-judge node + routing function
      answer.py            # cited answer generation
      escalation.py         # ticket summarization + mock human queue
      builder.py            # wires the LangGraph graph together
    api/
      schemas.py          # request/response models
    main.py               # FastAPI app (/ask, /tickets, /health)
  scripts/
    run_ingestion.py     # one-shot scrape + index
    run_eval.py           # escalation-accuracy + latency evaluation
    eval_queries.json      # labeled test questions
  tests/
frontend/
  src/
    App.tsx              # chat shell
    api.ts                 # fetch wrapper for /ask
    components/           # ChatInput, ChatMessageBubble
```

## Design notes

- **Why an LLM judge instead of a similarity-score threshold?** Cosine similarity
  tells you the chunks are topically related, not that they actually answer the
  question. A judge reading the question against the retrieved text can catch cases
  like "related docs exist but don't cover this specific sub-case."
- **Why local embeddings + OpenRouter for chat?** Keeps embedding cost at zero and
  ingestion fully offline-capable, while still allowing any hosted model (Claude, GPT,
  Llama, etc.) to be swapped in for the judge/generation steps via one env var.
- **Escalation queue is a JSON file, not a real ticketing system.** This is a resume
  demo project — the interesting part is the confidence-routing decision, not queue
  infrastructure. Swapping in a real queue (email, Zendesk, a DB table) only touches
  `app/graph/escalation.py`.
