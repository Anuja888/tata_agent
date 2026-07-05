import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";

export default function ChatWindow({
  messages,
  input,
  onInputChange,
  onSend,
  loading,
  sessionId,
}) {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#e5ddd5",
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4cdc4' fill-opacity='0.35'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid #d1d5db",
      }}
    >
      <div
        style={{
          padding: "14px 18px",
          background: "#075e54",
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Tata Capital Assistant</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>Agentic Banking • Multi-agent routing</div>
        </div>
        <div
          style={{
            fontSize: 10,
            opacity: 0.75,
            maxWidth: 120,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={sessionId}
        >
          {sessionId?.slice(0, 8)}…
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "18px 16px",
          minHeight: 0,
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: "center",
              color: "#64748b",
              padding: "40px 20px",
              background: "rgba(255,255,255,0.7)",
              borderRadius: 12,
            }}
          >
            Ask about KYC, loan eligibility, or EMI calculations.
          </div>
        )}

        {messages.map((msg, index) => (
          <MessageBubble key={index} message={msg} />
        ))}

        {loading && (
          <div style={{ color: "#64748b", fontSize: 13, padding: "8px 4px" }}>
            Classifying intent → routing to specialist…
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          padding: 12,
          background: "#f0f2f5",
          borderTop: "1px solid #d1d5db",
        }}
      >
        <input
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && onSend()}
          placeholder="Type a banking query…"
          disabled={loading}
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: 24,
            border: "1px solid #cbd5e1",
            fontSize: 15,
            outline: "none",
            background: "white",
          }}
        />
        <button
          onClick={onSend}
          disabled={loading || !input.trim()}
          style={{
            padding: "12px 22px",
            background: loading || !input.trim() ? "#94a3b8" : "#075e54",
            color: "white",
            border: "none",
            borderRadius: 24,
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
