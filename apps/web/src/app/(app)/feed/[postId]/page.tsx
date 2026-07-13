import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BackIcon } from "@/components/Icons";
import { PostCard } from "../PostCard";
import { CommentSection, type CommentItem } from "./CommentSection";

type PostRow = {
  id: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
  author: { display_name: string; avatar_url: string | null } | null;
  post_likes: { count: number }[];
  post_comments: { count: number }[];
};

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: post } = await supabase
    .from("posts")
    .select(
      "id, content, image_url, created_at, author:profiles!posts_author_id_fkey(display_name, avatar_url), post_likes(count), post_comments(count)"
    )
    .eq("id", postId)
    .is("deleted_at", null)
    .maybeSingle<PostRow>();

  if (!post) notFound();

  const [{ data: myLike }, { data: comments }, { data: me }] = await Promise.all([
    supabase
      .from("post_likes")
      .select("post_id")
      .eq("post_id", postId)
      .eq("profile_id", user.id)
      .maybeSingle(),
    supabase
      .from("post_comments")
      .select("id, content, created_at, author:profiles!post_comments_author_id_fkey(display_name, avatar_url)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .returns<
        { id: string; content: string; created_at: string; author: { display_name: string; avatar_url: string | null } | null }[]
      >(),
    supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).single(),
  ]);

  const initialComments: CommentItem[] = (comments ?? []).map((c) => ({
    id: c.id,
    author_name: c.author?.display_name ?? "Unknown",
    author_avatar: c.author?.avatar_url ?? null,
    content: c.content,
    created_at: c.created_at,
  }));

  return (
    <div>
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-surface/85 px-3 py-3 backdrop-blur-lg">
        <Link href="/feed" className="tap flex h-9 w-9 items-center justify-center rounded-full text-slate-600">
          <BackIcon className="text-xl" />
        </Link>
        <h1 className="text-lg font-bold tracking-tight">Post</h1>
      </header>

      <PostCard
        postId={post.id}
        authorName={post.author?.display_name ?? "Unknown"}
        authorAvatar={post.author?.avatar_url ?? null}
        content={post.content}
        imageUrl={post.image_url}
        createdAt={post.created_at}
        likeCount={post.post_likes?.[0]?.count ?? 0}
        commentCount={post.post_comments?.[0]?.count ?? 0}
        liked={Boolean(myLike)}
        disableCommentLink
      />

      <CommentSection
        postId={postId}
        initialComments={initialComments}
        me={{ name: me?.display_name ?? "You", avatar: me?.avatar_url ?? null }}
      />
    </div>
  );
}
