"use client";

import { useState } from "react";
import { ProfileResultCard } from "./ProfileResultCard";

type Candidate = {
  id: string;
  display_name: string;
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
  if (filters.free_text_keywords.length) parts.push(`matching "${filters.free_text_keywords.join(", ")}"`);
  return parts.length ? `Looking for people ${parts.join(", ")}...` : "Showing people you might like...";
}

export function DiscoverChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = input.trim();
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
    <div className="flex flex-1 flex-col">
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {turns.length === 0 && (
          <p className="text-sm text-slate-400">
            Try: &ldquo;batch 4 students into competitive programming and music&rdquo; or
            &ldquo;someone into badminton looking for friends&rdquo;.
          </p>
        )}
        {turns.map((turn, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="self-end max-w-[85%] rounded-2xl rounded-br-sm bg-brand-600 px-3 py-2 text-sm text-white">
              {turn.query}
            </div>
            <p className="text-sm text-slate-500">{turn.summary}</p>
            <div className="flex flex-col gap-2">
              {turn.results.length === 0 && (
                <p className="text-sm text-slate-400">No matches -- try different words.</p>
              )}
              {turn.results.map((r) => (
                <ProfileResultCard
                  key={r.id}
                  id={r.id}
                  displayName={r.display_name}
                  batch={r.batch}
                  branch={r.branch}
                  bio={r.bio}
                  interests={r.profile_interests
                    .map((pi) => pi.interests?.name)
                    .filter((n): n is string => Boolean(n))}
                />
              ))}
            </div>
          </div>
        ))}
        {pending && <p className="text-sm text-slate-400">Searching...</p>}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-slate-200 p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe who you're looking for..."
          className="flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Ask
        </button>
      </form>
    </div>
  );
}
