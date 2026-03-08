"""API route for the AquaRoute AI agent — chat endpoint."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.agent.agent import process_message

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    conversation_id: Optional[str] = None
    timestamp: str
    tool_used: Optional[str] = None


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, db: Session = Depends(get_db)):
    """Process a chat message and return the agent's response."""
    from app.agent.agent import detect_intent

    # Detect which tool will be used (for metadata)
    tool_name, _ = detect_intent(req.message)

    # Process through the agent
    reply = process_message(req.message, db)

    return ChatResponse(
        reply=reply,
        conversation_id=req.conversation_id,
        timestamp=datetime.utcnow().isoformat(),
        tool_used=tool_name if not any(
            g in req.message.lower() for g in ["bonjour", "salut", "hello", "aide", "help"]
        ) else None,
    )
