"use client";

/* eslint-disable @next/next/no-img-element */
import { useOptimistic, useTransition } from "react";
import { toggleLike } from "@/app/actions/posts";
import { reportContent } from "@/app/actions/reports";
import { Avatar } from "@/components/Avatar";
import { HeartIcon, CommentIcon, FlagIcon } from "@/components/Icons";

const CATEGORY_STYLES: Record<string, string> = {
  hot: "bg-rose-50 text-rose-600",
  tech: "bg-brand-50 text-brand-600",
  culture: "bg-violet-50 text-violet-600",
  general: "bg-slate-100 text-slate-500",
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString();
}

export function PostCard({
  postId,
  authorName,
  authorAvatar,
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
  authorAvatar: string | null;
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
    (_s, next: { liked: boolean; likeCount: number }) => next
  );

  function handleToggle() {
    const next = {
      liked: !optimistic.liked,
      likeCount: optimistic.likeCount + (optimistic.liked ? -1 : 1),
    };
    startTransition(async () => {
      setOptimistic(next);
      await toggleLike(postId, optimistic.liked);
    });
  }

  return (
    <article className="card mx-4 mt-3 overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <Avatar name={authorName} src={authorAvatar} size={38} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">{authorName}</p>
          <p className="text-xs text-slate-400">{timeAgo(createdAt)}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${
            CATEGORY_STYLES[category] ?? CATEGORY_STYLES.general
          }`}
        >
          {category}
        </span>
      </div>

      {content && (
        <p className="whitespace-pre-wrap px-3 pb-2 text-[15px] leading-relaxed text-slate-700">
          {content}
        </p>
      )}
      {imageUrl && <img src={imageUrl} alt="" className="max-h-[28rem] w-full object-cover" />}

      <div className="flex items-center gap-1 px-2 py-1.5">
        <button
          onClick={handleToggle}
          className="tap flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500"
        >
          <HeartIcon
            filled={optimistic.liked}
            className={`text-lg ${optimistic.liked ? "animate-pop text-rose-500" : ""}`}
          />
          {optimistic.likeCount > 0 && (
            <span className={optimistic.liked ? "text-rose-500" : ""}>{optimistic.likeCount}</span>
          )}
        </button>
        <button className="tap flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500">
          <CommentIcon className="text-lg" />
          {commentCount > 0 && <span>{commentCount}</span>}
        </button>
        <button
          onClick={() => {
            const reason = window.prompt("Why are you reporting this post?");
            if (reason && reason.trim()) {
              startTransition(() => reportContent("post", postId, reason.trim()));
            }
          }}
          className="tap ml-auto flex items-center rounded-lg px-2.5 py-1.5 text-slate-300 hover:text-rose-500"
        >
          <FlagIcon className="text-base" />
        </button>
      </div>
    </article>
  );
}
