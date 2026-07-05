import AgentBadge from "./AgentBadge";

function parseMarkdown(text) {
  if (!text) return "";
  const parts = text.split("**");
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return <strong key={index}>{part}</strong>;
    }
    return part;
  });
}

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";

  return (
    <div
      style={{
        marginBottom: 14,
        display: "flex",
        flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
      }}
    >
      {!isUser && message.agent && (
        <div style={{ marginBottom: 6 }}>
          <AgentBadge agent={message.agent} responseTimeMs={message.responseTimeMs} />
        </div>
      )}

      <div
        style={{
          display: "inline-block",
          background: isUser ? "#dcf8c6" : "#ffffff",
          color: "#111827",
          padding: "10px 14px",
          borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          maxWidth: "78%",
          boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
          lineHeight: 1.55,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          border: isUser ? "1px solid #c8e6b0" : "1px solid #e5e7eb",
        }}
      >
        {parseMarkdown(message.text)}
      </div>
    </div>
  );
}
