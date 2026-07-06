import logging
import time

from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.agents import emi_agent, kyc_agent, loan_agent, master_agent
from backend.models.schemas import ChatRequest, ChatResponse, HealthResponse
from backend.services import analytics, guardrails, memory_service

dotenv_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tata_agent")

app = FastAPI(title="Tata Capital Agentic Banking Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

AGENT_HANDLERS = {
    "kyc": kyc_agent.handle,
    "loan": loan_agent.handle,
    "emi": emi_agent.handle,
}


@app.get("/health", response_model=HealthResponse)
@app.get("/api/health", response_model=HealthResponse)
def health():
    return HealthResponse(status="ok", service="tata-capital-agent")


@app.post("/chat", response_model=ChatResponse)
@app.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    start = time.perf_counter()
    history = memory_service.get_history_text(request.session_id)

    classification, reasoning = master_agent.classify_intent(
        request.message, history
    )
    logger.info(f"Routing decision: {reasoning}")
    analytics.increment(classification, request.session_id)

    if classification == "unknown":
        response = master_agent.UNKNOWN_CLARIFICATION
        agent_used = "unknown"
    else:
        handler = AGENT_HANDLERS[classification]
        response = handler(request.message, history)
        agent_used = classification

    response = guardrails.scan_response(response, request.message, request.session_id)
    memory_service.add_turn(request.session_id, request.message, response)

    elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
    analytics.record_response_time(elapsed_ms, request.session_id)

    return ChatResponse(
        response=response,
        agent_used=agent_used,
        response_time_ms=elapsed_ms,
    )


@app.get("/analytics", response_model=None)
@app.get("/api/analytics", response_model=None)
def get_analytics(session_id: str = None):
    return analytics.get_stats(session_id)


@app.delete("/session/{session_id}", response_model=None)
@app.delete("/api/session/{session_id}", response_model=None)
def clear_session(session_id: str):
    cleared = memory_service.clear_session(session_id)
    analytics.clear_session_stats(session_id)
    if not cleared:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "cleared", "session_id": session_id}
