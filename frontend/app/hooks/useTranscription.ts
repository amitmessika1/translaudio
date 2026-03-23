"use client";

import { useMemo, useState } from "react";

export type Status = "idle" | "uploading" | "done" | "error";

export function useTranscription() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [transcription, setTranscription] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("he");
  const [translation, setTranslation] = useState("");
  const [copied, setCopied] = useState(false);
  const [summary, setSummary] = useState("");
  const [summarizing, setSummarizing] = useState(false);

  const busy = status === "uploading";

  const fileLabel = useMemo(() => {
    if (!file) return "No file selected";
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return `${file.name} • ${sizeMB} MB`;
  }, [file]);

  function resetUi() {
    setStatus("idle");
    setError("");
    setTranscription("");
    setTranslation("");
    setCopied(false);
    setSummary("");
  }

  function isAudioFile(f: File) {
    if (f.type?.startsWith("audio/")) return true;
    const name = f.name.toLowerCase();
    return [".mp3",".wav",".m4a",".flac",".aac",".ogg",".wma",".opus",".aiff",".ape"]
      .some((ext) => name.endsWith(ext));
  }

  function pickFile(f: File) {
    if (!isAudioFile(f)) {
      setStatus("error");
      setError("Please choose an audio file (mp3/wav/m4a...)");
      return;
    }
    setFile(f);
    resetUi();
  }

  async function upload() {
    if (!file) return;

    setStatus("uploading");
    setError("");
    setTranscription("");
    setCopied(false);

    const form = new FormData();
    form.append("file", file);
    form.append("target_language", targetLanguage);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");

      setTranscription(data.transcription || "");
      setTranslation(data.translation || "");
      setStatus("done");
    } catch (err: any) {
      setStatus("error");
      setError(err?.message || "Something went wrong");
    }
  }

  async function copyText() {
    if (!transcription) return;
    await navigator.clipboard.writeText(transcription);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }
  
  async function generateSummary() {
  const baseText = translation || transcription;
  if (!baseText) return;

  setSummarizing(true);
  setError("");

  try {
    const res = await fetch("/api/summarize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: baseText }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Summary failed");

    setSummary(data.summary || "");
  } catch (err: any) {
    setError(err?.message || "Something went wrong");
  } finally {
    setSummarizing(false);
  }
}

  return {
    file,
    status,
    error,
    transcription,
    translation,
    targetLanguage,
    setTargetLanguage,
    copied,
    busy,
    fileLabel,
    setFile, 
    pickFile,
    upload,
    copyText,
    resetUi,
    summary,
    summarizing,
    generateSummary,
  };
}