export async function classifierAgent(userMessage, callGemini, history = []) {
  const systemPrompt = `You are a classifier. Read the user's banking query.
Output EXACTLY one word — nothing else:
- LOAN → if they ask about loans, EMI, interest rates, eligibility
- VERIFY → if they ask about account, KYC, documents, identity
- NEGOTIATE → if they ask about waiving fees, better rates, complaints

Output only the word. No explanation. No punctuation.`;

  const decision = await callGemini(systemPrompt, userMessage, history);
  return decision.trim().toUpperCase();
}
export async function loanAgent(userMessage, callGemini, history = []) {
  const systemPrompt = `You are Tata Capital's Loan Specialist.
You help customers with home loans, personal loans, EMI calculations, and eligibility.
Tata Capital offers: Home loans at 8.75% p.a., Personal loans at 10.99% p.a.
Do not start with a greeting. Answer the user's latest question directly and continue the conversation.
Keep response under 150 words.`;
  return await callGemini(systemPrompt, userMessage, history);
}

export async function verificationAgent(userMessage, callGemini, history = []) {
  const systemPrompt = `You are Tata Capital's KYC and Verification Specialist.
You help with account verification, document requirements, and identity checks.
Required documents: Aadhaar, PAN, last 3 months bank statement, address proof.
Do not start with a greeting. Answer the user's latest question directly.
Keep response under 150 words.`;
  return await callGemini(systemPrompt, userMessage, history);
}

export async function negotiationAgent(userMessage, callGemini, history = []) {
  const systemPrompt = `You are Tata Capital's Customer Relations Specialist.
You handle fee waivers, rate negotiations, and complaints with empathy.
You can offer: processing fee waiver up to 50%, rate review after 6 months.
Do not start with a greeting. Acknowledge the concern briefly, then offer solutions.
Keep response under 150 words.`;
  return await callGemini(systemPrompt, userMessage, history);
}