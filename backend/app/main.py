import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.api.schemas import AskRequest, AskResponse, QueueStats, TicketOut, TicketUpdate
from app.config import settings
from app.graph.builder import run_query
from app.graph.escalation import list_tickets, queue_stats, set_ticket_status
from app.graph.retriever import get_reranker, get_vectorstore

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Load the embedding and reranker models before serving.

    Both are lazy singletons, so without this the first request pays roughly 50
    seconds of model loading -- which looks like a slow agent rather than a cold
    start, and is the single largest latency in the system.
    """
    start = time.perf_counter()
    get_vectorstore().similarity_search("warmup", k=1)
    if settings.rerank_enabled:
        get_reranker().predict([("warmup", "warmup")])
    logger.info("Models warm in %.1fs", time.perf_counter() - start)
    yield


app = FastAPI(title="Agentic RAG Support Agent", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/ask", response_model=AskResponse)
def ask(request: AskRequest):
    result = run_query(request.question)

    chunks = result.get("chunks", [])
    scores = [c["rerank_score"] for c in chunks if c.get("rerank_score") is not None]
    attempts = result.get("attempt", 1)

    return AskResponse(
        answer=result.get("answer", ""),
        escalated=result.get("path_taken") == "escalated",
        citations=result.get("citations", []),
        confidence_score=result.get("confidence_score"),
        confidence_reasoning=result.get("confidence_reasoning"),
        escalation_id=result.get("escalation_id"),
        escalation_reason=result.get("escalation_reason"),
        served_by=result.get("answer_model") or result.get("judge_model"),
        attempts=attempts,
        rewritten_query=result.get("rewritten_query"),
        timings=result.get("timings", {}),
        # Each attempt pulls its own candidate pool before reranking.
        chunks_considered=settings.retrieval_candidate_k * attempts,
        chunks_used=len(chunks),
        top_relevance=max(scores) if scores else None,
    )


@app.get("/tickets", response_model=list[TicketOut])
def get_tickets():
    return list_tickets()


@app.get("/tickets/stats", response_model=QueueStats)
def get_queue_stats():
    return queue_stats()


@app.patch("/tickets/{ticket_id}", response_model=TicketOut)
def update_ticket(ticket_id: str, update: TicketUpdate):
    ticket = set_ticket_status(ticket_id, update.status, update.note)
    if ticket is None:
        raise HTTPException(status_code=404, detail=f"No ticket {ticket_id}")
    return ticket
