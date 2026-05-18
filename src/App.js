import { useState } from "react";
import { orchestrate } from "./orchestrator";
import { extractTextFromFile, verifyDocumentFields, buildVerificationPrompt } from "./documentUtils";

const API_KEY = process.env.REACT_APP_GROQ_KEY;
const API_MODEL = process.env.REACT_APP_GROQ_MODEL || "llama-3.1-8b-instant";

const AGENT_COLORS = {
  "Loan Specialist": { bg: "#0066cc", text: "white" },
  "Verification Specialist": { bg: "#00897b", text: "white" },
  "Customer Relations": { bg: "#e65100", text: "white" },
  "General Assistant": { bg: "#555555", text: "white" },
  "⚠ Rulebook": { bg: "#c62828", text: "white" },
};

console.log("Groq config loaded:", {
  apiKeyLoaded: !!API_KEY,
  apiModel: API_MODEL,
});

const API_URL = "https://api.groq.com/openai/v1/chat/completions";

async function callGemini(systemPrompt, userMessage, history = []) {
  try {
    if (!API_KEY || API_KEY.trim() === "") {
      return "API Error: Missing or invalid API key. Add REACT_APP_GROQ_KEY to .env in the project root and restart the app.";
    }

    if (!API_MODEL || API_MODEL.trim() === "") {
      return "API Error: Missing model configuration. Set REACT_APP_GROQ_MODEL in .env to a model your key can access.";
    }

    const chatMessages = [
      {
        role: "system",
        content: systemPrompt,
      },
      ...history.map((msg) => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.text,
      })),
      {
        role: "user",
        content: userMessage,
      },
    ];

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: API_MODEL,
        messages: chatMessages,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    console.log("Groq Response:", response.status, data);

    if (!response.ok) {
      const errorMessage = data?.error?.message || data?.message || response.statusText;
      if (response.status === 401) {
        return `API Error: Invalid API key or access denied. Verify your Groq key and account access, then restart the app.`;
      }
      return `API Error: ${errorMessage}`;
    }

    if (data.error) {
      return "API Error: " + data.error.message;
    }

    return data.choices[0].message.content;

  } catch (error) {
    console.error("Fetch Error:", error);
    return "Something went wrong";
  }
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [activityLog, setActivityLog] = useState([]);
  const [selectedDocType, setSelectedDocType] = useState("Aadhaar Card");
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const createUploadId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const addActivityLog = (text) => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setActivityLog((prev) => [{ time, text }, ...prev].slice(0, 20));
  };

  const updateUpload = (id, update) => {
    setUploadedFiles((prev) => prev.map((item) => (item.id === id ? { ...item, ...update } : item)));
  };

  async function processUploadedFile(uploadItem) {
    const { id, file, docType } = uploadItem;
    updateUpload(id, { status: "Extracting text..." });

    const extractedText = await extractTextFromFile(file);
    const verification = verifyDocumentFields(docType, extractedText, file);
    updateUpload(id, {
      extractedText,
      verificationStatus: verification.status,
      notes: verification.notes,
      status: "Verifying with specialist...",
    });

    const prompt = buildVerificationPrompt({
      docType,
      fileName: file.name,
      fileType: file.type || file.name,
      extractedText,
      notes: verification.notes.join("\n"),
    });

    const history = [...messages];
    const { response, agentUsed, agentType } = await orchestrate(prompt, callGemini, history, {
      forceVerification: true,
    });

    addActivityLog(`Uploaded ${file.name} as ${docType}`);
    addActivityLog(`${agentUsed} responded`);

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        text: response,
        agent: agentUsed,
      },
    ]);

    updateUpload(id, {
      status: "Verification complete",
      response,
      agent: agentUsed,
      agentType,
    });
  }

  async function handleFileSelection(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const newUploads = files.map((file) => ({
      id: createUploadId(),
      file,
      docType: selectedDocType,
      preview: URL.createObjectURL(file),
      status: "Queued for upload",
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

  function getPreviewContent(upload) {
    if (upload.file.type.startsWith("image/")) {
      return (
        <img
          src={upload.preview}
          alt={upload.file.name}
          style={{ width: "100%", borderRadius: 14, objectFit: "cover", maxHeight: 140 }}
        />
      );
    }

    return (
      <div
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 120,
          borderRadius: 14,
          background: "#f1f5f9",
          color: "#475569",
          padding: 14,
          textAlign: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 32 }}>📄</div>
          <div style={{ marginTop: 8, fontWeight: 700 }}>{upload.file.type === "application/pdf" ? "PDF Document" : "Uploaded file"}</div>
        </div>
      </div>
    );
  }

  async function sendMessage() {
    if (!input.trim()) return;

    const userMsg = input;

    setInput("");

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        text: userMsg,
      },
    ]);

    setSummary("");
    setLoading(true);

    const history = [...messages, { role: "user", text: userMsg }];
    const { response, agentUsed, agentType } = await orchestrate(
      userMsg,
      callGemini,
      history
    );

    addActivityLog(`Classifier → ${agentType}`);
    addActivityLog(`${agentUsed} responded`);

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        text: response,
        agent: agentUsed,
      },
    ]);

    setLoading(false);
  }

  async function summarizeConversation() {
    if (messages.length === 0) return;

    setSummaryLoading(true);
    setSummary("");

    const prompt = "Summarize the entire conversation in one concise sentence, including the customer's loan request, eligibility details, and any documents mentioned.";
    const summaryText = await callGemini(
      "You are a conversation summarizer. Read the full banking conversation history and return a concise structured summary.",
      prompt,
      messages
    );

    setSummary(summaryText);
    addActivityLog("Summarize action completed");
    setSummaryLoading(false);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f7fb",
        padding: 24,
        fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1.7fr 0.9fr",
          gap: 20,
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: 24,
            padding: 24,
            boxShadow: "0 24px 80px rgba(15, 23, 42, 0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 22,
              gap: 16,
            }}
          >
            <div>
              <h1 style={{ margin: 0, fontSize: 28, color: "#111827" }}>
                Tata Capital Banking Agent
              </h1>
              <p style={{ margin: "8px 0 0", color: "#475569" }}>
                Agentic banking assistant with specialist routing, summaries, and activity logging.
              </p>
            </div>

            <button
              onClick={summarizeConversation}
              disabled={messages.length === 0 || summaryLoading}
              style={{
                padding: "12px 20px",
                background: summaryLoading ? "#94a3b8" : "#2563eb",
                color: "white",
                border: "none",
                borderRadius: 10,
                cursor: messages.length === 0 ? "not-allowed" : "pointer",
                fontWeight: 600,
                boxShadow: "0 10px 25px rgba(37, 99, 235, 0.18)",
              }}
            >
              {summaryLoading ? "Summarizing..." : "Summarize"}
            </button>
          </div>

          <div
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 20,
              minHeight: 420,
              padding: 24,
              background: "#f8fafc",
              overflowY: "auto",
            }}
          >
            {messages.length === 0 && (
              <div style={{ color: "#64748b", padding: 20, textAlign: "center" }}>
                Start the conversation by asking about loans, documents, EMI, or waivers.
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  marginBottom: 18,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: m.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                {m.agent && (
                  <div style={{ marginBottom: 6 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        background: (AGENT_COLORS[m.agent] || { bg: "#555" }).bg,
                        color: (AGENT_COLORS[m.agent] || { text: "white" }).text,
                        padding: "4px 12px",
                        borderRadius: 999,
                        display: "inline-block",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {m.agent}
                    </span>
                  </div>
                )}

                <div
                  style={{
                    display: "inline-block",
                    background: m.role === "user" ? "#0f172a" : "white",
                    color: m.role === "user" ? "white" : "#0f172a",
                    padding: "16px 18px",
                    borderRadius: 20,
                    maxWidth: "80%",
                    boxShadow: m.role === "assistant" ? "0 10px 30px rgba(15, 23, 42, 0.06)" : "none",
                    lineHeight: 1.6,
                    border: m.role === "assistant" ? "1px solid #e2e8f0" : "none",
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ color: "#64748b", fontSize: 13, padding: "8px 0" }}>
                🔄 Classifying query → routing to specialist...
              </div>
            )}
          </div>

          {summary && (
            <div
              style={{
                marginTop: 20,
                padding: 20,
                borderRadius: 18,
                background: "#eef2ff",
                border: "1px solid #c7d2fe",
              }}
            >
              <h2 style={{ margin: "0 0 10px", fontSize: 18, color: "#1e293b" }}>
                Conversation Summary
              </h2>
              <p style={{ margin: 0, color: "#334155", lineHeight: 1.7 }}>
                {summary}
              </p>
            </div>
          )}

          <div style={{ marginTop: 22, display: "grid", gap: 14 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <select
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value)}
                style={{
                  padding: "14px 16px",
                  borderRadius: 14,
                  border: "1px solid #cbd5e1",
                  fontSize: 15,
                  outline: "none",
                  minWidth: 180,
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
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "14px 18px",
                  background: "#2563eb",
                  color: "white",
                  borderRadius: 14,
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Upload Document
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
              <div style={{ display: "grid", gap: 14 }}>
                {uploadedFiles.map((upload) => (
                  <div
                    key={upload.id}
                    style={{
                      borderRadius: 18,
                      border: "1px solid #e2e8f0",
                      background: "white",
                      overflow: "hidden",
                      boxShadow: "0 10px 25px rgba(15, 23, 42, 0.04)",
                    }}
                  >
                    {getPreviewContent(upload)}
                    <div style={{ padding: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontWeight: 700, color: "#0f172a" }}>{upload.file.name}</div>
                          <div style={{ color: "#64748b", fontSize: 13 }}>{upload.docType}</div>
                        </div>
                        <div style={{ fontSize: 13, color: upload.verificationStatus === "VERIFIED" ? "#166534" : upload.verificationStatus === "REJECTED" ? "#b91c1c" : "#c2410c" }}>
                          {upload.status}
                        </div>
                      </div>
                      {upload.notes && upload.notes.length > 0 && (
                        <div style={{ marginTop: 10, color: "#475569", fontSize: 13, lineHeight: 1.6 }}>
                          {upload.notes.slice(0, 2).map((note, index) => (
                            <div key={index}>• {note}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 22,
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask about loans, KYC, EMI, fee waivers..."
              style={{
                flex: 1,
                padding: 16,
                borderRadius: 14,
                border: "1px solid #cbd5e1",
                fontSize: 16,
                outline: "none",
                boxShadow: "inset 0 1px 3px rgba(15, 23, 42, 0.08)",
              }}
            />

            <button
              onClick={sendMessage}
              style={{
                padding: "16px 24px",
                background: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: 14,
                cursor: "pointer",
                fontSize: 16,
                fontWeight: 700,
                boxShadow: "0 12px 24px rgba(37, 99, 235, 0.18)",
              }}
            >
              Send
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              background: "white",
              borderRadius: 24,
              padding: 20,
              boxShadow: "0 20px 50px rgba(15, 23, 42, 0.06)",
            }}
          >
            <h2 style={{ margin: 0, fontSize: 20, color: "#111827" }}>
              Agent Activity Log
            </h2>
            <p style={{ margin: "10px 0 16px", color: "#475569", lineHeight: 1.5 }}>
              Watch each classifier and specialist action in real time.
            </p>
            <div
              style={{
                minHeight: 260,
                maxHeight: 520,
                overflowY: "auto",
                borderRadius: 16,
                border: "1px solid #e2e8f0",
                padding: 14,
                background: "#f8fafc",
              }}
            >
              {activityLog.length === 0 ? (
                <div style={{ color: "#64748b" }}>
                  No activity yet. Ask a question to see classifier routing.
                </div>
              ) : (
                activityLog.map((entry, index) => (
                  <div
                    key={index}
                    style={{
                      marginBottom: 10,
                      padding: "10px 12px",
                      borderRadius: 14,
                      background: "white",
                      border: "1px solid #e2e8f0",
                      color: "#334155",
                      fontSize: 14,
                    }}
                  >
                    <span style={{ fontWeight: 700, marginRight: 8, color: "#0f172a" }}>
                      {entry.time}
                    </span>
                    {entry.text}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
