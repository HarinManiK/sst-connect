"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { categorizePost } from "@/lib/ai/categorize";

export async function createPost(content: string, imageUrl: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const trimmed = content.trim();
  if (!trimmed && !imageUrl) throw new Error("Post can't be empty");

  const { data: post, error } = await supabase
    .from("posts")
    .insert({ author_id: user.id, content: trimmed || null, image_url: imageUrl })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  // Runs after the response is sent, so posting stays instant; the post
  // just appears in "general" until the categorization lands.
  after(() => categorizePost(post.id));

  revalidatePath("/feed");
}

export async function toggleLike(postId: string, currentlyLiked: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  if (currentlyLiked) {
    await supabase.from("post_likes").delete().eq("post_id", postId).eq("profile_id", user.id);
  } else {
    await supabase.from("post_likes").insert({ post_id: postId, profile_id: user.id });
  }

  revalidatePath("/feed");
}
