"use client";

import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [transcription, setTranscription] = useState("");

  async function upload() {
    if (!file) return;

    setStatus("Uploading and transcribing...");
    setTranscription("");

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: form,
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Upload failed");

      setTranscription(data.transcription || "");
      setStatus("Done ✅");
    } catch (err: any) {
      setStatus("Error: " + err.message);
    }
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-6 p-10">
      <h1 className="text-3xl font-bold">Translaudio</h1>

      <input
        type="file"
        accept="audio/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="border p-2"
      />

      <button
        onClick={upload}
        disabled={!file}
        className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
      >
        Transcribe
      </button>

      {status && <p>{status}</p>}

      {transcription && (
        <textarea
          value={transcription}
          readOnly
          rows={10}
          className="w-full max-w-2xl border p-4"
        />
      )}
    </main>
  );
}
