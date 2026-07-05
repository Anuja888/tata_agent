import time
from typing import Dict, Optional

try:
    from langchain.memory import ConversationBufferMemory
except ImportError:
    from langchain_classic.memory import ConversationBufferMemory

SESSION_TTL_SECONDS = 30 * 60
MAX_TURNS = 10

_sessions: Dict[str, dict] = {}


def _cleanup_expired() -> None:
    now = time.time()
    expired = [
        sid
        for sid, data in _sessions.items()
        if now - data["last_activity"] > SESSION_TTL_SECONDS
    ]
    for sid in expired:
        del _sessions[sid]


def get_memory(session_id: str) -> ConversationBufferMemory:
    _cleanup_expired()
    if session_id not in _sessions:
        _sessions[session_id] = {
            "memory": ConversationBufferMemory(
                return_messages=True,
                memory_key="history",
            ),
            "last_activity": time.time(),
        }
    else:
        _sessions[session_id]["last_activity"] = time.time()
    return _sessions[session_id]["memory"]


def get_history_text(session_id: str) -> str:
    memory = get_memory(session_id)
    messages = memory.chat_memory.messages
    if not messages:
        return ""
    lines = []
    for msg in messages[-MAX_TURNS * 2 :]:
        role = "User" if msg.type == "human" else "Assistant"
        lines.append(f"{role}: {msg.content}")
    return "\n".join(lines)


def add_turn(session_id: str, user_message: str, assistant_message: str) -> None:
    memory = get_memory(session_id)
    memory.chat_memory.add_user_message(user_message)
    memory.chat_memory.add_ai_message(assistant_message)
    _sessions[session_id]["last_activity"] = time.time()


def clear_session(session_id: str) -> bool:
    if session_id in _sessions:
        del _sessions[session_id]
        return True
    return False
