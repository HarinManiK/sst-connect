"use client";

import { useState } from "react";
import { SparkleIcon, SendIcon } from "@/components/Icons";
import { PersonCard, type PersonCardData } from "./PersonCard";
import { PostPreviewCard, type PostCardData } from "./PostPreviewCard";

type Turn = {
  query: string;
  text: string;
  people: PersonCardData[];
  posts: PostCardData[];
};

const EXAMPLES = [
  "how many people are on here?",
  "what's happening on campus?",
  "find someone into music & coding",
  "who am I most compatible with?",
  "what are the most popular interests?",
];

export function CopilotChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);

  async function runQuery(query: string) {
    if (!query || pending) return;
    setInput("");
    setPending(true);

    // Send trimmed conversation history so follow-ups ("the second one") work.
    const history = [
      ...turns.flatMap((t) => [
        { role: "user" as const, content: t.query },
        { role: "assistant" as const, content: t.text },
      ]),
      { role: "user" as const, content: query },
    ];

    try {
      const res = await fetch("/api/ai/copilot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ history }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTurns((prev) => [
          ...prev,
          { query, text: data.error ?? "Something went wrong.", people: [], posts: [] },
        ]);
        return;
      }
      setTurns((prev) => [
        ...prev,
        { query, text: data.text ?? "", people: data.people ?? [], posts: data.posts ?? [] },
      ]);
    } catch {
      setTurns((prev) => [
        ...prev,
        { query, text: "Couldn't reach Copilot. Check your connection.", people: [], posts: [] },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-surface/85 px-4 py-3 backdrop-blur-lg">
        <SparkleIcon className="text-xl text-brand-600" />
        <div className="text-lg font-bold tracking-tight">Copilot</div>
      </header>

      <div className="flex-1 px-4 pb-40 pt-4">
        {turns.length === 0 && (
          <div className="flex flex-col items-center pt-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-3xl text-brand-500">
              <SparkleIcon />
            </div>
            <p className="mt-4 font-semibold text-slate-700">Ask me anything</p>
            <p className="mt-1 max-w-xs text-sm text-slate-400">
              Ask me anything about the people, posts, and trends on SST Connect — I know
              the whole app.
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
              {turn.text && (
                <div className="flex items-start gap-2">
                  <SparkleIcon className="mt-0.5 shrink-0 text-base text-brand-500" />
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                    {turn.text}
                  </p>
                </div>
              )}
              {turn.people.map((p) => (
                <PersonCard key={p.id} person={p} />
              ))}
              {turn.posts.map((p) => (
                <PostPreviewCard key={p.id} post={p} />
              ))}
            </div>
          ))}
          {pending && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <SparkleIcon className="animate-pulse text-brand-400" />
              Thinking...
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
            placeholder="Ask Copilot anything..."
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
