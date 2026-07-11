import { createClient } from "@/lib/supabase/server";
import { CategoryTabs } from "./CategoryTabs";
import { PostComposer } from "./PostComposer";
import { PostCard } from "./PostCard";

type PostRow = {
  id: string;
  content: string | null;
  image_url: string | null;
  category: string;
  created_at: string;
  author: { display_name: string } | null;
  post_likes: { count: number }[];
  post_comments: { count: number }[];
};

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const activeCategory = category ?? "all";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let query = supabase
    .from("posts")
    .select(
      "id, content, image_url, category, created_at, author:profiles!posts_author_id_fkey(display_name), post_likes(count), post_comments(count)"
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (activeCategory !== "all") {
    query = query.eq("category", activeCategory);
  }

  const { data: posts } = await query.returns<PostRow[]>();

  const { data: myLikes } = await supabase
    .from("post_likes")
    .select("post_id")
    .eq("profile_id", user.id);
  const likedPostIds = new Set((myLikes ?? []).map((l) => l.post_id));

  return (
    <div className="pb-4">
      <CategoryTabs active={activeCategory} />
      <PostComposer />

      <div className="mt-1">
        {(!posts || posts.length === 0) && (
          <p className="mx-4 mt-6 text-sm text-slate-400">
            Nothing here yet -- be the first to post.
          </p>
        )}
        {posts?.map((post) => (
          <PostCard
            key={post.id}
            postId={post.id}
            authorName={post.author?.display_name ?? "Unknown"}
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
    </div>
  );
}
