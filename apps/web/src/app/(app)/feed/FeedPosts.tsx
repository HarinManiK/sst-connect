import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/EmptyState";
import { HomeIcon } from "@/components/Icons";
import { PostCard } from "./PostCard";

type PostRow = {
  id: string;
  content: string | null;
  image_url: string | null;
  category: string;
  created_at: string;
  author: { display_name: string; avatar_url: string | null } | null;
  post_likes: { count: number }[];
  post_comments: { count: number }[];
};

// Async server component isolated so a Suspense boundary keyed by category
// can show a skeleton while it re-fetches on tab switches.
export async function FeedPosts({ category }: { category: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let query = supabase
    .from("posts")
    .select(
      "id, content, image_url, category, created_at, author:profiles!posts_author_id_fkey(display_name, avatar_url), post_likes(count), post_comments(count)"
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (category !== "all") query = query.eq("category", category);

  const { data: posts } = await query.returns<PostRow[]>();

  const { data: myLikes } = await supabase
    .from("post_likes")
    .select("post_id")
    .eq("profile_id", user.id);
  const likedPostIds = new Set((myLikes ?? []).map((l) => l.post_id));

  if (!posts || posts.length === 0) {
    return (
      <EmptyState
        icon={<HomeIcon />}
        title="Nothing here yet"
        subtitle={
          category === "all"
            ? "Be the first to post something to your batch."
            : "No posts in this category yet."
        }
      />
    );
  }

  return (
    <div className="pb-4">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          postId={post.id}
          authorName={post.author?.display_name ?? "Unknown"}
          authorAvatar={post.author?.avatar_url ?? null}
          content={post.content}
          imageUrl={post.image_url}
          category={post.category}
          createdAt={post.created_at}
          likeCount={post.post_likes?.[0]?.count ?? 0}
          commentCount={post.post_comments?.[0]?.count ?? 0}
          liked={likedPostIds.has(post.id)}
        />
      ))}
    </div>
  );
}
