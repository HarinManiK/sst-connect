import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { AppBar, Wordmark } from "@/components/AppBar";
import { CategoryTabs } from "./CategoryTabs";
import { PostComposer } from "./PostComposer";
import { FeedPosts } from "./FeedPosts";
import { FeedSkeleton } from "./FeedSkeleton";

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

  return (
    <div>
      <AppBar title={<Wordmark />} />
      <CategoryTabs active={activeCategory} />
      <PostComposer
        authorName={me?.display_name ?? "You"}
        authorAvatar={me?.avatar_url ?? null}
      />

      {/* key changes with the category, so the boundary re-suspends and
          shows the skeleton on every tab switch (not just page loads). */}
      <Suspense key={activeCategory} fallback={<FeedSkeleton />}>
        <FeedPosts category={activeCategory} />
      </Suspense>
    </div>
  );
}
