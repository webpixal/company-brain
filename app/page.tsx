"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";

interface Source {
  source: string;
  title: string;
  score: number;
}

interface QueryResponse {
  query: string;
  answer: string;
  sources: Source[];
}

/**
 * Minimal markdown renderer for answer text: handles **bold**, "- " bullet
 * lists, and strips inline 【source】 brackets plus a trailing
 * "*Source: ...*" line, since sources are already shown in the dedicated
 * Sources panel. Avoids pulling in a full markdown library for a handful
 * of formatting cases, and never uses dangerouslySetInnerHTML.
 */
function renderInlineSpans(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${keyPrefix}-${i}`} className="text-[#161221] font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={`${keyPrefix}-${i}`}>{part}</span>;
  });
}

function renderInlineMarkdown(text: string) {
  const cleaned = text
    .replace(/【[^】]*】/g, "")
    .replace(/\(?\s*\*?Source:[^)]*\)?\s*$/gim, "")
    .replace(/^\*Source:.*\*\s*$/gim, "")
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/g, "")
    .trim();

  const lines = cleaned.split("\n");
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={`list-${blocks.length}`} className="list-disc pl-5 space-y-1 my-2">
        {listItems.map((item, i) => (
          <li key={i}>{renderInlineSpans(item, `li-${blocks.length}-${i}`)}</li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ")) {
      listItems.push(trimmed.slice(2).trim());
      return;
    }
    flushList();
    if (trimmed === "") {
      blocks.push(<div key={`sp-${i}`} className="h-1.5" />);
    } else {
      blocks.push(<p key={`p-${i}`}>{renderInlineSpans(trimmed, `p-${i}`)}</p>);
    }
  });
  flushList();

  return <div className="space-y-0.5">{blocks}</div>;
}

const EXAMPLES = [
  "What is the SLA for escalation response time?",
  "How much does the Growth tier cost?",
  "What are the known limitations of the AI agent?",
  "Why do customers say they already use a call service?",
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [askedOnce, setAskedOnce] = useState(false);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function ask(q?: string) {
    const finalQuery = (q ?? query).trim();
    if (!finalQuery) return;
    setQuery(finalQuery);
    setLoading(true);
    setAskedOnce(true);
    const start = performance.now();
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: finalQuery, top_k: 3 }),
      });
      const data = await res.json();
      setElapsedMs(Math.round(performance.now() - start));
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-screen w-full overflow-hidden bg-[#FAF9FC] text-[#161221] flex flex-col">
      {/* Top bar */}
      <header className="shrink-0 bg-[#FAF9FC]/90 backdrop-blur-sm border-b border-[#E7E3F0]">
        <div className="mx-auto max-w-[1120px] px-4 xs:px-5 sm:px-8 h-12 xs:h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5 xs:gap-3 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://www.needletailai.com/logo.svg"
              alt="Needletail"
              className="h-8 xs:h-9 w-auto shrink-0 object-contain"
            />
            <span className="text-[12.5px] xs:text-[13px] font-medium text-[#6D6784] truncate">
              Company Brain
            </span>
          </div>
        </div>
      </header>

      {/* Scrollable body */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto max-w-[1120px] px-4 xs:px-5 sm:px-8 pt-5 xs:pt-6 sm:pt-8 pb-6 sm:pb-10">
          {/* Hero */}
          <div className="max-w-[620px] mx-auto text-center mb-5 sm:mb-7">
            <div className="inline-flex items-center gap-1.5 text-[10px] xs:text-[11px] font-medium text-[#5B3DF5] bg-[#EFEBFE] border border-[#DCD4FB] rounded-full px-2.5 py-1 mb-3 text-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5B3DF5] shrink-0" />
              <span>GTM · Product · Engineering · Ops, in one place</span>
            </div>
            <h1 className="text-[21px] xs:text-[25px] sm:text-[32px] leading-[1.15] font-semibold tracking-[-0.02em] mb-2.5">
              Ask anything about how we operate.
            </h1>
            <p className="text-[12.5px] xs:text-[13.5px] sm:text-[14.5px] leading-relaxed text-[#6D6784]">
              One question, every team&apos;s knowledge, and an answer traced
              back to exactly where it came from.
            </p>
          </div>

          {/* Search */}
          <div className="max-w-[720px] mx-auto mb-3">
            <div className="group flex items-center gap-2 sm:gap-3 bg-white border border-[#E7E3F0] rounded-2xl pl-3.5 sm:pl-5 pr-2 sm:pr-2.5 py-1 shadow-[0_1px_2px_rgba(22,18,33,0.04)] focus-within:border-[#5B3DF5] focus-within:shadow-[0_0_0_3px_rgba(91,61,245,0.1)] transition-all">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                className="hidden xs:block shrink-0 text-[#B4AFC4] group-focus-within:text-[#5B3DF5] transition-colors"
              >
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && ask()}
                placeholder="Ask a question…"
                className="flex-1 min-w-0 bg-transparent outline-none text-[13px] sm:text-[14.5px] placeholder:text-[#B4AFC4] text-[#161221] py-2.5 sm:py-3"
              />
              {!query && (
                <kbd className="hidden md:flex items-center gap-0.5 text-[10.5px] text-[#948FA3] border border-[#E7E3F0] rounded-md px-1.5 py-0.5 shrink-0">
                  ⌘K
                </kbd>
              )}
              <button
                onClick={() => ask()}
                disabled={loading}
                className="shrink-0 text-[12.5px] sm:text-[13px] font-medium text-white bg-[#5B3DF5] hover:bg-[#4C2FE0] active:scale-[0.97] disabled:opacity-40 disabled:hover:bg-[#5B3DF5] rounded-xl px-3.5 sm:px-4.5 py-2 sm:py-2.5 transition-all"
              >
                {loading ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-white animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1 h-1 rounded-full bg-white animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1 h-1 rounded-full bg-white animate-bounce" />
                  </span>
                ) : (
                  "Ask →"
                )}
              </button>
            </div>
          </div>

          {/* Examples */}
          <div className="flex flex-wrap justify-center gap-x-2.5 gap-y-1.5 mb-7 sm:mb-9 max-w-[760px] mx-auto">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => ask(ex)}
                className="text-[11.5px] text-[#6D6784] bg-white hover:text-[#5B3DF5] hover:border-[#DCD4FB] border border-[#E7E3F0] rounded-full px-3 py-1.5 transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6 lg:gap-10">
              <div className="bg-white border border-[#E7E3F0] rounded-2xl p-5 sm:p-6 space-y-3">
                <div className="h-3 w-20 rounded-full animate-pulse bg-[#F1EEF9]" />
                <div className="h-4 w-full rounded-full animate-pulse bg-[#F1EEF9]" />
                <div className="h-4 w-[94%] rounded-full animate-pulse bg-[#F1EEF9]" />
                <div className="h-4 w-[70%] rounded-full animate-pulse bg-[#F1EEF9]" />
              </div>
              <div className="space-y-3 hidden lg:block">
                <div className="h-3 w-24 rounded-full animate-pulse bg-[#F1EEF9]" />
                <div className="h-16 w-full rounded-2xl animate-pulse bg-[#F1EEF9]" />
                <div className="h-16 w-full rounded-2xl animate-pulse bg-[#F1EEF9]" />
              </div>
            </div>
          )}

          {/* Result — two column on wide screens */}
          {result && !loading && (
            <div key={result.query} className="grid lg:grid-cols-[1.6fr_1fr] gap-x-8 gap-y-6">
              <div className="bg-white border border-[#E7E3F0] rounded-2xl p-4 xs:p-5 sm:p-6 shadow-[0_1px_2px_rgba(22,18,33,0.04)]">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[10.5px] font-semibold tracking-[0.08em] uppercase text-[#5B3DF5]">
                    Answer
                  </div>
                  {elapsedMs !== null && (
                    <div className="text-[11px] text-[#B4AFC4]">{elapsedMs}ms</div>
                  )}
                </div>
                <div className="whitespace-pre-wrap leading-[1.65] text-[13.5px] sm:text-[14.5px] text-[#2B2540]">
                  {renderInlineMarkdown(result.answer)}
                </div>
              </div>

              <div className="lg:sticky lg:top-4 self-start">
                <div className="text-[10.5px] font-semibold tracking-[0.08em] uppercase text-[#948FA3] mb-2.5 px-1">
                  Sources
                </div>
                <div className="flex flex-col gap-2">
                  {result.sources.map((s, i) => (
                    <div
                      key={i}
                      className="group flex items-start gap-3 bg-white border border-[#E7E3F0] hover:border-[#DCD4FB] rounded-xl px-3.5 py-3 transition-colors"
                    >
                      <span className="text-[10.5px] font-semibold text-[#B4AFC4] group-hover:text-[#5B3DF5] pt-0.5 shrink-0 w-4 transition-colors">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-[#161221] mb-0.5 truncate">
                          {s.title}
                        </div>
                        <div className="text-[11px] text-[#948FA3] truncate">{s.source}</div>
                      </div>
                      <div className="shrink-0 flex items-center gap-2 pt-1">
                        <div className="hidden xs:block w-8 h-[3px] rounded-full bg-[#F1EEF9] overflow-hidden">
                          <div
                            className="h-full bg-[#5B3DF5] transition-all duration-700 ease-out"
                            style={{ width: `${Math.min(100, s.score * 200)}%` }}
                          />
                        </div>
                        <span className="text-[10.5px] text-[#948FA3] w-6 text-right">
                          {s.score.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!askedOnce && !loading && (
            <div className="text-[12px] text-[#B4AFC4] text-center leading-relaxed border-t border-[#E7E3F0] pt-5 max-w-[420px] mx-auto">
              No question asked yet — try one of the examples above, or ask
              your own.
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="shrink-0 border-t border-[#E7E3F0] px-4 xs:px-5 sm:px-8 py-2.5 flex items-center justify-center">
        <span className="text-[11px] text-[#948FA3]">Company Brain · internal knowledge assistant</span>
      </footer>
    </div>
  );
}