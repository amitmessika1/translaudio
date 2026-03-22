"use client";

import React from "react";

type Status = "idle" | "uploading" | "done" | "error";

type Props = {
  file: File | null;
  status: Status;
  error: string;
  onUpload: () => void;
};

export default function ActionsBar({ file, status, error, onUpload }: Props) {
  const busy = status === "uploading";

  return (
    <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
      <button
        onClick={onUpload}
        disabled={!file || busy}
        className="px-8 py-4 rounded-2xl text-white text-lg font-semibold bg-gradient-to-r from-indigo-600 to-fuchsia-600 shadow-lg hover:scale-105 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? "Transcribing…" : "Transcribe"}
      </button>

      <div className="text-lg">
        {status === "done" && <span className="text-green-600 font-medium">Done ✓</span>}
        {status === "error" && <span className="text-red-600 font-medium">Error: {error}</span>}
      </div>
    </div>
  );
}