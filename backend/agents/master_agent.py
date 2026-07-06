from .llm_utils import invoke_agent

SYSTEM_PROMPT = (
    "You are a routing agent for Tata Capital banking assistant. "
    "Classify the user's message intent into exactly one word: kyc, loan, emi, or unknown. "
    "Reply with only the classification word, nothing else."
)

UNKNOWN_CLARIFICATION = (
    "I'm not sure which banking service you need. I can help with:\n"
    "• **KYC** — identity verification and document requirements\n"
    "• **Loans** — eligibility, interest rates, and loan amounts\n"
    "• **EMI** — repayment calculations and tenure planning\n\n"
    "Could you rephrase your question?"
)


def classify_intent(user_message: str, history: str = "") -> tuple[str, str]:
    raw = invoke_agent(SYSTEM_PROMPT, user_message, history)
    cleaned = raw.strip().lower().split()[0] if raw.strip() else "unknown"
    classification = "".join(c for c in cleaned if c.isalnum())
    if classification not in {"kyc", "loan", "emi", "unknown"}:
        classification = "unknown"

    reasoning = (
        f"Classified '{user_message[:80]}' as '{classification}' "
        f"(raw model output: {raw.strip()!r})"
    )
    return classification, reasoning
