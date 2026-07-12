"use client";

import { useState } from "react";
import { SparkleIcon, SendIcon } from "@/components/Icons";
import { ProfileResultCard } from "./ProfileResultCard";

type Candidate = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  batch: number | null;
  branch: string | null;
  bio: string | null;
  profile_interests: { interests: { name: string } | null }[];
};

type Turn = {
  query: string;
  summary: string;
  results: Candidate[];
};

const EXAMPLES = [
  "batch 4 into competitive programming",
  "someone who loves music & movies",
  "night owl who codes",
  "into badminton, looking for friends",
];

function summarize(filters: {
  batch: number | null;
  intent: string | null;
  interest_keywords: string[];
  free_text_keywords: string[];
}) {
  const parts: string[] = [];
  if (filters.batch) parts.push(`batch ${filters.batch}`);
  if (filters.intent) parts.push(filters.intent);
  if (filters.interest_keywords.length) parts.push(`into ${filters.interest_keywords.join(", ")}`);
  if (filters.free_text_keywords.length)
    parts.push(`matching "${filters.free_text_keywords.join(", ")}"`);
  return parts.length
    ? `Here's who I found ${parts.join(", ")}:`
    : "Here are some people you might click with:";
}

export function DiscoverChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);

  async function runQuery(query: string) {
    if (!query || pending) return;
    setInput("");
    setPending(true);

    try {
      const res = await fetch("/api/ai/discover", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTurns((prev) => [
          ...prev,
          { query, summary: data.error ?? "Something went wrong. Try again.", results: [] },
        ]);
        return;
      }
      setTurns((prev) => [
        ...prev,
        { query, summary: summarize(data.filters), results: data.results ?? [] },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-surface/85 px-4 py-3 backdrop-blur-lg">
        <SparkleIcon className="text-xl text-brand-600" />
        <div className="text-lg font-bold tracking-tight">Discover</div>
      </header>

      <div className="flex-1 px-4 pb-40 pt-4">
        {turns.length === 0 && (
          <div className="flex flex-col items-center pt-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-3xl text-brand-500">
              <SparkleIcon />
            </div>
            <p className="mt-4 font-semibold text-slate-700">Find your people</p>
            <p className="mt-1 max-w-xs text-sm text-slate-400">
              Describe who you&apos;re looking for in plain words. AI does the matching.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => runQuery(ex)}
                  className="tap rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-slate-600"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-5">
          {turns.map((turn, i) => (
            <div key={i} className="flex flex-col gap-2.5">
              <div className="tap max-w-[85%] self-end rounded-2xl rounded-br-md bg-brand-600 px-3.5 py-2 text-sm text-white">
                {turn.query}
              </div>
              <p className="text-sm text-slate-500">{turn.summary}</p>
              {turn.results.length === 0 && (
                <p className="text-sm text-slate-400">No matches — try different words.</p>
              )}
              {turn.results.map((r) => (
                <ProfileResultCard
                  key={r.id}
                  id={r.id}
                  displayName={r.display_name}
                  avatarUrl={r.avatar_url}
                  batch={r.batch}
                  branch={r.branch}
                  bio={r.bio}
                  interests={r.profile_interests
                    .map((pi) => pi.interests?.name)
                    .filter((n): n is string => Boolean(n))}
                />
              ))}
            </div>
          ))}
          {pending && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <SparkleIcon className="animate-pulse text-brand-400" />
              Searching...
            </div>
          )}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          runQuery(input.trim());
        }}
        className="fixed inset-x-0 bottom-[68px] z-20 mx-auto flex max-w-md gap-2 px-4"
      >
        <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-surface px-2 py-1.5 shadow-pop">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe who you're looking for..."
            className="flex-1 bg-transparent px-3 py-1.5 text-sm focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending || !input.trim()}
            className="tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white disabled:opacity-40"
          >
            <SendIcon className="text-lg" />
          </button>
        </div>
      </form>
    </div>
  );
}
