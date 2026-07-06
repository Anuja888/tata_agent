const API_BASE = process.env.REACT_APP_API_URL || "/api";

export async function sendChatMessage(message, sessionId) {
  const response = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: sessionId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Chat request failed (${response.status})`);
  }

  return response.json();
}

export async function fetchAnalytics(sessionId) {
  const url = sessionId
    ? `${API_BASE}/analytics?session_id=${sessionId}`
    : `${API_BASE}/analytics`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch analytics");
  }
  return response.json();
}

export async function clearSession(sessionId) {
  const response = await fetch(`${API_BASE}/session/${sessionId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to clear session");
  }
  return response.json();
}

export async function checkHealth() {
  const response = await fetch(`${API_BASE}/health`);
  return response.ok;
}
