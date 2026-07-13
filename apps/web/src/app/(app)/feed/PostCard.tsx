"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import Link from "next/link";
import { toggleLike } from "@/app/actions/posts";
import { reportContent } from "@/app/actions/reports";
import { Avatar } from "@/components/Avatar";
import { HeartIcon, CommentIcon, FlagIcon } from "@/components/Icons";

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
  createdAt,
  likeCount,
  commentCount,
  liked,
  disableCommentLink = false,
}: {
  postId: string;
  authorName: string;
  authorAvatar: string | null;
  content: string | null;
  imageUrl: string | null;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  disableCommentLink?: boolean;
}) {
  const [like, setLike] = useState({ liked, count: likeCount });
  const [busy, setBusy] = useState(false);

  async function onLike() {
    if (busy) return;
    setBusy(true);
    const prev = like;
    const next = { liked: !like.liked, count: like.count + (like.liked ? -1 : 1) };
    setLike(next);
    try {
      await toggleLike(postId, prev.liked);
    } catch {
      setLike(prev);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="card mx-4 mt-3 overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <Avatar name={authorName} src={authorAvatar} size={38} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">{authorName}</p>
          <p className="text-xs text-slate-400">{timeAgo(createdAt)}</p>
        </div>
      </div>

      {content && (
        <p className="whitespace-pre-wrap px-3 pb-2 text-[15px] leading-relaxed text-slate-700">
          {content}
        </p>
      )}
      {imageUrl && <img src={imageUrl} alt="" className="max-h-[28rem] w-full object-cover" />}

      <div className="flex items-center gap-1 px-2 py-1.5">
        <button
          onClick={onLike}
          className="tap flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500"
        >
          <HeartIcon
            filled={like.liked}
            className={`text-lg ${like.liked ? "text-rose-500" : ""}`}
          />
          {like.count > 0 && <span className={like.liked ? "text-rose-500" : ""}>{like.count}</span>}
        </button>

        {disableCommentLink ? (
          <span className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500">
            <CommentIcon className="text-lg" />
            {commentCount > 0 && <span>{commentCount}</span>}
          </span>
        ) : (
          <Link
            href={`/feed/${postId}`}
            className="tap flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500"
          >
            <CommentIcon className="text-lg" />
            {commentCount > 0 ? <span>{commentCount}</span> : <span>Comment</span>}
          </Link>
        )}

        <button
          onClick={() => {
            const reason = window.prompt("Why are you reporting this post?");
            if (reason && reason.trim()) reportContent("post", postId, reason.trim());
          }}
          className="tap ml-auto flex items-center rounded-lg px-2.5 py-1.5 text-slate-300 hover:text-rose-500"
        >
          <FlagIcon className="text-base" />
        </button>
      </div>
    </article>
  );
}
