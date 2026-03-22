"use client";

import React from "react";

type Props = {
  transcription: string;
  copied: boolean;
  onCopy: () => void;
};

export default function TranscriptPanel({ transcription, copied, onCopy }: Props) {
  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-zinc-900">Transcript</h2>

        <button
          onClick={onCopy}
          disabled={!transcription}
          className="px-4 py-2 rounded-xl border border-zinc-300 bg-white text-sm font-medium hover:bg-zinc-50 transition disabled:opacity-50"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>

      <textarea
        value={transcription}
        readOnly
        rows={12}
        placeholder="Your transcript will appear here..."
        className="w-full rounded-2xl border border-zinc-300 bg-white p-6 text-lg leading-relaxed shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-100"
      />
    </div>
  );
}