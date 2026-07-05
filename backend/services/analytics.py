from typing import Dict, List

_sessions_stats: Dict[str, Dict] = {}


def _get_or_create_session(session_id: str | None) -> Dict:
    sid = session_id or "global"
    if sid not in _sessions_stats:
        _sessions_stats[sid] = {
            "routing": {"kyc": 0, "loan": 0, "emi": 0, "unknown": 0},
            "total_queries": 0,
            "guardrail_triggers": 0,
            "response_times_ms": [],
        }
    return _sessions_stats[sid]


def increment(agent_type: str, session_id: str | None = None) -> None:
    stats = _get_or_create_session(session_id)
    key = agent_type.lower()
    if key in stats["routing"]:
        stats["routing"][key] += 1
    else:
        stats["routing"]["unknown"] += 1
    stats["total_queries"] += 1


def record_guardrail_trigger(session_id: str | None = None) -> None:
    stats = _get_or_create_session(session_id)
    stats["guardrail_triggers"] += 1


def record_response_time(ms: float, session_id: str | None = None) -> None:
    stats = _get_or_create_session(session_id)
    stats["response_times_ms"].append(ms)
    if len(stats["response_times_ms"]) > 500:
        stats["response_times_ms"].pop(0)


def get_stats(session_id: str | None = None) -> dict:
    stats = _get_or_create_session(session_id)
    response_times = stats["response_times_ms"]
    avg_ms = (
        round(sum(response_times) / len(response_times), 2)
        if response_times
        else 0.0
    )
    return {
        "routing": dict(stats["routing"]),
        "total_queries": stats["total_queries"],
        "guardrail_triggers": stats["guardrail_triggers"],
        "avg_response_time_ms": avg_ms,
    }


def clear_session_stats(session_id: str) -> None:
    if session_id in _sessions_stats:
        del _sessions_stats[session_id]
