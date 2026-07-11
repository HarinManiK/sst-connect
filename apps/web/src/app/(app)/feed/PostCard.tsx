"use client";

import { useOptimistic, useTransition } from "react";
import { toggleLike } from "@/app/actions/posts";
import { reportContent } from "@/app/actions/reports";

export function PostCard({
  postId,
  authorName,
  content,
  imageUrl,
  category,
  createdAt,
  likeCount,
  commentCount,
  liked,
}: {
  postId: string;
  authorName: string;
  content: string | null;
  imageUrl: string | null;
  category: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  liked: boolean;
}) {
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(
    { liked, likeCount },
    (_state, next: { liked: boolean; likeCount: number }) => next
  );

  function handleToggle() {
    const next = { liked: !optimistic.liked, likeCount: optimistic.likeCount + (optimistic.liked ? -1 : 1) };
    startTransition(async () => {
      setOptimistic(next);
      await toggleLike(postId, optimistic.liked);
    });
  }

  return (
    <article className="mx-4 mt-3 rounded-xl border border-slate-200 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-semibold">
            {authorName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">{authorName}</p>
            <p className="text-xs text-slate-400">{new Date(createdAt).toLocaleString()}</p>
          </div>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-500">
          {category}
        </span>
      </div>

      {content && <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{content}</p>}
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="mt-2 max-h-96 w-full rounded-lg object-cover" />
      )}

      <div className="mt-2 flex items-center gap-4 text-sm text-slate-500">
        <button
          onClick={handleToggle}
          className={optimistic.liked ? "font-medium text-brand-600" : ""}
        >
          {optimistic.liked ? "Liked" : "Like"} · {optimistic.likeCount}
        </button>
        <span>{commentCount} comments</span>
        <button
          onClick={() => {
            const reason = window.prompt("Why are you reporting this post?");
            if (reason && reason.trim()) {
              startTransition(() => reportContent("post", postId, reason.trim()));
            }
          }}
          className="ml-auto text-slate-300 hover:text-red-500"
        >
          Report
        </button>
      </div>
    </article>
  );
}
