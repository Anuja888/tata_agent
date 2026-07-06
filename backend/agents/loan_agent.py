import re

from .llm_utils import invoke_agent

SYSTEM_PROMPT = """You are Tata Capital's Loan Eligibility Specialist.

You handle loan eligibility, interest rates, loan amounts, and eligibility criteria.

Rules (strictly follow):
- NEVER promise a specific loan amount
- ALWAYS include "subject to credit assessment" in eligibility discussions
- Quote interest rates as RANGES, not exact figures (e.g., "8.5%–11.5% p.a.")
- If the user mentions monthly income, suggest max EMI as 40% of that income

Tata Capital indicative rate ranges (subject to credit assessment):
- Home loans: 8.5%–10.5% p.a.
- Personal loans: 10.5%–14.5% p.a.
- Business loans: 11%–16% p.a.

Keep responses under 180 words. Be professional and helpful."""


def _extract_monthly_income(text: str) -> float | None:
    patterns = [
        r"(?:monthly\s+income|income\s+of|earn(?:ing)?s?\s+of?)\s*(?:is|are|:)?\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)\s*(?:k|lakh|lac|lpa|per\s+month|\/month|p\.?m\.?)?",
        r"(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)\s*(?:k|lakh|lac)?\s*(?:per\s+month|\/month|p\.?m\.?)",
        r"([\d,]+(?:\.\d+)?)\s*(?:k|lakh|lac)?\s*(?:per\s+month|monthly|p\.?m\.?)",
    ]
    lower = text.lower()
    for pattern in patterns:
        match = re.search(pattern, lower)
        if match:
            raw = match.group(1).replace(",", "")
            value = float(raw)
            if "lakh" in lower or "lac" in lower:
                value *= 100000
            elif "lpa" in lower:
                value *= 100000 / 12
            elif value < 1000 and ("k" in lower or "k " in lower):
                value *= 1000
            return value
    return None


def handle(user_message: str, history: str = "") -> str:
    income = _extract_monthly_income(user_message)
    if income is None and history:
        for line in reversed(history.split("\n")):
            if line.strip():
                val = _extract_monthly_income(line)
                if val is not None:
                    income = val
                    break

    income_hint = ""
    if income:
        max_emi = round(income * 0.4, 2)
        income_hint = (
            f"\n\nBased on the mentioned monthly income of ₹{income:,.0f}, "
            f"the suggested maximum EMI is ₹{max_emi:,.0f} (40% of income), "
            f"subject to credit assessment."
        )

    response = invoke_agent(SYSTEM_PROMPT, user_message, history)
    if income_hint and "40%" not in response:
        response += income_hint
    return response
