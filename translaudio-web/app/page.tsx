"use client";

import React, { useMemo, useState } from "react";

type Status = "idle" | "uploading" | "done" | "error";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [transcription, setTranscription] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);

  const fileLabel = useMemo(() => {
    if (!file) return "No file selected";
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return `${file.name} • ${sizeMB} MB`;
  }, [file]);

  function pickFirstAudio(files: FileList | null) {
    if (!files || files.length === 0) return;
    const f = files[0];

    if (!f.type.startsWith("audio/")) {
      setStatus("error");
      setError("Please choose an audio file (mp3/wav/m4a...)");
      return;
    }

    setFile(f);
    setStatus("idle");
    setError("");
    setTranscription("");
    setCopied(false);
  }

  async function upload() {
    if (!file) return;

    setStatus("uploading");
    setError("");
    setTranscription("");
    setCopied(false);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");

      setTranscription(data.transcription || "");
      setStatus("done");
    } catch (err: any) {
      setStatus("error");
      setError(err.message || "Something went wrong");
    }
  }

  async function copyText() {
    await navigator.clipboard.writeText(transcription);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  const busy = status === "uploading";

return (
  <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50 text-zinc-900">
    
    {/* Soft color blobs */}
    <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-indigo-400/20 blur-3xl" />
    <div className="pointer-events-none absolute -bottom-40 right-[-120px] h-[520px] w-[520px] rounded-full bg-fuchsia-400/20 blur-3xl" />
    <div className="pointer-events-none absolute top-[30%] left-[-180px] h-[520px] w-[520px] rounded-full bg-cyan-400/15 blur-3xl" />

    <div className="relative mx-auto max-w-5xl px-4 py-16 sm:py-20">

      {/* Hero */}
      <header className="mx-auto max-w-3xl text-center">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-transparent">
          Translaudio
        </h1>

        <p className="mt-6 text-2xl text-zinc-600 leading-relaxed">
          Upload audio and get a clean transcript in seconds.
        </p>
      </header>

      {/* Glass Card */}
      <section className="mx-auto mt-14 max-w-3xl rounded-3xl border border-zinc-200 bg-white/70 backdrop-blur-xl p-8 shadow-[0_30px_80px_rgba(0,0,0,0.08)]">

        {/* Upload box */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            pickFirstAudio(e.dataTransfer.files);
          }}
          className={[
            "rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200",
            isDragging
              ? "border-indigo-500 bg-indigo-50 scale-[1.02]"
              : "border-zinc-300 bg-white hover:border-indigo-400",
          ].join(" ")}
        >
  
       <div className="mt-4 text-xl text-zinc-700">
  <label className="cursor-pointer font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
    Choose a file
    <input
      type="file"
      accept="audio/*"
      onChange={(e) => pickFirstAudio(e.target.files)}
      className="hidden"
    />
  </label>
</div>

          <div className="mt-4 text-base text-zinc-500 font-medium">
  {fileLabel}
</div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={upload}
            disabled={!file || busy}
            className="px-8 py-4 rounded-2xl text-white text-lg font-semibold bg-gradient-to-r from-indigo-600 to-fuchsia-600 shadow-lg hover:scale-105 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? "Transcribing…" : "Transcribe"}
          </button>

          <div className="text-lg">
            {status === "done" && (
              <span className="text-green-600 font-medium">Done ✓</span>
            )}
            {status === "error" && (
              <span className="text-red-600 font-medium">
                Error: {error}
              </span>
            )}
          </div>
        </div>

        {/* Transcript */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-zinc-900">
              Transcript
            </h2>

            <button
              onClick={copyText}
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
      </section>
    </div>
  </main>
);

}
