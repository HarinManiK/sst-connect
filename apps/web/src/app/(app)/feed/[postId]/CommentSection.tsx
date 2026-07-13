"use client";

import { useState } from "react";
import { addComment } from "@/app/actions/comments";
import { Avatar } from "@/components/Avatar";
import { SendIcon } from "@/components/Icons";

export type CommentItem = {
  id: string;
  author_name: string;
  author_avatar: string | null;
  content: string;
  created_at: string;
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return new Date(iso).toLocaleDateString();
}

export function CommentSection({
  postId,
  initialComments,
}: {
  postId: string;
  initialComments: CommentItem[];
}) {
  const [comments, setComments] = useState<CommentItem[]>(initialComments);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || busy) return;
    setBusy(true);
    setError(null);
    setText("");

    const res = await addComment(postId, content);
    if (res.ok && res.comment) {
      setComments((prev) => [...prev, res.comment!]);
    } else {
      setText(content);
      setError(res.error ?? "Couldn't post comment.");
    }
    setBusy(false);
  }

  return (
    <div className="mt-2">
      <h2 className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {comments.length} comment{comments.length === 1 ? "" : "s"}
      </h2>

      <div className="flex flex-col gap-3 px-4 pb-40">
        {comments.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">
            No comments yet — start the conversation.
          </p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="flex gap-2.5">
            <Avatar name={c.author_name} src={c.author_avatar} size={32} />
            <div className="min-w-0 flex-1">
              <div className="rounded-2xl rounded-tl-md bg-surface border border-border px-3 py-2">
                <p className="text-sm font-semibold text-slate-800">{c.author_name}</p>
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">{c.content}</p>
              </div>
              <p className="mt-1 px-1 text-[10px] text-slate-400">{timeAgo(c.created_at)}</p>
            </div>
          </div>
        ))}
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </div>

      <form
        onSubmit={submit}
        className="fixed inset-x-0 bottom-[68px] z-20 mx-auto flex max-w-md gap-2 px-4"
      >
        <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-surface px-2 py-1.5 shadow-pop">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment…"
            className="flex-1 bg-transparent px-3 py-1.5 text-sm focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !text.trim()}
            className="tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white disabled:opacity-40"
          >
            <SendIcon className="text-lg" />
          </button>
        </div>
      </form>
    </div>
  );
}
