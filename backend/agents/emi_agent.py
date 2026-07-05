import math
import re

from agents.llm_utils import invoke_agent

SYSTEM_PROMPT = """You are Tata Capital's EMI Calculation & Negotiation Specialist.

You handle EMI calculations, repayment schedules, and tenure/amount planning.

Rules (strictly follow):
- NEVER guarantee rate reduction or approval
- ALWAYS say "subject to approval" for any negotiation
- Use the EMI breakdown provided in context when available
- Explain tenure trade-offs clearly (longer tenure = lower EMI, higher total interest)

EMI formula: EMI = P × r × (1+r)^n / ((1+r)^n - 1)
Where P = principal, r = monthly rate (annual/12/100), n = tenure in months

Keep responses under 220 words. Be professional and helpful."""


def calculate_emi(principal: float, annual_rate: float, tenure_months: int) -> float:
    r = annual_rate / 12 / 100
    n = tenure_months
    if r == 0:
        return principal / n
    factor = (1 + r) ** n
    return principal * r * factor / (factor - 1)


def amortization_first_3_months(
    principal: float, annual_rate: float, tenure_months: int
) -> list[dict]:
    emi = calculate_emi(principal, annual_rate, tenure_months)
    r = annual_rate / 12 / 100
    balance = principal
    schedule = []
    for month in range(1, 4):
        interest = balance * r
        principal_paid = emi - interest
        balance = max(balance - principal_paid, 0)
        schedule.append(
            {
                "month": month,
                "emi": round(emi, 2),
                "principal": round(principal_paid, 2),
                "interest": round(interest, 2),
                "balance": round(balance, 2),
            }
        )
    return schedule


def _extract_loan_params(text: str) -> tuple[float | None, float | None, int | None]:
    lower = text.lower()
    principal = None
    rate = None
    tenure = None

    principal_match = re.search(
        r"(?:loan|principal|amount|borrow)\s*(?:of|is|:)?\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)\s*(?:lakh|lac|k)?",
        lower,
    )
    if principal_match:
        val = float(principal_match.group(1).replace(",", ""))
        if "lakh" in lower or "lac" in lower:
            val *= 100000
        elif val < 1000:
            val *= 1000
        principal = val

    rate_match = re.search(r"(\d+(?:\.\d+)?)\s*%\s*(?:p\.?a\.?|per\s+annum|interest)?", lower)
    if rate_match:
        rate = float(rate_match.group(1))

    tenure_match = re.search(
        r"(\d+)\s*(?:years?|yrs?|months?|mos?)\s*(?:tenure|duration|period)?",
        lower,
    )
    if tenure_match:
        val = int(tenure_match.group(1))
        if "year" in lower or "yr" in lower:
            tenure = val * 12
        else:
            tenure = val

    return principal, rate, tenure


def handle(user_message: str, history: str = "") -> str:
    principal, rate, tenure = _extract_loan_params(user_message)

    if (principal is None or rate is None or tenure is None) and history:
        for line in reversed(history.split("\n")):
            if line.strip():
                p_h, r_h, t_h = _extract_loan_params(line)
                if principal is None and p_h is not None:
                    principal = p_h
                if rate is None and r_h is not None:
                    rate = r_h
                if tenure is None and t_h is not None:
                    tenure = t_h
                if principal is not None and rate is not None and tenure is not None:
                    break

    calc_context = ""
    if principal and rate and tenure:
        emi = calculate_emi(principal, rate, tenure)
        schedule = amortization_first_3_months(principal, rate, tenure)
        schedule_text = "\n".join(
            f"  Month {s['month']}: EMI ₹{s['emi']:,.2f} | "
            f"Principal ₹{s['principal']:,.2f} | Interest ₹{s['interest']:,.2f} | "
            f"Balance ₹{s['balance']:,.2f}"
            for s in schedule
        )
        total_payment = emi * tenure
        total_interest = total_payment - principal
        calc_context = (
            f"\n\nCalculated EMI Details (indicative, subject to approval):\n"
            f"Principal: ₹{principal:,.0f} | Rate: {rate}% p.a. | Tenure: {tenure} months\n"
            f"Monthly EMI: ₹{emi:,.2f}\n"
            f"Total Payment: ₹{total_payment:,.2f} | Total Interest: ₹{total_interest:,.2f}\n"
            f"Amortization (first 3 months):\n{schedule_text}"
        )

    enriched_message = user_message + calc_context if calc_context else user_message
    return invoke_agent(SYSTEM_PROMPT, enriched_message, history)
