import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { fetchAnalytics } from "../api";

const COLORS = {
  kyc: "#2563eb",
  loan: "#16a34a",
  emi: "#9333ea",
  unknown: "#6b7280",
};

export default function AnalyticsDashboard({ visible, onClose, refreshKey, sessionId }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;

    async function load() {
      try {
        const data = await fetchAnalytics(sessionId);
        if (!cancelled) {
          setStats(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      }
    }

    load();
    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [visible, refreshKey, sessionId]);

  if (!visible) return null;

  const chartData = stats
    ? Object.entries(stats.routing || {})
        .filter(([_, val]) => val > 0)
        .map(([name, value]) => ({
          name: name.toUpperCase(),
          value,
          fill: COLORS[name] || "#94a3b8",
        }))
    : [];

  return (
    <div
      style={{
        background: "white",
        borderRadius: 20,
        padding: 20,
        boxShadow: "0 20px 50px rgba(15, 23, 42, 0.08)",
        border: "1px solid #e2e8f0",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexShrink: 0,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 20, color: "#111827" }}>Analytics Dashboard</h2>
          <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>
            Routing stats and guardrail activity
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            border: "none",
            background: "#f1f5f9",
            borderRadius: 8,
            padding: "6px 12px",
            cursor: "pointer",
            fontWeight: 600,
            color: "#475569",
          }}
        >
          Hide
        </button>
      </div>

      {error && (
        <div style={{ color: "#b91c1c", marginBottom: 12, fontSize: 14, flexShrink: 0 }}>
          {error} — ensure the backend is running on port 8000.
        </div>
      )}

      {stats && (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
              marginBottom: 20,
              flexShrink: 0,
            }}
          >
            <StatCard label="Total Queries" value={stats.total_queries} />
            <StatCard label="Guardrail Triggers" value={stats.guardrail_triggers} />
            <StatCard
              label="Avg Response Time"
              value={`${stats.avg_response_time_ms} ms`}
            />
          </div>

          <div style={{ width: "100%", flex: 1, minHeight: 0 }}>
            {chartData.some((d) => d.value > 0) ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#64748b",
                }}
              >
                No routing data yet. Send a query to populate the chart.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div
      style={{
        background: "#f8fafc",
        borderRadius: 14,
        padding: 14,
        border: "1px solid #e2e8f0",
      }}
    >
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }}>{value}</div>
    </div>
  );
}
