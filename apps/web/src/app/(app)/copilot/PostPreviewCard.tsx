/* eslint-disable @next/next/no-img-element */
import { Avatar } from "@/components/Avatar";
import { HeartIcon, CommentIcon } from "@/components/Icons";

export type PostCardData = {
  id: string;
  author_name: string;
  author_avatar: string | null;
  content: string | null;
  image_url: string | null;
  category: string;
  likes: number;
  comments: number;
  created_at: string;
};

const CATEGORY_STYLES: Record<string, string> = {
  hot: "bg-rose-50 text-rose-600",
  tech: "bg-brand-50 text-brand-600",
  culture: "bg-violet-50 text-violet-600",
  general: "bg-slate-100 text-slate-500",
};

export function PostPreviewCard({ post }: { post: PostCardData }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2.5 p-3">
        <Avatar name={post.author_name} src={post.author_avatar} size={32} />
        <p className="flex-1 truncate text-sm font-semibold text-slate-800">{post.author_name}</p>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
            CATEGORY_STYLES[post.category] ?? CATEGORY_STYLES.general
          }`}
        >
          {post.category}
        </span>
      </div>
      {post.content && (
        <p className="line-clamp-4 whitespace-pre-wrap px-3 pb-2 text-sm text-slate-700">
          {post.content}
        </p>
      )}
      {post.image_url && <img src={post.image_url} alt="" className="max-h-56 w-full object-cover" />}
      <div className="flex items-center gap-4 px-3 py-2 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <HeartIcon className="text-sm" /> {post.likes}
        </span>
        <span className="flex items-center gap-1">
          <CommentIcon className="text-sm" /> {post.comments}
        </span>
      </div>
    </div>
  );
}
