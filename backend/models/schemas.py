from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    session_id: str = Field(..., min_length=1)


class ChatResponse(BaseModel):
    response: str
    agent_used: str
    response_time_ms: float


class HealthResponse(BaseModel):
    status: str
    service: str
