import { useState, useRef, type DragEvent, type FormEvent } from 'react';

const API = '/api/backend';

type Tab = 'transcript' | 'qa' | 'recommendations';

interface TranscriptChunk {
  id: string;
  chunk_index: number;
  start_time: number;
  end_time: number;
  original_text: string;
  display_text: string;
}

interface AskSource {
  id: string;
  chunk_index: number;
  start_time: number;
  end_time: number;
  display_text: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: AskSource[];
}

interface Resource {
  title: string;
  type: string;
  why_relevant: string;
  suggested_query: string;
  url: string | null;
  source: string | null;
}

interface SessionData {
  sessionId: string;
  filename: string;
  sourceLanguage: string;
  targetLanguage: string;
  transcription: string;
  translation: string | null;
}

export default function AppInterface() {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processed, setProcessed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('transcript');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [askingQuestion, setAskingQuestion] = useState(false);
  const [summary, setSummary] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [recMeta, setRecMeta] = useState<{ topic: string; intent: string } | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [transcript, setTranscript] = useState<TranscriptChunk[]>([]);
  const [targetLang, setTargetLang] = useState('en');
  const [lastAskResult, setLastAskResult] = useState<{ question: string; answer: string; sources: AskSource[] } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const handleUpload = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('target_language', targetLang);

      const res = await fetch(`${API}/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setSessionData({
        sessionId: data.session_id,
        filename: data.filename,
        sourceLanguage: data.source_language,
        targetLanguage: data.target_language,
        transcription: data.transcription,
        translation: data.translation,
      });

      // Fetch chunks via search with a broad query to get all chunks
      // We'll use the segments from the upload response to build the transcript view
      const chunks: TranscriptChunk[] = (data.segments || []).map((seg: any, i: number) => ({
        id: String(i),
        chunk_index: i,
        start_time: seg.start,
        end_time: seg.end,
        original_text: seg.text?.trim() || '',
        display_text: seg.text?.trim() || '',
      }));

      setTranscript(chunks);
      setProcessed(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setProcessing(false);
    }
  };

  const handleAsk = async (e: FormEvent) => {
    e.preventDefault();
    if (!question.trim() || askingQuestion || !sessionData) return;

    const userQ = question.trim();
    setMessages((prev) => [...prev, { role: 'user', content: userQ }]);
    setQuestion('');
    setAskingQuestion(true);
    setError(null);

    try {
      const res = await fetch(`${API}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionData.sessionId,
          question: userQ,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get answer');
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer,
          sources: data.sources,
        },
      ]);

      setLastAskResult({
        question: userQ,
        answer: data.answer,
        sources: data.sources,
      });
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${err.message}` },
      ]);
    } finally {
      setAskingQuestion(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  const handleSummarize = async () => {
    if (!sessionData) return;
    setSummarizing(true);
    setError(null);

    try {
      const textToSummarize = sessionData.translation || sessionData.transcription;
      const res = await fetch(`${API}/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSummarize }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Summarization failed');
      }

      setSummary(data.summary);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSummarizing(false);
    }
  };

  const handleGetRecommendations = async () => {
    if (!lastAskResult) return;
    setLoadingRecs(true);
    setError(null);

    try {
      const res = await fetch(`${API}/recommend-resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: lastAskResult.question,
          answer: lastAskResult.answer,
          sources: lastAskResult.sources,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Recommendations failed');
      }

      setRecMeta({ topic: data.topic, intent: data.intent });
      setResources(data.related_resources);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingRecs(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const resetAll = () => {
    setFile(null);
    setProcessed(false);
    setMessages([]);
    setSummary('');
    setResources([]);
    setRecMeta(null);
    setTranscript([]);
    setSessionData(null);
    setLastAskResult(null);
    setError(null);
  };

  // ─── Upload state ───
  if (!processed) {
    return (
      <div className="max-w-2xl mx-auto">
        {/* Error display */}
        {error && (
          <div className="mb-6 bg-copper/10 border border-copper/30 rounded-xl px-5 py-4 text-sm text-copper-dark">
            {error}
          </div>
        )}

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !processing && fileInputRef.current?.click()}
          className={`relative rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-300 ${
            processing
              ? 'border-copper/40 bg-paper-warm cursor-wait'
              : dragOver
                ? 'border-copper bg-copper/5 scale-[1.01] cursor-pointer'
                : file
                  ? 'border-copper/40 bg-paper-warm cursor-pointer'
                  : 'border-paper-dark bg-paper-warm hover:border-copper/30 hover:bg-cream cursor-pointer'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,.m4a,.flac,.aac,.ogg,.wma,.opus,.aiff,.ape"
            onChange={handleFileSelect}
            className="hidden"
          />

          {!file ? (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-cream border border-paper-dark flex items-center justify-center">
                  <svg className="w-7 h-7 text-copper" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
              </div>
              <p className="font-serif text-2xl mb-2">Drop your audio file here</p>
              <p className="text-ink-muted text-sm">or click to browse. MP3, WAV, M4A, FLAC, OGG, AAC, OPUS supported.</p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center gap-4">
                <div className="flex items-end gap-[2px] h-8">
                  {[3, 5, 8, 6, 4, 7, 5, 3].map((h, i) => (
                    <span
                      key={i}
                      className="waveform-bar"
                      style={{ height: `${h * 3}px`, animationDelay: `${i * 0.08}s` }}
                    />
                  ))}
                </div>
                <div className="text-left">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-ink-muted">{formatFileSize(file.size)}</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Language + Upload */}
        {file && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-ink-muted">Translate to:</label>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                disabled={processing}
                className="px-3 py-2 bg-cream border border-paper-dark rounded-lg text-sm focus:outline-none focus:border-copper/50"
              >
                <option value="en">English</option>
                <option value="he">Hebrew</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="ar">Arabic</option>
                <option value="zh">Chinese</option>
                <option value="ja">Japanese</option>
                <option value="ru">Russian</option>
              </select>
            </div>
            <button
              onClick={handleUpload}
              disabled={processing}
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-ink text-cream font-medium rounded-full hover:bg-ink-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? (
                <>
                  <span className="flex items-end gap-[2px] h-4">
                    {[2, 3, 4, 3, 2].map((h, i) => (
                      <span
                        key={i}
                        className="waveform-bar"
                        style={{ height: `${h * 3}px`, animationDelay: `${i * 0.1}s`, width: '2px' }}
                      />
                    ))}
                  </span>
                  Processing...
                </>
              ) : (
                <>
                  Upload & Process
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── Processed state ───
  return (
    <div className="grid lg:grid-cols-12 gap-6">
      {/* Error banner */}
      {error && (
        <div className="lg:col-span-12 bg-copper/10 border border-copper/30 rounded-xl px-5 py-4 text-sm text-copper-dark">
          {error}
          <button onClick={() => setError(null)} className="ml-3 underline">dismiss</button>
        </div>
      )}

      {/* Sidebar: session info */}
      <div className="lg:col-span-3">
        <div className="bg-paper-warm rounded-2xl border border-paper-dark p-5 lg:sticky lg:top-24">
          <p className="text-label text-copper mb-4">Session</p>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-ink-muted">File</span>
              <span className="font-medium truncate ml-2 max-w-[140px]">{sessionData?.filename}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-muted">Source</span>
              <span className="font-medium">{sessionData?.sourceLanguage}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-muted">Target</span>
              <span className="font-medium">{sessionData?.targetLanguage}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-muted">Chunks</span>
              <span className="font-mono text-copper">{transcript.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-muted">ID</span>
              <span className="font-mono text-xs text-slate truncate ml-2 max-w-[120px]">{sessionData?.sessionId}</span>
            </div>
          </div>

          <div className="waveform-line my-5 opacity-40" />

          {/* Translation preview */}
          {sessionData?.translation && (
            <div className="mb-4">
              <p className="text-label text-copper mb-2">Translation</p>
              <p className="text-xs text-ink-muted leading-relaxed line-clamp-4">{sessionData.translation}</p>
            </div>
          )}

          {/* Summary */}
          {!summary ? (
            <button
              onClick={handleSummarize}
              disabled={summarizing}
              className="w-full py-2.5 text-sm font-medium bg-cream border border-paper-dark rounded-lg hover:border-copper/30 transition-colors disabled:opacity-50"
            >
              {summarizing ? (
                <span className="inline-flex items-center gap-2">
                  <span className="flex items-end gap-[2px] h-3">
                    {[2, 3, 4, 3, 2].map((h, i) => (
                      <span
                        key={i}
                        className="waveform-bar"
                        style={{ height: `${h * 2}px`, animationDelay: `${i * 0.1}s`, width: '2px' }}
                      />
                    ))}
                  </span>
                  Summarizing...
                </span>
              ) : 'Generate Summary'}
            </button>
          ) : (
            <div>
              <p className="text-label text-copper mb-2">Summary</p>
              <p className="text-sm text-ink-muted leading-relaxed">{summary}</p>
            </div>
          )}

          <div className="mt-4">
            <button
              onClick={resetAll}
              className="w-full py-2.5 text-sm text-ink-muted hover:text-copper transition-colors"
            >
              Upload New File
            </button>
          </div>
        </div>
      </div>

      {/* Main area */}
      <div className="lg:col-span-9">
        {/* Tabs */}
        <div className="flex gap-1 bg-paper-warm rounded-xl p-1 border border-paper-dark mb-6">
          {([
            ['transcript', 'Transcript'],
            ['qa', 'Ask Questions'],
            ['recommendations', 'Recommendations'],
          ] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === key
                  ? 'bg-cream text-ink shadow-sm'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Transcript tab */}
        {activeTab === 'transcript' && (
          <div className="bg-paper-warm rounded-2xl border border-paper-dark p-6">
            {transcript.length === 0 ? (
              <p className="text-center text-ink-muted py-8">No transcript segments found.</p>
            ) : (
              <div className="space-y-1">
                {transcript.map((chunk, i) => (
                  <div
                    key={chunk.id}
                    className="flex gap-4 py-3 px-3 rounded-lg hover:bg-cream transition-colors group"
                  >
                    <span className="font-mono text-xs text-copper pt-1 shrink-0 w-20">
                      {formatTime(chunk.start_time)} — {formatTime(chunk.end_time)}
                    </span>
                    <p className="text-sm leading-relaxed text-ink-muted group-hover:text-ink transition-colors">
                      {chunk.display_text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Q&A tab */}
        {activeTab === 'qa' && (
          <div className="bg-paper-warm rounded-2xl border border-paper-dark flex flex-col" style={{ minHeight: '500px' }}>
            {/* Messages */}
            <div className="flex-1 p-6 space-y-4 overflow-y-auto">
              {messages.length === 0 && (
                <div className="text-center py-16">
                  <p className="font-serif text-2xl text-ink-muted/40 mb-2">Ask anything</p>
                  <p className="text-sm text-ink-muted/40">about the transcript content</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-lg rounded-2xl px-5 py-3 ${
                      msg.role === 'user'
                        ? 'bg-ink text-cream rounded-br-md'
                        : 'bg-cream border border-paper-dark rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-paper-dark/30 space-y-1.5">
                        <p className="text-label text-copper/60 mb-1">Sources</p>
                        {msg.sources.map((s, j) => (
                          <div key={j} className="pl-2 border-l-2 border-copper/30">
                            <p className="text-xs text-ink-muted">
                              <span className="font-mono text-copper">
                                [{formatTime(s.start_time)}–{formatTime(s.end_time)}]
                              </span>
                              {' '}{s.display_text}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {askingQuestion && (
                <div className="flex justify-start">
                  <div className="bg-cream border border-paper-dark rounded-2xl rounded-bl-md px-5 py-3">
                    <span className="flex items-end gap-[2px] h-4">
                      {[2, 3, 4, 3, 2].map((h, i) => (
                        <span
                          key={i}
                          className="waveform-bar"
                          style={{ height: `${h * 3}px`, animationDelay: `${i * 0.1}s`, width: '2px' }}
                        />
                      ))}
                    </span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleAsk} className="p-4 border-t border-paper-dark">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask about the audio content..."
                  className="flex-1 px-4 py-3 bg-cream border border-paper-dark rounded-xl text-sm focus:outline-none focus:border-copper/50 transition-colors placeholder:text-ink-muted/40"
                />
                <button
                  type="submit"
                  disabled={!question.trim() || askingQuestion}
                  className="px-5 py-3 bg-ink text-cream rounded-xl text-sm font-medium hover:bg-ink-light transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Ask
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Recommendations tab */}
        {activeTab === 'recommendations' && (
          <div className="bg-paper-warm rounded-2xl border border-paper-dark p-6">
            {resources.length === 0 ? (
              <div className="text-center py-16">
                <p className="font-serif text-2xl text-ink-muted/40 mb-3">Learning Resources</p>
                {!lastAskResult ? (
                  <p className="text-sm text-ink-muted/40">
                    Ask a question first — the agent uses your Q&A to generate relevant recommendations.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-ink-muted/40 mb-8">
                      The AI agent will analyze your last question and answer to recommend learning materials.
                    </p>
                    <button
                      onClick={handleGetRecommendations}
                      disabled={loadingRecs}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-ink text-cream text-sm font-medium rounded-full hover:bg-ink-light transition-colors disabled:opacity-50"
                    >
                      {loadingRecs ? (
                        <>
                          <span className="flex items-end gap-[2px] h-4">
                            {[2, 3, 4, 3, 2].map((h, i) => (
                              <span
                                key={i}
                                className="waveform-bar"
                                style={{ height: `${h * 3}px`, animationDelay: `${i * 0.1}s`, width: '2px' }}
                              />
                            ))}
                          </span>
                          Agent analyzing...
                        </>
                      ) : (
                        'Get Recommendations'
                      )}
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div>
                {/* Agent metadata */}
                {recMeta && (
                  <div className="mb-6 bg-cream rounded-xl p-4 border border-paper-dark">
                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-label text-copper block mb-1">Topic</span>
                        <span className="text-ink-muted">{recMeta.topic}</span>
                      </div>
                      <div>
                        <span className="text-label text-copper block mb-1">Inferred Intent</span>
                        <span className="text-ink-muted">{recMeta.intent}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-6">
                  <p className="text-label text-copper">Agent Recommendations</p>
                  <div className="waveform-line flex-1 opacity-40" />
                </div>
                <div className="space-y-3">
                  {resources.map((r, i) => {
                    const inner = (
                      <>
                        <span className="w-10 h-10 rounded-lg bg-paper-warm border border-paper-dark flex items-center justify-center text-copper font-serif text-lg shrink-0">
                          {r.source === 'YouTube' ? '\u25B6' : r.source === 'Wikipedia' ? 'W' : '\u2261'}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-sm group-hover:text-copper transition-colors">{r.title}</p>
                          <p className="text-xs text-ink-muted mt-1">{r.why_relevant}</p>
                          <div className="flex items-center gap-3 mt-2">
                            {r.source && <span className="text-xs text-slate">{r.source}</span>}
                            {r.source && <span className="text-xs text-slate">&middot;</span>}
                            <span className="text-xs text-copper font-medium">{r.type}</span>
                            {r.url && (
                              <>
                                <span className="text-xs text-slate">&middot;</span>
                                <span className="text-xs text-copper underline">Open link</span>
                              </>
                            )}
                          </div>
                        </div>
                      </>
                    );

                    const classes = "flex items-start gap-4 bg-cream rounded-xl p-5 border border-paper-dark hover:border-copper/30 transition-colors group";

                    return r.url ? (
                      <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className={classes}>
                        {inner}
                      </a>
                    ) : (
                      <div key={i} className={classes}>
                        {inner}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
