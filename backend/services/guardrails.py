from services import analytics

FORBIDDEN_PHRASES = [
    "guaranteed",
    "definitely",
    "100%",
    "exact rate",
    "approved",
]

DISCLAIMER = " Note: All figures are indicative and subject to final verification."


def scan_response(text: str, user_message: str = "", session_id: str = None) -> str:
    lower_text = text.lower()
    lower_user = user_message.lower()
    triggered = any(phrase in lower_text for phrase in FORBIDDEN_PHRASES) or any(phrase in lower_user for phrase in FORBIDDEN_PHRASES)
    if triggered:
        analytics.record_guardrail_trigger(session_id)
        if DISCLAIMER.strip() not in text:
            return text.rstrip() + DISCLAIMER
    return text
