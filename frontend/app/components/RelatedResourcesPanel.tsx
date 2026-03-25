"use client";

type RecommendedResource = {
  title: string;
  type: "article" | "video" | "podcast" | "reference";
  why_relevant: string;
  suggested_query: string;
  url?: string | null;
  source?: string | null;
};

type RelatedResourcesPanelProps = {
  topic: string;
  intent: string;
  resources: RecommendedResource[];
  loading: boolean;
  onGenerate: () => void;
  disabled?: boolean;
};

export default function RelatedResourcesPanel({
  topic,
  intent,
  resources,
  loading,
  onGenerate,
  disabled = false,
}: RelatedResourcesPanelProps) {
  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">
            Continue exploring
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            Get smart follow-up resources based on your question and answer.
          </p>
        </div>

        <button
          onClick={onGenerate}
          disabled={disabled || loading}
          className="px-4 py-2 rounded-xl border border-zinc-300 bg-white text-sm font-medium hover:bg-zinc-50 transition disabled:opacity-50"
        >
          {loading ? "Finding..." : "Recommend resources"}
        </button>
      </div>

      {(topic || intent) && (
        <div className="mb-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          {topic && (
            <div className="text-sm text-zinc-700">
              <span className="font-semibold">Topic:</span> {topic}
            </div>
          )}
          {intent && (
            <div className="text-sm text-zinc-700 mt-1">
              <span className="font-semibold">Intent:</span> {intent}
            </div>
          )}
        </div>
      )}

      {resources.length > 0 ? (
        <div className="space-y-3">
          {resources.map((resource, index) => (
            <div
              key={`${resource.title}-${index}`}
              className="rounded-2xl border border-zinc-200 bg-white p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-zinc-900">
                  {resource.title}
                </h3>
                <span className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {resource.type}
                </span>
              </div>

              <p className="mt-2 text-sm text-zinc-700 leading-6">
                {resource.why_relevant}
              </p>
              
          {resource.url ? (
              <a
                href={resource.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex mt-3 text-sm font-medium text-indigo-600 hover:underline"
              >
                Open resource
              </a>
            ) : (
              <div className="mt-3 text-sm text-zinc-500">
                Search manually: {resource.suggested_query}
              </div>
            )}
              
              <div className="mt-3 rounded-xl bg-zinc-50 border border-zinc-200 p-3">
                <div className="text-xs font-semibold text-zinc-500 mb-1">
                  Suggested search
                </div>
                <div className="text-sm text-zinc-800 break-words">
                  {resource.suggested_query}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-zinc-500">
          Suggested follow-up resources will appear here.
        </div>
      )}
    </div>
  );
}