import { createClient } from "@/lib/supabase/server";
import { AppBar, Wordmark } from "@/components/AppBar";
import { EmptyState } from "@/components/EmptyState";
import { HomeIcon } from "@/components/Icons";
import { CategoryTabs } from "./CategoryTabs";
import { PostComposer } from "./PostComposer";
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

  const { data: me } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single();

  let query = supabase
    .from("posts")
    .select(
      "id, content, image_url, category, created_at, author:profiles!posts_author_id_fkey(display_name, avatar_url), post_likes(count), post_comments(count)"
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
    <div>
      <AppBar title={<Wordmark />} />
      <CategoryTabs active={activeCategory} />
      <PostComposer
        authorName={me?.display_name ?? "You"}
        authorAvatar={me?.avatar_url ?? null}
      />

      <div className="pb-4">
        {(!posts || posts.length === 0) && (
          <EmptyState
            icon={<HomeIcon />}
            title="Nothing here yet"
            subtitle="Be the first to post something to your batch."
          />
        )}
        {posts?.map((post) => (
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
    </div>
  );
}
