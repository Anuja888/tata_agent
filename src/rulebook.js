const BLOCKED_TOPICS = [
  "cricket", "movie", "recipe", "weather", "game",
  "politics", "sports", "music", "joke", "song"
];

export function applyRulebook(userMessage) {
  const lower = userMessage.toLowerCase();

  const isBlocked = BLOCKED_TOPICS.some((topic) => lower.includes(topic));
  if (isBlocked) {
    return {
      blocked: true,
      reason: "I'm specialized for Tata Capital banking queries only. Please ask about loans, KYC, EMI, or fee waivers."
    };
  }

  if (userMessage.trim().length < 3) {
    return {
      blocked: true,
      reason: "Please describe your banking query in more detail."
    };
  }

  return { blocked: false };
}
