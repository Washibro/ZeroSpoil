import React, { useEffect } from "react";
import { GLOSSARY_TERMS } from "../data/glossary";
import { XIcon } from "./Icons";

export function InfoPill({ termKey, onOpen, label }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen(termKey);
      }}
      title={label ? `Explain ${label}` : "Plain-language explanation"}
      className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-stone-300 dark:border-stone-600 text-[0.6875rem] font-semibold text-stone-600 dark:text-stone-300 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-colors cursor-pointer shrink-0"
      aria-label={`Information about ${label || termKey}`}
    >
      i
    </button>
  );
}

export function GlossaryModal({ termKey, onClose }) {
  const entry = termKey ? GLOSSARY_TERMS[termKey] : null;

  useEffect(() => {
    if (!entry) return undefined;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [entry, onClose]);

  if (!entry) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="glass-card w-full max-w-[34rem] rounded-2xl p-6 text-left shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-200 dark:border-stone-700 pb-3">
          <div>
            <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              {entry.category}
            </p>
            <h3 className="font-display text-[1.25rem] font-bold mt-0.5 text-stone-900 dark:text-stone-50">
              {entry.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 cursor-pointer"
            aria-label="Close glossary modal"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4">
          <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 mb-1">
            In Easy Words
          </p>
          <p className="text-[0.875rem] leading-relaxed text-stone-800 dark:text-stone-200">
            {entry.easyWords}
          </p>
        </div>

        <div className="mt-4">
          <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
            How ZeroSpoil Uses This in Dhaka
          </p>
          <p className="text-[0.8125rem] leading-relaxed text-stone-700 dark:text-stone-300">
            {entry.dhakaWorkflow}
          </p>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[0.8125rem] font-semibold transition-colors cursor-pointer"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}