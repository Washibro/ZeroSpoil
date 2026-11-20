import React, { useState } from "react";
import { api } from "../lib/api";
import { InfoPill } from "./GlossaryModal";
import { SendIcon } from "./Icons";

const STARTER_PROMPTS = [
  "What batches are expiring soon at Shwapno and how should fresh milk be stored?",
  "Which Dhaka supermarket has an inventory reconciliation discrepancy right now?",
  "What is the USDA FoodKeeper safe storage temperature for chilled poultry and rohu fish?",
  "Show urgent expiring batches across Agora Gulshan 2 and Unimart Banani.",
];

export function AskZeroSpoilTab({ onOpenGlossary }) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hello Kabir. Ask me about expiring batches under 48 hours, USDA FoodKeeper storage temperatures, or stock reconciliation across Shwapno, Agora, Meena Bazar, and Unimart.",
      citations: [],
    },
  ]);

  const submitQuestion = async (qText) => {
    const clean = (qText || question).trim();
    if (!clean || loading) return;
    setQuestion("");
    setMessages((prev) => [...prev, { role: "user", text: clean }]);
    setLoading(true);
    try {
      const res = await api.askZeroSpoil(clean);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: res.answer,
          citations: res.citations || [],
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Could not reach the ZeroSpoil backend on port 8000. Verify FastAPI is running.",
          citations: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[64rem] mx-auto glass-card rounded-2xl p-6 flex flex-col min-h-[34rem]">
      <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3.5">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-[1.25rem] font-bold">Ask ZeroSpoil</h2>
          <InfoPill termKey="ask" onOpen={onOpenGlossary} label="Ask ZeroSpoil" />
        </div>
        <span className="text-[0.6875rem] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
          Live Inventory &amp; FoodKeeper Verified
        </span>
      </div>

      {/* Quick Prompts */}
      <div className="flex flex-wrap gap-2 py-3.5 border-b border-stone-200/70 dark:border-stone-800/70">
        {STARTER_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => submitQuestion(p)}
            disabled={loading}
            className="text-left text-[0.75rem] px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:border-emerald-600 bg-white/70 dark:bg-stone-900/70 text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Conversation Feed */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 max-h-[24rem]">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`rounded-xl p-4 text-[0.8125rem] leading-relaxed ${
              m.role === "user"
                ? "ml-auto max-w-[80%] bg-emerald-700 text-white"
                : "mr-auto max-w-[92%] bg-white/85 dark:bg-stone-900/85 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-100"
            }`}
          >
            <p className="whitespace-pre-line">{m.text}</p>

            {m.citations?.length > 0 && (
              <div className="mt-3 pt-2.5 border-t border-stone-200 dark:border-stone-700 flex flex-wrap gap-1.5">
                {m.citations.map((c) => (
                  <span
                    key={c}
                    className="text-[0.6875rem] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="text-[0.8125rem] text-stone-500 px-2">
            Checking store inventory and USDA FoodKeeper guidelines...
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitQuestion();
        }}
        className="mt-3 flex gap-2 pt-3 border-t border-stone-200 dark:border-stone-800"
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about expiring batches, storage temperatures, or store reconciliation..."
          className="flex-1 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3.5 py-2.5 text-[0.8125rem] focus:outline-none focus:border-emerald-600"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-[0.8125rem] font-semibold cursor-pointer"
        >
          <SendIcon className="w-4 h-4" />
          <span>Ask</span>
        </button>
      </form>
    </div>
  );
}