"use client";

import { useMemo, useState } from "react";

export type Status = "idle" | "uploading" | "done" | "error";

type AskSource = {
  id: string;
  chunk_index: number;
  start_time: number;
  end_time: number;
  display_text: string;
};

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
  const [sessionId, setSessionId] = useState("");
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState("");
  const [askSources, setAskSources] = useState<AskSource[]>([]);

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
    setFile(f);
  }

  async function upload() {
    if (!file) return;
    setStatus("uploading");
    setError("");
    setTranscription("");
    setTranslation("");
    setCopied(false);
    setSummary("");
    setAnswer("");
    setAskSources([]);
    const form = new FormData();
    form.append("file", file);
    form.append("target_language", targetLanguage);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");
      setTranscription(data.transcription || "");
      setTranslation(data.translation || "");
      setSessionId(data.session_id || "");
      setStatus("done");
    } catch (err: any) {
      setStatus("error");
      setError(err?.message || "Something went wrong");
    }
  }

async function copyText() {
  const textToCopy = translation || transcription;
  if (!textToCopy) return;
  await navigator.clipboard.writeText(textToCopy);
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

async function askQuestion() {
  if (!sessionId || !question.trim()) return;
  setAsking(true);
  setError("");
  setAnswer("");
  setAskSources([]);
  try {
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session_id: sessionId,
        question: question.trim(),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Ask failed");
    setAnswer(data.answer || "");
    setAskSources(data.sources || []);
  } catch (err: any) {
    setError(err?.message || "Something went wrong");
  } finally {
    setAsking(false);
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
    sessionId,
    question,
    setQuestion,
    asking,
    answer,
    askSources,
    askQuestion,
  };
}