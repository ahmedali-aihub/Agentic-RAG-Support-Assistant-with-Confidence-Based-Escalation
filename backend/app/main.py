from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.schemas import AskRequest, AskResponse, TicketOut
from app.graph.builder import run_query
from app.graph.escalation import list_tickets

app = FastAPI(title="Agentic RAG Support Agent")

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
    return AskResponse(
        answer=result.get("answer", ""),
        escalated=result.get("path_taken") == "escalated",
        citations=result.get("citations", []),
        confidence_score=result.get("confidence_score"),
        escalation_id=result.get("escalation_id"),
        served_by=result.get("answer_model") or result.get("judge_model"),
    )


@app.get("/tickets", response_model=list[TicketOut])
def get_tickets():
    return list_tickets()
