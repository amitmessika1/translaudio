"use client";

type AskSource = {
  id: string;
  chunk_index: number;
  start_time: number;
  end_time: number;
  display_text: string;
};

type AskPanelProps = {
  question: string;
  onQuestionChange: (value: string) => void;
  onAsk: () => void;
  asking: boolean;
  answer: string;
  sources: AskSource[];
  disabled?: boolean;
};

function formatTime(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function AskPanel({
  question,
  onQuestionChange,
  onAsk,
  asking,
  answer,
  sources,
  disabled = false,
}: AskPanelProps) {
  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-zinc-900">
          Ask about the transcript
        </h2>

        <button
          onClick={onAsk}
          disabled={disabled || !question.trim() || asking}
          className="px-4 py-2 rounded-xl border border-zinc-300 bg-white text-sm font-medium hover:bg-zinc-50 transition disabled:opacity-50"
        >
          {asking ? "Thinking..." : "Ask"}
        </button>
      </div>

      <textarea
        value={question}
        onChange={(e) => onQuestionChange(e.target.value)}
        rows={3}
        placeholder="Ask a question about the audio..."
        className="w-full rounded-2xl border border-zinc-300 bg-white p-4 text-base leading-relaxed shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-100"
      />

      <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-5 min-h-[120px]">
        {answer ? (
          <p className="whitespace-pre-wrap text-zinc-800 leading-7">{answer}</p>
        ) : (
          <p className="text-zinc-500">
            The answer will appear here after you ask a question.
          </p>
        )}
      </div>

      {sources.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-zinc-700 mb-3">Sources</h3>

          <div className="space-y-3">
            {sources.map((source) => (
              <div
                key={source.id}
                className="rounded-2xl border border-zinc-200 bg-white p-4"
              >
                <div className="text-xs font-medium text-indigo-600 mb-2">
                  Chunk {source.chunk_index} • {formatTime(source.start_time)}–{formatTime(source.end_time)}
                </div>
                <p className="text-sm text-zinc-700 leading-6 whitespace-pre-wrap">
                  {source.display_text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}