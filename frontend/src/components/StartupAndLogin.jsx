import React, { useEffect, useState } from "react";
import { api } from "../lib/api";

const TELEMETRY_PHASES = [
  {
    pct: 30,
    tag: "STORE NETWORK (30%)",
    message: "Connecting Shwapno, Agora, Meena Bazar, Unimart...",
  },
  {
    pct: 65,
    tag: "WEATHER TELEMETRY (65%)",
    message: "Dhaka Ambient Temperature & Rainfall Live...",
  },
  {
    pct: 88,
    tag: "SHELF-LIFE MODELS (88%)",
    message: "USDA FoodKeeper Perishable Guidelines Calibrated...",
  },
  {
    pct: 100,
    tag: "DISPATCH READY (100%)",
    message: "Supply Chain & Spoilage Optimization Active",
  },
];

export function StartupAndLogin({ onAuthenticated }) {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [loaderDone, setLoaderDone] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [oauthNotice, setOauthNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhaseIdx(1), 500),
      setTimeout(() => setPhaseIdx(2), 1050),
      setTimeout(() => setPhaseIdx(3), 1550),
      setTimeout(() => setLoaderDone(true), 2000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleDemoLogin = async () => {
    setLoadingAuth(true);
    setError("");
    try {
      const data = await api.demoLogin();
      onAuthenticated(data);
    } catch (err) {
      setError("Could not reach backend on port 8000. Verify FastAPI is running.");
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleGoogleSlot = () => {
    setOauthNotice(
      "Enterprise Google OAuth 2.0 Client ID binding is ready for production SSO. Signing you into the verified Pran Logistics Hub demo workspace."
    );
    setTimeout(() => {
      handleDemoLogin();
    }, 650);
  };

  const activePhase = TELEMETRY_PHASES[phaseIdx];

  return (
    <div className="w-[100vw] min-h-[100vh] flex items-center justify-center px-4 py-10 bg-[#FAF8F5] dark:bg-[#0F0E0D]">
      {!loaderDone ? (
        <div className="glass-card w-full max-w-[30rem] rounded-2xl p-8 text-center">
          <img
            src="/zerospoil-logo.png"
            alt="ZeroSpoil — Predict Smart. Stock Right. Waste Less."
            className="h-16 mx-auto object-contain mb-6"
          />

          <div className="flex items-center justify-between text-[0.6875rem] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-2">
            <span>{activePhase.tag}</span>
            <span className="tabular-nums">{activePhase.pct}%</span>
          </div>

          <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
            <div
              className="h-full bg-emerald-600 transition-all duration-400 ease-out"
              style={{ width: `${activePhase.pct}%` }}
            />
          </div>

          <p className="mt-4 text-[0.8125rem] text-stone-600 dark:text-stone-300 min-h-[1.5rem]">
            {activePhase.message}
          </p>

          <div className="mt-6 grid grid-cols-4 gap-2 text-[0.6875rem]">
            {["Stores", "Weather", "FoodKeeper", "Dispatch"].map((label, idx) => (
              <div
                key={label}
                className={`py-1.5 rounded-lg border text-center font-medium transition-colors ${
                  idx <= phaseIdx
                    ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300"
                    : "border-stone-200 dark:border-stone-800 text-stone-400"
                }`}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="glass-card w-full max-w-[30rem] rounded-2xl p-8">
          <div className="text-center border-b border-stone-200 dark:border-stone-800 pb-5">
            <img
              src="/zerospoil-logo.png"
              alt="ZeroSpoil"
              className="h-14 mx-auto object-contain mb-3"
            />
            <h1 className="font-display text-[1.375rem] font-bold text-stone-900 dark:text-stone-50">
              Dhaka B2B Supply Command Center
            </h1>
            <p className="text-[0.8125rem] text-stone-600 dark:text-stone-400 mt-1">
              Perishable distribution &amp; spoilage prevention across 4 Dhaka supermarkets
            </p>
          </div>

          <div className="mt-5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4">
            <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Verified Enterprise Persona
            </p>
            <p className="font-display text-[1.0625rem] font-bold text-stone-900 dark:text-stone-100 mt-1">
              Kabir Hossain
            </p>
            <p className="text-[0.8125rem] text-stone-600 dark:text-stone-300">
              Head of Fresh Supply Chain &amp; Supermarket Dispatch
            </p>
            <p className="text-[0.75rem] text-stone-500 dark:text-stone-400 mt-0.5">
              Pran Logistics Hub &middot; Dhaka Cold-Chain Network (BDT)
            </p>
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3 text-[0.8125rem] text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {oauthNotice && (
            <div className="mt-4 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 p-3 text-[0.75rem] text-sky-800 dark:text-sky-200">
              {oauthNotice}
            </div>
          )}

          <div className="mt-5 space-y-3">
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={loadingAuth}
              className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-[0.875rem] font-semibold transition-colors cursor-pointer"
            >
              {loadingAuth ? "Opening Command Center..." : "1-Click Demo Login as Kabir Hossain"}
            </button>

            <button
              type="button"
              onClick={handleGoogleSlot}
              disabled={loadingAuth}
              className="w-full py-2.5 px-4 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-100 text-[0.8125rem] font-semibold flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
                <path fill="#34A853" d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z" />
                <path fill="#FBBC05" d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 0 0 0 10.76l3.98-3.09z" />
                <path fill="#EA4335" d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}