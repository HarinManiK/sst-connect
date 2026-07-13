import { createClient } from "@/lib/supabase/server";
import { FeedClient, type FeedItem } from "./FeedClient";

type PostRow = {
  id: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
  author: { display_name: string; avatar_url: string | null } | null;
  post_likes: { count: number }[];
  post_comments: { count: number }[];
};

export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [meRes, postsRes, likesRes] = await Promise.all([
    supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).single(),
    supabase
      .from("posts")
      .select(
        "id, content, image_url, created_at, author:profiles!posts_author_id_fkey(display_name, avatar_url), post_likes(count), post_comments(count)"
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<PostRow[]>(),
    supabase.from("post_likes").select("post_id").eq("profile_id", user.id),
  ]);

  const likedIds = new Set((likesRes.data ?? []).map((l) => l.post_id));

  const posts: FeedItem[] = (postsRes.data ?? []).map((p) => ({
    id: p.id,
    authorName: p.author?.display_name ?? "Unknown",
    authorAvatar: p.author?.avatar_url ?? null,
    content: p.content,
    imageUrl: p.image_url,
    createdAt: p.created_at,
    likeCount: p.post_likes?.[0]?.count ?? 0,
    commentCount: p.post_comments?.[0]?.count ?? 0,
    liked: likedIds.has(p.id),
  }));

  return (
    <FeedClient
      me={{ name: meRes.data?.display_name ?? "You", avatar: meRes.data?.avatar_url ?? null }}
      posts={posts}
    />
  );
}
