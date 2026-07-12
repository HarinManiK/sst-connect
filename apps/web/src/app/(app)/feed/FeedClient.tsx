"use client";

import { useState } from "react";
import { AppBar, Wordmark } from "@/components/AppBar";
import { EmptyState } from "@/components/EmptyState";
import { HomeIcon } from "@/components/Icons";
import { PostComposer } from "./PostComposer";
import { PostCard } from "./PostCard";

export type FeedItem = {
  id: string;
  authorName: string;
  authorAvatar: string | null;
  content: string | null;
  imageUrl: string | null;
  category: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  liked: boolean;
};

const CATEGORIES = [
  { value: "all", label: "For You" },
  { value: "hot", label: "🔥 Hot" },
  { value: "tech", label: "💻 Tech" },
  { value: "culture", label: "🎭 Culture" },
] as const;

// Posts arrive once from the server; switching categories filters them in
// memory, so tab changes are instant (no navigation, no server round-trip).
export function FeedClient({
  me,
  posts,
}: {
  me: { name: string; avatar: string | null };
  posts: FeedItem[];
}) {
  const [active, setActive] = useState<string>("all");
  const shown = active === "all" ? posts : posts.filter((p) => p.category === active);

  return (
    <div>
      <AppBar title={<Wordmark />} />

      <div className="sticky top-[57px] z-10 border-b border-border bg-background/85 backdrop-blur-lg">
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-2.5">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setActive(c.value)}
              className={`tap whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium ${
                active === c.value
                  ? "bg-brand-600 text-white shadow-sm"
                  : "border border-border bg-surface text-slate-600"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <PostComposer authorName={me.name} authorAvatar={me.avatar} />

      <div className="pb-4">
        {shown.length === 0 ? (
          <EmptyState
            icon={<HomeIcon />}
            title={active === "all" ? "Nothing here yet" : "Nothing in this category yet"}
            subtitle={
              active === "all"
                ? "Be the first to post something to your batch."
                : "Try another tab, or post something."
            }
          />
        ) : (
          shown.map((post) => (
            <PostCard
              key={post.id}
              postId={post.id}
              authorName={post.authorName}
              authorAvatar={post.authorAvatar}
              content={post.content}
              imageUrl={post.imageUrl}
              category={post.category}
              createdAt={post.createdAt}
              likeCount={post.likeCount}
              commentCount={post.commentCount}
              liked={post.liked}
            />
          ))
        )}
      </div>
    </div>
  );
}
