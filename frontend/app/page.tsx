"use client";

import React from "react";
import UploadDropzone from "./components/UploadDropzone";
import ActionsBar from "./components/ActionsBar";
import TranscriptPanel from "./components/TranscriptPanel";
import { useTranscription } from "./hooks/useTranscription";
import { LANGUAGES } from "./constants/languages";
import LanguageSelector from "./components/LanguageSelector";
import SummaryPanel from "./components/SummaryPanel";
import AskPanel from "./components/AskPanel";
import RelatedResourcesPanel from "./components/RelatedResourcesPanel";

export default function Home() {
  const {
    file,
    status,
    error,
    transcription,
    translation,
    summary,
    summarizing,
    generateSummary,
    targetLanguage,
    setTargetLanguage,
    copied,
    busy,
    fileLabel,
    pickFile,
    upload,
    copyText,
    question,
    setQuestion,
    asking,
    answer,
    askSources,
    askQuestion,
    sessionId,
    recommending,
    resourceTopic,
    resourceIntent,
    relatedResources,
    generateRelatedResources,
  } = useTranscription();

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50 text-zinc-900">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-indigo-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-[-120px] h-[520px] w-[520px] rounded-full bg-fuchsia-400/20 blur-3xl" />
      <div className="pointer-events-none absolute top-[30%] left-[-180px] h-[520px] w-[520px] rounded-full bg-cyan-400/15 blur-3xl" />

      <div className="relative mx-auto max-w-5xl px-4 py-16 sm:py-20">
        <header className="mx-auto max-w-3xl text-center">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-transparent">
            Translaudio
          </h1>
          <p className="mt-6 text-2xl text-zinc-600 leading-relaxed">
            Upload audio and get a clean transcript in seconds.
          </p>
        </header>

        <section className="mx-auto mt-14 max-w-3xl rounded-3xl border border-zinc-200 bg-white/70 backdrop-blur-xl p-8 shadow-[0_30px_80px_rgba(0,0,0,0.08)]">
          <UploadDropzone fileLabel={fileLabel} onPickFile={pickFile} />

        <LanguageSelector
          value={targetLanguage}
          onChange={setTargetLanguage}
          languages={LANGUAGES}
        />

          <ActionsBar file={file} status={status} error={error} onUpload={upload} />

          <TranscriptPanel transcription={translation || transcription} copied={copied} onCopy={copyText} />
          <SummaryPanel summary={summary} summarizing={summarizing} onSummarize={generateSummary}
              disabled={!(translation || transcription)}
            />
            <AskPanel question={question} onQuestionChange={setQuestion} onAsk={askQuestion}
                  asking={asking} answer={answer} sources={askSources}
                    disabled={!sessionId || !(translation || transcription)}
              />
              
            <RelatedResourcesPanel topic={resourceTopic} intent={resourceIntent}
                resources={relatedResources} loading={recommending}
                    onGenerate={generateRelatedResources} disabled={!answer}
            />
        </section>
      </div>
    </main>
  );
}
