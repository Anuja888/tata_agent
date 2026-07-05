const AGENT_STYLES = {
  kyc: { label: "KYC Specialist", bg: "#2563eb", text: "#ffffff" },
  loan: { label: "Loan Specialist", bg: "#16a34a", text: "#ffffff" },
  emi: { label: "EMI Specialist", bg: "#9333ea", text: "#ffffff" },
  unknown: { label: "Master Agent", bg: "#6b7280", text: "#ffffff" },
  master: { label: "Master Agent", bg: "#6b7280", text: "#ffffff" },
};

export default function AgentBadge({ agent, responseTimeMs }) {
  const key = (agent || "unknown").toLowerCase();
  const style = AGENT_STYLES[key] || AGENT_STYLES.unknown;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11,
        fontWeight: 700,
        background: style.bg,
        color: style.text,
        padding: "4px 10px",
        borderRadius: 999,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      }}
    >
      {style.label}
      {responseTimeMs != null && (
        <span style={{ opacity: 0.85, fontWeight: 600 }}>{responseTimeMs}ms</span>
      )}
    </span>
  );
}
