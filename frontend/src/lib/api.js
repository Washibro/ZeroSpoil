export const API_BASE =
  (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/+$/, "");

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    const errText = await res.text().catch(() => "Request failed");
    throw new Error(errText || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  demoLogin: () => request("/api/auth/demo-login", { method: "POST" }),
  getOverview: () => request("/api/overview"),
  getBatches: (storeCode = "", status = "") => {
    const params = new URLSearchParams();
    if (storeCode) params.set("store_code", storeCode);
    if (status) params.set("status", status);
    const qs = params.toString();
    return request(`/api/batches${qs ? `?${qs}` : ""}`);
  },
  applyBatchMarkdown: (batchCode, discountPct) =>
    request(`/api/batches/${encodeURIComponent(batchCode)}/markdown`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        discount_pct: discountPct,
        approved_by: "Kabir Hossain",
      }),
    }),
  getProposals: () => request("/api/proposals"),
  decideProposal: (proposalId, decision) =>
    request(`/api/proposals/${proposalId}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decision,
        decided_by: "Kabir Hossain",
      }),
    }),
  runAgentPipeline: () => request("/api/agents/run-pipeline", { method: "POST" }),
  getAuditLog: (limit = 20) => request(`/api/agents/audit-log?limit=${limit}`),
  getBenchmark: () => request("/api/simulation/benchmark"),
  getEmissions: () => request("/api/emissions/summary"),
  getVisionPresets: () => request("/api/vision/presets"),
  analyzeVision: ({ presetId, batchCode, useGemini, file }) => {
    const form = new FormData();
    if (presetId) form.append("preset_id", presetId);
    if (batchCode) form.append("batch_code", batchCode);
    form.append("use_gemini", useGemini ? "true" : "false");
    if (file) form.append("file", file);
    return request("/api/vision/analyze", { method: "POST", body: form });
  },
  askZeroSpoil: (question) =>
    request("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    }),
  getMcpInfo: () => request("/api/mcp/info"),
  excelManifestUrl: `${API_BASE}/api/dispatch/export/excel`,
  pdfManifestUrl: `${API_BASE}/api/dispatch/export/pdf`,
  swaggerDocsUrl: `${API_BASE}/docs`,
};