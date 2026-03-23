"use client";

import React from "react";

type Props = {
  summary: string;
  summarizing: boolean;
  onSummarize: () => void;
  disabled?: boolean;
};

export default function SummaryPanel({
  summary,
  summarizing,
  onSummarize,
  disabled,
}: Props) {
  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-zinc-900">Summary</h2>

        <button
          type="button"
          onClick={onSummarize}
          disabled={disabled || summarizing}
          className="px-4 py-2 rounded-xl border border-zinc-300 bg-white text-sm font-medium hover:bg-zinc-50 transition disabled:opacity-50"
        >
          {summarizing ? "Summarizing..." : "Summarize"}
        </button>
      </div>

      <div className="w-full rounded-2xl border border-zinc-300 bg-white p-6 text-lg leading-relaxed shadow-sm min-h-[140px]">
        {summary ? (
          <p className="whitespace-pre-wrap text-zinc-800">{summary}</p>
        ) : (
          <p className="text-zinc-400">
            Click “Summarize” to generate a summary for this audio.
          </p>
        )}
      </div>
    </div>
  );
}