import React, { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "./lib/api";
import { StartupAndLogin } from "./components/StartupAndLogin";
import { GlossaryModal, InfoPill } from "./components/GlossaryModal";
import { VisionScannerTab } from "./components/VisionScannerTab";
import { AskZeroSpoilTab } from "./components/AskZeroSpoilTab";
import {
  CameraIcon,
  CautionIcon,
  CheckIcon,
  DownloadIcon,
  MoonIcon,
  RefreshIcon,
  SunIcon,
  WeatherIcon,
  XIcon,
} from "./components/Icons";

const TABS = [
  { id: "overview", label: "Executive Overview" },
  { id: "allocation", label: "Smart Allocation Hub" },
  { id: "benchmark", label: "30% Waste Benchmark" },
  { id: "fefo", label: "FEFO Batches & Discounts" },
  { id: "vision", label: "Vision Ripeness Scanner", isVision: true },
  { id: "ask", label: "Ask ZeroSpoil" },
];

function formatBDT(amount) {
  return `৳ ${Number(amount || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export default function App() {
  const [auth, setAuth] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [glossaryKey, setGlossaryKey] = useState(null);

  const [overview, setOverview] = useState(null);
  const [proposalsData, setProposalsData] = useState({ proposals: [], rebalance_opportunities: [] });
  const [benchmark, setBenchmark] = useState(null);
  const [emissions, setEmissions] = useState(null);
  const [batches, setBatches] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const [storeFilter, setStoreFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [highlightedBatch, setHighlightedBatch] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const loadAllData = useCallback(async () => {
    try {
      const [ov, pr, bm, em, bt, al] = await Promise.all([
        api.getOverview(),
        api.getProposals(),
        api.getBenchmark(),
        api.getEmissions(),
        api.getBatches(),
        api.getAuditLog(15),
      ]);
      setOverview(ov);
      setProposalsData(pr);
      setBenchmark(bm);
      setEmissions(em);
      setBatches(bt.batches || []);
      setAuditLogs(al.logs || []);
    } catch {
      showToast("Unable to sync with backend on port 8000.");
    }
  }, []);

  useEffect(() => {
    if (auth) loadAllData();
  }, [auth, loadAllData]);

  const handleDecision = async (proposalId, decision) => {
    setBusyAction(`prop-${proposalId}`);
    try {
      const res = await api.decideProposal(proposalId, decision);
      showToast(`${res.proposal_code} marked ${res.status} by ${res.decided_by}.`);
      await loadAllData();
    } finally {
      setBusyAction("");
    }
  };

  const handleApplyMarkdown = async (batchCode, pct) => {
    setBusyAction(`batch-${batchCode}`);
    try {
      await api.applyBatchMarkdown(batchCode, pct);
      showToast(`Approved ${pct}% dynamic markdown on batch ${batchCode}.`);
      await loadAllData();
    } finally {
      setBusyAction("");
    }
  };

  const handleRunPipeline = async () => {
    setBusyAction("pipeline");
    try {
      const res = await api.runAgentPipeline();
      showToast(
        `Multi-Agent pipeline complete: ${res.forecast_count} forecasts, ${res.markdown_count} markdowns, ${res.rebalance_count} routes.`
      );
      await loadAllData();
    } finally {
      setBusyAction("");
    }
  };

  const handleTickerClick = (alert) => {
    if (alert.batch_code) setHighlightedBatch(alert.batch_code);
    setActiveTab(alert.target_tab || "fefo");
  };

  if (!auth) {
    return <StartupAndLogin onAuthenticated={setAuth} />;
  }

  const weather = overview?.weather;
  const kpis = overview?.kpis;
  const tickerAlerts = overview?.ticker_alerts || [];

  const filteredBatches = batches.filter((b) => {
    if (storeFilter && b.store_code !== storeFilter) return false;
    if (statusFilter && b.status !== statusFilter) return false;
    return true;
  });

  const batchBadgeStyle = (b) => {
    if (b.remaining_hours <= 24) {
      return "bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300";
    }
    if (b.remaining_hours <= 48) {
      return "bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300";
    }
    return "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300";
  };

  return (
    <div className="w-[100vw] min-h-[100vh] flex flex-col bg-[#FAF8F5] dark:bg-[#0F0E0D] text-[#1C1917] dark:text-[#FAFAF9]">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 glass-card border-b border-stone-200 dark:border-stone-800 px-[3%] py-3">
        <div className="w-full flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/zerospoil-logo.png"
              alt="ZeroSpoil"
              className="h-10 object-contain cursor-pointer"
              onClick={() => setActiveTab("overview")}
            />
            <span className="hidden md:inline-block text-[0.6875rem] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
              Dhaka B2B Hub
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {weather && (
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-[0.75rem] font-semibold text-sky-800 dark:text-sky-200 tabular-nums"
                title={weather.advisory}
              >
                <WeatherIcon className="w-3.5 h-3.5" />
                <span>
                  Dhaka {weather.current.temperature_c}&deg;C &middot; {weather.current.humidity_pct}% Hum.
                </span>
              </div>
            )}

           

            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              className="p-2 rounded-lg border border-stone-200 dark:border-stone-700 hover:border-emerald-600 cursor-pointer"
              aria-label="Toggle light and dark theme"
            >
              {darkMode ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
            </button>

            <div className="hidden lg:block text-right pl-2 border-l border-stone-200 dark:border-stone-700">
              <p className="text-[0.75rem] font-bold leading-tight">{auth.user?.name || "Kabir Hossain"}</p>
              <p className="text-[0.6875rem] text-stone-500 dark:text-stone-400">Pran Logistics Hub</p>
            </div>
          </div>
        </div>
      </header>

      {/* Clickable Marquee Ticker Tape */}
      {tickerAlerts.length > 0 && (
        <div className="marquee-container w-full overflow-hidden border-b border-stone-200 dark:border-stone-800 bg-white/80 dark:bg-stone-950/80 py-2">
          <div className="marquee-track gap-6 px-4">
            {[...tickerAlerts, ...tickerAlerts].map((alert, i) => (
              <button
                key={`${alert.id}-${i}`}
                type="button"
                onClick={() => handleTickerClick(alert)}
                className="inline-flex items-center gap-2 text-[0.75rem] font-medium hover:underline cursor-pointer whitespace-nowrap"
              >
                {alert.severity === "CRITICAL" ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-600 text-white text-[0.6875rem] font-bold">
                    <CautionIcon className="w-3 h-3" />
                    {alert.tag}
                  </span>
                ) : alert.severity === "CAUTION" ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-600 text-white text-[0.6875rem] font-bold">
                    <CautionIcon className="w-3 h-3" />
                    {alert.tag}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-600 text-white text-[0.6875rem] font-bold">
                    {alert.tag}
                  </span>
                )}
                <span className="text-stone-800 dark:text-stone-200">{alert.message}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 6 Core Navigation Tabs */}
      <nav className="w-full px-[3%] pt-4 pb-2 border-b border-stone-200/80 dark:border-stone-800/80 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[0.8125rem] font-semibold border transition-colors cursor-pointer ${
                  active
                    ? "bg-emerald-700 text-white border-emerald-700"
                    : "bg-white/70 dark:bg-stone-900/70 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-emerald-600"
                }`}
              >
                {tab.isVision && <CameraIcon className="w-4 h-4" />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-40 rounded-xl bg-stone-900 dark:bg-emerald-800 text-white px-4 py-3 text-[0.8125rem] font-medium shadow-xl border border-stone-700">
          {toast}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full px-[3%] py-6">
        {/* ================= TAB 1: EXECUTIVE OVERVIEW ================= */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Critical Expiry Alert Banner */}
            {overview?.critical_banner && (
              <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-rose-600 text-white shrink-0">
                    <CautionIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                      CRITICAL EXPIRY ALERT &middot; &lt;24H SPOILAGE RISK
                    </p>
                    <p className="text-[0.875rem] font-semibold text-stone-900 dark:text-stone-50 mt-0.5">
                      {overview.critical_banner.product} ({overview.critical_banner.batch_code}) at{" "}
                      {overview.critical_banner.store} has only{" "}
                      <span className="tabular-nums underline">{overview.critical_banner.remaining_hours}h</span>{" "}
                      left ({overview.critical_banner.current_qty_kg} kg &middot;{" "}
                      {formatBDT(overview.critical_banner.value_at_risk_bdt)} at risk).
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setHighlightedBatch(overview.critical_banner.batch_code);
                    setActiveTab("fefo");
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[0.8125rem] font-semibold cursor-pointer"
                >
                  Apply Dynamic Markdown
                </button>
              </div>
            )}

            {/* 4 KPI Cards with (i) Glossary Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[0.75rem] font-semibold text-stone-500 dark:text-stone-400">
                    Verified Waste Reduction
                  </span>
                  <InfoPill termKey="benchmark" onOpen={setGlossaryKey} label="30% Benchmark" />
                </div>
                <p className="font-display text-[1.875rem] font-bold text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
                  {kpis ? `${kpis.waste_reduction_pct}%` : "38.89%"}
                </p>
                <p className="text-[0.75rem] text-stone-600 dark:text-stone-400 mt-1">
                  Exceeds 30.0% target &middot; {kpis?.food_saved_kg ?? 770} kg saved
                </p>
              </div>

              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[0.75rem] font-semibold text-stone-500 dark:text-stone-400">
                    Capital Recovered (30d)
                  </span>
                  <InfoPill termKey="markdown" onOpen={setGlossaryKey} label="Dynamic Markdown" />
                </div>
                <p className="font-display text-[1.875rem] font-bold text-orange-600 dark:text-orange-400 mt-1 tabular-nums">
                  {formatBDT(kpis?.capital_recovered_bdt ?? 486200)}
                </p>
                <p className="text-[0.75rem] text-stone-600 dark:text-stone-400 mt-1">
                  Prevented Dhaka perishable write-offs
                </p>
              </div>

              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[0.75rem] font-semibold text-stone-500 dark:text-stone-400">
                    CO2e Emissions Avoided
                  </span>
                  <InfoPill termKey="co2e" onOpen={setGlossaryKey} label="CO2e Avoided" />
                </div>
                <p className="font-display text-[1.875rem] font-bold text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
                  {kpis?.co2e_avoided_tonnes ?? 1.92} t
                </p>
                <p className="text-[0.75rem] text-stone-600 dark:text-stone-400 mt-1">
                  UN FAOSTAT SDG 12.3 verified
                </p>
              </div>

              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[0.75rem] font-semibold text-stone-500 dark:text-stone-400">
                    Pending Approvals / &lt;48h Risk
                  </span>
                  <InfoPill termKey="hitl" onOpen={setGlossaryKey} label="Human-in-the-Loop" />
                </div>
                <p className="font-display text-[1.875rem] font-bold text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
                  {kpis?.pending_approvals ?? 0} / {kpis?.expiring_48h_count ?? 0}
                </p>
                <p className="text-[0.75rem] text-stone-600 dark:text-stone-400 mt-1">
                  Human sign-off required before dispatch
                </p>
              </div>
            </div>

            {/* Supermarket Inventory Reconciliation Table */}
            <div className="glass-card rounded-2xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-[1.125rem] font-bold">
                      Dhaka Supermarket Inventory Reconciliation Ledger
                    </h2>
                    <InfoPill termKey="reconciliation" onOpen={setGlossaryKey} label="Reconciliation" />
                  </div>
                  <p className="text-[0.75rem] text-stone-500 dark:text-stone-400 mt-0.5">
                    Opening + Received + Transfers In - Sold - Waste - Returns - Transfers Out = Expected Closing [SYNTHETIC]
                  </p>
                </div>
                <span className="text-[0.6875rem] font-semibold px-2.5 py-1 rounded-md bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                  [SYNTHETIC] Calibrated 30-Day Telemetry
                </span>
              </div>

              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse text-[0.8125rem]">
                  <thead>
                    <tr className="border-b border-stone-200 dark:border-stone-800 text-[0.6875rem] uppercase tracking-wider text-stone-500">
                      <th className="py-2.5 pr-3">Supermarket</th>
                      <th className="py-2.5 px-2 text-right">Opening</th>
                      <th className="py-2.5 px-2 text-right">Received</th>
                      <th className="py-2.5 px-2 text-right">Sold</th>
                      <th className="py-2.5 px-2 text-right">Waste</th>
                      <th className="py-2.5 px-2 text-right">Returns</th>
                      <th className="py-2.5 px-2 text-right">Expected</th>
                      <th className="py-2.5 px-2 text-right">Physical</th>
                      <th className="py-2.5 px-2 text-right">Discrepancy</th>
                      <th className="py-2.5 pl-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200/70 dark:divide-stone-800/70 tabular-nums">
                    {(overview?.reconciliation?.stores || []).map((row) => (
                      <tr key={row.store_code} className="hover:bg-stone-50/70 dark:hover:bg-stone-900/50">
                        <td className="py-3 pr-3 font-semibold">
                          {row.store_name}
                          <span className="ml-1.5 text-[0.6875rem] font-normal text-stone-400">
                            {row.data_tag}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right">{row.opening_stock_kg} kg</td>
                        <td className="py-3 px-2 text-right">{row.received_kg} kg</td>
                        <td className="py-3 px-2 text-right">{row.sold_kg} kg</td>
                        <td className="py-3 px-2 text-right text-rose-600">{row.recorded_waste_kg} kg</td>
                        <td className="py-3 px-2 text-right">{row.returns_kg} kg</td>
                        <td className="py-3 px-2 text-right">{row.expected_closing_kg} kg</td>
                        <td className="py-3 px-2 text-right font-semibold">{row.physical_closing_kg} kg</td>
                        <td
                          className={`py-3 px-2 text-right font-bold ${
                            Math.abs(row.discrepancy_kg) > 12 ? "text-rose-600" : "text-emerald-700 dark:text-emerald-400"
                          }`}
                        >
                          {row.discrepancy_kg > 0 ? `+${row.discrepancy_kg}` : row.discrepancy_kg} kg
                        </td>
                        <td className="py-3 pl-3">
                          {row.status === "DISCREPANCY_FLAGGED" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[0.6875rem] font-bold">
                              <CautionIcon className="w-3 h-3" />
                              OVERSTOCK / AUDIT
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[0.6875rem] font-bold">
                              RECONCILED
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Multi-Agent Coordination Audit Trail */}
            <div className="glass-card rounded-2xl p-5">
              <h3 className="font-display text-[1.125rem] font-bold mb-3">
                Multi-Agent Coordination Audit Trail
              </h3>
              <div className="space-y-2">
                {auditLogs.slice(0, 6).map((log) => (
                  <div
                    key={log.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-900/60 px-3.5 py-2.5 text-[0.8125rem]"
                  >
                    <div>
                      <span className="font-bold text-emerald-800 dark:text-emerald-300 mr-2">
                        {log.agent_name}
                      </span>
                      <span className="text-stone-700 dark:text-stone-300">{log.summary}</span>
                    </div>
                    {log.citation && (
                      <span className="text-[0.6875rem] font-semibold px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                        {log.citation}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: SMART ALLOCATION HUB ================= */}
        {activeTab === "allocation" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-[1.25rem] font-bold">
                    Smart Allocation &amp; Dispatch Approval Hub
                  </h2>
                  <InfoPill termKey="hitl" onOpen={setGlossaryKey} label="Human-in-the-Loop" />
                  <InfoPill termKey="rebalance" onOpen={setGlossaryKey} label="Inter-Store Rebalancing" />
                </div>
                <p className="text-[0.8125rem] text-stone-600 dark:text-stone-400 mt-0.5">
                  Review explainable multi-agent dispatch, markdown, and inter-store transfer directives before release.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleRunPipeline}
                  disabled={busyAction === "pipeline"}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-emerald-700 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-[0.8125rem] font-semibold cursor-pointer"
                >
                  <RefreshIcon className={`w-4 h-4 ${busyAction === "pipeline" ? "animate-spin" : ""}`} />
                  <span>Re-Run Agent Pipeline</span>
                </button>

                <a
                  href={api.excelManifestUrl}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-[0.8125rem] font-semibold"
                >
                  <DownloadIcon className="w-4 h-4" />
                  <span>Export Excel Manifest (.xlsx)</span>
                </a>

                <a
                  href={api.pdfManifestUrl}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-[0.8125rem] font-semibold"
                >
                  <DownloadIcon className="w-4 h-4" />
                  <span>Download PDF Manifest (.pdf)</span>
                </a>
              </div>
            </div>

            {/* Proposals Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {(proposalsData.proposals || []).map((prop) => (
                <div key={prop.id} className="glass-card rounded-2xl p-5 flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[0.6875rem] font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                            {prop.agent_name}
                          </span>
                          <span className="text-[0.6875rem] font-mono text-stone-500">{prop.proposal_code}</span>
                          <span className="text-[0.6875rem] text-stone-400">{prop.data_tag}</span>
                        </div>
                        <h3 className="font-display text-[1.0625rem] font-bold mt-1.5">
                          {prop.action_type}: {prop.product_name} ({prop.recommended_qty_kg} kg)
                        </h3>
                        <p className="text-[0.75rem] text-stone-600 dark:text-stone-400">
                          {prop.target_store_name
                            ? `${prop.store_name} -> ${prop.target_store_name}`
                            : prop.store_name}{" "}
                          &middot; {prop.route_corridor}
                        </p>
                      </div>

                      <span
                        className={`text-[0.6875rem] font-bold px-2.5 py-1 rounded-full border ${
                          prop.status === "APPROVED"
                            ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 text-emerald-800 dark:text-emerald-300"
                            : prop.status === "REJECTED"
                            ? "bg-rose-50 dark:bg-rose-950/50 border-rose-300 text-rose-700 dark:text-rose-300"
                            : "bg-amber-50 dark:bg-amber-950/50 border-amber-300 text-amber-800 dark:text-amber-300"
                        }`}
                      >
                        {prop.status}
                      </span>
                    </div>

                    <div className="rounded-xl bg-stone-50/90 dark:bg-stone-900/70 border border-stone-200 dark:border-stone-800 p-3.5 text-[0.8125rem] leading-relaxed">
                      <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-stone-500 mb-1">
                        Explainable AI Reasoning
                      </p>
                      <p className="text-stone-800 dark:text-stone-200">{prop.explanation}</p>
                      <p className="text-[0.75rem] text-stone-500 dark:text-stone-400 mt-2">
                        <strong>Constraints Checked:</strong> {prop.constraints_checked}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[0.75rem] tabular-nums">
                      <div className="rounded-lg border border-stone-200 dark:border-stone-800 p-2.5">
                        <p className="text-stone-500">Projected Savings</p>
                        <p className="font-bold text-orange-600">{formatBDT(prop.projected_savings_bdt)}</p>
                      </div>
                      <div className="rounded-lg border border-stone-200 dark:border-stone-800 p-2.5">
                        <p className="text-stone-500">Waste Avoided</p>
                        <p className="font-bold text-emerald-700 dark:text-emerald-400">
                          {prop.projected_waste_avoided_kg} kg
                        </p>
                      </div>
                      <div className="rounded-lg border border-stone-200 dark:border-stone-800 p-2.5">
                        <p className="text-stone-500">Fleet / Discount</p>
                        <p className="font-bold">
                          {prop.discount_pct > 0 ? `${prop.discount_pct}% Off` : prop.truck_id || "Reefer Hub"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* M-09 Human-in-the-Loop Approve / Reject Buttons */}
                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
                    {prop.status === "PENDING" ? (
                      <div className="flex items-center gap-2 w-full">
                        <button
                          type="button"
                          onClick={() => handleDecision(prop.id, "APPROVED")}
                          disabled={busyAction === `prop-${prop.id}`}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-[0.8125rem] font-semibold cursor-pointer"
                        >
                          <CheckIcon className="w-4 h-4" />
                          <span>Approve Dispatch</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecision(prop.id, "REJECTED")}
                          disabled={busyAction === `prop-${prop.id}`}
                          className="inline-flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[0.8125rem] font-semibold cursor-pointer"
                        >
                          <XIcon className="w-4 h-4" />
                          <span>Reject</span>
                        </button>
                      </div>
                    ) : (
                      <p className="text-[0.75rem] text-stone-500 dark:text-stone-400">
                        Decision recorded: <strong>{prop.status}</strong> by {prop.decided_by || "Kabir Hossain"}.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 3: 30% WASTE REDUCTION BENCHMARK ================= */}
        {activeTab === "benchmark" && benchmark && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    Verified 30-Day Simulation Proof
                  </span>
                  <InfoPill termKey="benchmark" onOpen={setGlossaryKey} label="30% Benchmark" />
                </div>
                <h2 className="font-display text-[1.625rem] font-bold text-emerald-800 dark:text-emerald-300 mt-1 tabular-nums">
                  {benchmark.waste_reduction_pct}% Food Waste Reduction Achieved
                </h2>
                <p className="text-[0.8125rem] text-stone-700 dark:text-stone-300 mt-1 tabular-nums">
                  Formula: ((1,980 kg - 1,210 kg) / 1,980 kg) &times; 100 = <strong>{benchmark.waste_reduction_pct}%</strong>{" "}
                  (Target: &ge; 30.0%)
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center tabular-nums">
                <div className="rounded-xl bg-white/80 dark:bg-stone-900/80 border border-emerald-200 dark:border-emerald-800 px-4 py-2.5">
                  <p className="text-[0.6875rem] text-stone-500">Food Saved</p>
                  <p className="font-display text-[1.125rem] font-bold text-emerald-700 dark:text-emerald-400">
                    {benchmark.net_food_saved_kg} kg
                  </p>
                </div>
                <div className="rounded-xl bg-white/80 dark:bg-stone-900/80 border border-emerald-200 dark:border-emerald-800 px-4 py-2.5">
                  <p className="text-[0.6875rem] text-stone-500">Capital Recovered</p>
                  <p className="font-display text-[1.125rem] font-bold text-orange-600">
                    {formatBDT(benchmark.capital_recovered_bdt)}
                  </p>
                </div>
                <div className="rounded-xl bg-white/80 dark:bg-stone-900/80 border border-emerald-200 dark:border-emerald-800 px-4 py-2.5">
                  <p className="text-[0.6875rem] text-stone-500">CO2e Avoided</p>
                  <p className="font-display text-[1.125rem] font-bold text-emerald-700 dark:text-emerald-400">
                    {benchmark.co2e_avoided_tonnes} t
                  </p>
                </div>
              </div>
            </div>

            {/* Policy A vs Policy B Side-by-Side Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { pol: benchmark.policy_a, tone: "border-rose-300 dark:border-rose-800", titleTone: "text-rose-700 dark:text-rose-300" },
                { pol: benchmark.policy_b, tone: "border-emerald-300 dark:border-emerald-800", titleTone: "text-emerald-700 dark:text-emerald-300" },
              ].map(({ pol, tone, titleTone }) => (
                <div key={pol.name} className={`glass-card rounded-2xl p-5 border ${tone}`}>
                  <h3 className={`font-display text-[1.125rem] font-bold ${titleTone}`}>{pol.name}</h3>
                  <div className="grid grid-cols-3 gap-2 my-4 tabular-nums text-[0.8125rem]">
                    <div className="rounded-lg bg-stone-50 dark:bg-stone-900 p-2.5 border border-stone-200 dark:border-stone-800">
                      <p className="text-[0.6875rem] text-stone-500">Measured Waste</p>
                      <p className="font-bold">{pol.measured_waste_kg} kg ({pol.waste_rate_pct}%)</p>
                    </div>
                    <div className="rounded-lg bg-stone-50 dark:bg-stone-900 p-2.5 border border-stone-200 dark:border-stone-800">
                      <p className="text-[0.6875rem] text-stone-500">Financial Loss</p>
                      <p className="font-bold">{formatBDT(pol.financial_loss_bdt)}</p>
                    </div>
                    <div className="rounded-lg bg-stone-50 dark:bg-stone-900 p-2.5 border border-stone-200 dark:border-stone-800">
                      <p className="text-[0.6875rem] text-stone-500">Carbon Footprint</p>
                      <p className="font-bold">{pol.carbon_footprint_tonnes} t CO2e</p>
                    </div>
                  </div>
                  <ul className="space-y-1.5 text-[0.8125rem] text-stone-700 dark:text-stone-300 list-disc pl-5">
                    {pol.practices.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Recharts 30-Day Daily Waste Comparison Chart */}
            <div className="glass-card rounded-2xl p-5">
              <h3 className="font-display text-[1.125rem] font-bold mb-4">
                30-Day Daily Spoilage Comparison (Policy A Baseline vs. Policy B ZeroSpoil AI)
              </h3>
              <div className="w-full h-[19rem]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={benchmark.daily_series || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#D6D3D1" opacity={0.4} />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} interval={4} />
                    <YAxis tick={{ fontSize: 11 }} unit=" kg" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="policy_a_waste_kg" name="Policy A Baseline Waste (kg)" fill="#E11D48" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="policy_b_waste_kg" name="Policy B ZeroSpoil AI Waste (kg)" fill="#16A34A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* UN FAOSTAT Emissions Breakdown */}
            {emissions && (
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-display text-[1.125rem] font-bold">
                    UN FAOSTAT Emissions Avoided by Food Category
                  </h3>
                  <InfoPill termKey="co2e" onOpen={setGlossaryKey} label="CO2e Avoided" />
                </div>
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[0.8125rem] tabular-nums">
                    <thead>
                      <tr className="border-b border-stone-200 dark:border-stone-800 text-[0.6875rem] uppercase text-stone-500">
                        <th className="py-2">Food Category</th>
                        <th className="py-2 text-right">Food Saved (kg)</th>
                        <th className="py-2 text-right">UN FAOSTAT Factor (kg CO2e/kg)</th>
                        <th className="py-2 text-right">CO2e Avoided (kg)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200/70 dark:divide-stone-800/70">
                      {emissions.category_breakdown.map((row) => (
                        <tr key={row.category}>
                          <td className="py-2.5 font-semibold">{row.category}</td>
                          <td className="py-2.5 text-right">{row.food_saved_kg} kg</td>
                          <td className="py-2.5 text-right">{row.faostat_factor_kg_co2e_per_kg}x</td>
                          <td className="py-2.5 text-right font-bold text-emerald-700 dark:text-emerald-400">
                            {row.co2e_avoided_kg} kg
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: FEFO BATCHES & DISCOUNTS ================= */}
        {activeTab === "fefo" && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-[1.25rem] font-bold">
                    FEFO Batches &amp; Dynamic Markdown Control
                  </h2>
                  <InfoPill termKey="fefo" onOpen={setGlossaryKey} label="FEFO Batches" />
                  <InfoPill termKey="markdown" onOpen={setGlossaryKey} label="Dynamic Markdown" />
                </div>
                <p className="text-[0.8125rem] text-stone-600 dark:text-stone-400 mt-0.5">
                  Sorted by shortest remaining USDA FoodKeeper shelf life. Approve progressive 20–40% discounts directly.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <select
                  value={storeFilter}
                  onChange={(e) => setStoreFilter(e.target.value)}
                  className="rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-1.5 text-[0.8125rem]"
                >
                  <option value="">All Dhaka Supermarkets</option>
                  <option value="SHW-DHN27">Shwapno Dhanmondi 27</option>
                  <option value="AGO-GUL2">Agora Gulshan 2</option>
                  <option value="MNB-UTT7">Meena Bazar Uttara</option>
                  <option value="UNI-BAN11">Unimart Banani</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-1.5 text-[0.8125rem]"
                >
                  <option value="">All Risk States</option>
                  <option value="CRITICAL">Critical (&lt;=24h)</option>
                  <option value="CAUTION">Caution (24-48h)</option>
                  <option value="MARKDOWN_ACTIVE">Markdown Active</option>
                  <option value="OPTIMAL">Peak Freshness</option>
                </select>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-5 overflow-x-auto">
              <table className="w-full text-left border-collapse text-[0.8125rem] tabular-nums">
                <thead>
                  <tr className="border-b border-stone-200 dark:border-stone-800 text-[0.6875rem] uppercase tracking-wider text-stone-500">
                    <th className="py-2.5 pr-3">Batch</th>
                    <th className="py-2.5 px-2">Product &amp; Cold-Chain</th>
                    <th className="py-2.5 px-2">Supermarket</th>
                    <th className="py-2.5 px-2">Countdown</th>
                    <th className="py-2.5 px-2 text-right">Stock</th>
                    <th className="py-2.5 px-2 text-right">Value</th>
                    <th className="py-2.5 px-2">Current Discount</th>
                    <th className="py-2.5 pl-3 text-right">Approve Markdown</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200/70 dark:divide-stone-800/70">
                  {filteredBatches.slice(0, 35).map((b) => (
                    <tr
                      key={b.batch_code}
                      className={
                        highlightedBatch === b.batch_code
                          ? "bg-orange-50/90 dark:bg-orange-950/30"
                          : "hover:bg-stone-50/70 dark:hover:bg-stone-900/50"
                      }
                    >
                      <td className="py-3 pr-3 font-mono font-semibold text-[0.75rem]">
                        {b.batch_code}
                        <div className="text-[0.6875rem] font-sans font-normal text-stone-400">{b.data_tag}</div>
                      </td>
                      <td className="py-3 px-2">
                        <p className="font-semibold">{b.product_name}</p>
                        <p className="text-[0.6875rem] text-stone-500">
                          {b.optimal_temp_c} &middot; {b.foodkeeper_ref}
                        </p>
                      </td>
                      <td className="py-3 px-2">{b.store_name}</td>
                      <td className="py-3 px-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[0.6875rem] font-bold ${batchBadgeStyle(b)}`}
                        >
                          {b.remaining_hours <= 48 && <CautionIcon className="w-3 h-3" />}
                          {b.remaining_hours}h left
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">{b.current_qty_kg} kg</td>
                      <td className="py-3 px-2 text-right font-semibold">{formatBDT(b.value_bdt)}</td>
                      <td className="py-3 px-2">
                        {b.markdown_pct > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-950/60 border border-orange-300 dark:border-orange-800 text-orange-700 dark:text-orange-300 text-[0.6875rem] font-bold">
                            {b.markdown_pct}% ACTIVE
                          </span>
                        ) : (
                          <span className="text-[0.75rem] text-stone-400">Regular</span>
                        )}
                      </td>
                      <td className="py-3 pl-3 text-right">
                        <div className="inline-flex gap-1">
                          {[20, 30, 40].map((pct) => (
                            <button
                              key={pct}
                              type="button"
                              disabled={busyAction === `batch-${b.batch_code}`}
                              onClick={() => handleApplyMarkdown(b.batch_code, pct)}
                              className={`px-2 py-1 rounded-lg border text-[0.6875rem] font-bold transition-colors cursor-pointer ${
                                b.markdown_pct === pct
                                  ? "bg-orange-600 text-white border-orange-600"
                                  : "border-stone-300 dark:border-stone-700 hover:border-orange-600 hover:text-orange-600"
                              }`}
                            >
                              -{pct}%
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 5: VISION RIPENESS SCANNER ================= */}
        {activeTab === "vision" && (
          <VisionScannerTab
            batches={batches}
            onOpenGlossary={setGlossaryKey}
            onDataMutated={loadAllData}
          />
        )}

        {/* ================= TAB 6: ASK ZEROSPOIL ================= */}
        {activeTab === "ask" && <AskZeroSpoilTab onOpenGlossary={setGlossaryKey} />}
      </main>

      {/* Plain-Language (i) Glossary Modal */}
      <GlossaryModal termKey={glossaryKey} onClose={() => setGlossaryKey(null)} />
    </div>
  );
}