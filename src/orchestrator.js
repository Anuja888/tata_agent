import { classifierAgent, loanAgent, verificationAgent, negotiationAgent } from "./agents";
import { applyRulebook } from "./rulebook";

export async function orchestrate(userMessage, callGemini, history = [], options = {}) {
  const rule = applyRulebook(userMessage);
  if (rule.blocked) {
    return { response: rule.reason, agentUsed: "⚠ Rulebook", agentType: "BLOCKED" };
  }

  if (options.forceVerification) {
    const response = await verificationAgent(userMessage, callGemini, history);
    return { response, agentUsed: "Verification Specialist", agentType: "VERIFY" };
  }

  // Step 1: Classifier decides which agent to use
  const agentType = await classifierAgent(userMessage, callGemini, history);
  
  // Step 2: Route to the right specialist
  let response;
  let agentUsed;

  if (agentType === "LOAN") {
    response = await loanAgent(userMessage, callGemini, history);
    agentUsed = "Loan Specialist";
  } else if (agentType === "VERIFY") {
    response = await verificationAgent(userMessage, callGemini, history);
    agentUsed = "Verification Specialist";
  } else if (agentType === "NEGOTIATE") {
    response = await negotiationAgent(userMessage, callGemini, history);
    agentUsed = "Customer Relations";
  } else {
    // Fallback for anything unclassified
    response = await callGemini(
      "You are a general Tata Capital assistant. Be helpful and professional. Do not repeat earlier greetings; respond directly to the current question.",
      userMessage,
      history
    );
    agentUsed = "General Assistant";
  }

  return { response, agentUsed, agentType };
}