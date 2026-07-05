import { useEffect, useMemo, useState } from "react";
import ChatWindow from "./components/ChatWindow";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import { sendChatMessage, checkHealth } from "./api";
import { extractTextFromFile, verifyDocumentFields, buildVerificationPrompt } from "./documentUtils";

export default function App() {
  const sessionId = useMemo(() => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
      (
        c ^
        ((typeof crypto !== "undefined"
          ? crypto.getRandomValues(new Uint8Array(1))[0]
          : Math.floor(Math.random() * 16)) &
          (15 >> (c / 4)))
      ).toString(16)
    );
  }, []);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyticsVisible, setAnalyticsVisible] = useState(true);
  const [analyticsRefreshKey, setAnalyticsRefreshKey] = useState(0);
  const [backendOnline, setBackendOnline] = useState(null);
  const [selectedDocType, setSelectedDocType] = useState("Aadhaar Card");
  const [uploadedFiles, setUploadedFiles] = useState([]);

  useEffect(() => {
    checkHealth().then(setBackendOnline).catch(() => setBackendOnline(false));
  }, []);

  const createUploadId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const updateUpload = (id, update) => {
    setUploadedFiles((prev) => prev.map((item) => (item.id === id ? { ...item, ...update } : item)));
  };

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const data = await sendChatMessage(userMsg, sessionId);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.response,
          agent: data.agent_used,
          responseTimeMs: data.response_time_ms,
        },
      ]);
      setAnalyticsRefreshKey((k) => k + 1);
      setBackendOnline(true);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `Unable to reach the backend: ${err.message}. Start the FastAPI server (port 8000) and ensure GOOGLE_API_KEY is set.`,
          agent: "unknown",
        },
      ]);
      setBackendOnline(false);
    } finally {
      setLoading(false);
    }
  }

  async function processUploadedFile(uploadItem) {
    const { id, file, docType } = uploadItem;
    updateUpload(id, { status: "Extracting text..." });

    const extractedText = await extractTextFromFile(file);
    const verification = verifyDocumentFields(docType, extractedText, file);
    updateUpload(id, {
      extractedText,
      verificationStatus: verification.status,
      notes: verification.notes,
      status: "Sending to KYC agent...",
    });

    const prompt = buildVerificationPrompt({
      docType,
      fileName: file.name,
      fileType: file.type || file.name,
      extractedText,
      notes: verification.notes.join("\n"),
    });

    setLoading(true);
    try {
      const data = await sendChatMessage(prompt, sessionId);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.response,
          agent: data.agent_used || "kyc",
          responseTimeMs: data.response_time_ms,
        },
      ]);
      updateUpload(id, {
        status: "Verification complete",
        response: data.response,
        agent: data.agent_used,
      });
      setAnalyticsRefreshKey((k) => k + 1);
    } catch (err) {
      updateUpload(id, { status: `Error: ${err.message}` });
    } finally {
      setLoading(false);
    }
  }

  async function handleFileSelection(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const newUploads = files.map((file) => ({
      id: createUploadId(),
      file,
      docType: selectedDocType,
      preview: URL.createObjectURL(file),
      status: "Queued",
      verificationStatus: "Pending",
      extractedText: "",
      notes: [],
    }));

    setUploadedFiles((prev) => [...newUploads, ...prev]);
    event.target.value = null;

    for (const uploadItem of newUploads) {
      await processUploadedFile(uploadItem);
    }
  }

  return (
    <div
      style={{
        height: "100vh",
        background: "#f4f7fb",
        padding: "16px 24px",
        fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: 1400, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
            gap: 16,
            flexWrap: "wrap",
            flexShrink: 0,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 28, color: "#111827" }}>
              Tata Capital Agentic Banking Assistant
            </h1>
            <p style={{ margin: "8px 0 0", color: "#475569" }}>
              Master Agent routes queries to KYC, Loan, and EMI specialists with conversation memory.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span
              style={{
                fontSize: 12,
                padding: "6px 12px",
                borderRadius: 999,
                background: backendOnline === false ? "#fee2e2" : backendOnline ? "#dcfce7" : "#f1f5f9",
                color: backendOnline === false ? "#b91c1c" : backendOnline ? "#166534" : "#64748b",
                fontWeight: 600,
              }}
            >
              {backendOnline === null ? "Checking backend…" : backendOnline ? "Backend online" : "Backend offline"}
            </span>
            <button
              onClick={() => setAnalyticsVisible((v) => !v)}
              style={{
                padding: "10px 18px",
                background: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: 10,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {analyticsVisible ? "Hide Analytics" : "Show Analytics"}
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: analyticsVisible ? "1.6fr 1fr" : "1fr",
            gap: 20,
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 24,
              padding: 20,
              boxShadow: "0 24px 80px rgba(15, 23, 42, 0.08)",
              display: "flex",
              flexDirection: "column",
              height: "100%",
              minHeight: 0,
              boxSizing: "border-box",
              overflow: "hidden",
            }}
          >
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <ChatWindow
                messages={messages}
                input={input}
                onInputChange={setInput}
                onSend={sendMessage}
                loading={loading}
                sessionId={sessionId}
              />
            </div>

            <div style={{ marginTop: 18, display: "grid", gap: 12, flexShrink: 0 }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <select
                  value={selectedDocType}
                  onChange={(e) => setSelectedDocType(e.target.value)}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: "1px solid #cbd5e1",
                    fontSize: 14,
                  }}
                >
                  <option>Aadhaar Card</option>
                  <option>PAN Card</option>
                  <option>Bank Statement</option>
                  <option>Salary Slip</option>
                  <option>Address Proof</option>
                </select>
                <label
                  htmlFor="document-upload"
                  style={{
                    padding: "12px 16px",
                    background: "#075e54",
                    color: "white",
                    borderRadius: 12,
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  Upload KYC Document
                </label>
                <input
                  id="document-upload"
                  type="file"
                  accept=".png,.jpg,.jpeg,.pdf"
                  multiple
                  onChange={handleFileSelection}
                  style={{ display: "none" }}
                />
              </div>

              {uploadedFiles.length > 0 && (
                <div style={{ display: "grid", gap: 10 }}>
                  {uploadedFiles.map((upload) => (
                    <div
                      key={upload.id}
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        background: "#f8fafc",
                        fontSize: 13,
                      }}
                    >
                      <strong>{upload.file.name}</strong> — {upload.docType} — {upload.status}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {analyticsVisible && (
            <AnalyticsDashboard
              visible={analyticsVisible}
              onClose={() => setAnalyticsVisible(false)}
              refreshKey={analyticsRefreshKey}
              sessionId={sessionId}
            />
          )}
        </div>
      </div>
    </div>
  );
}
