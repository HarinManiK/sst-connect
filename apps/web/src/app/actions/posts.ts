"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createPost(content: string, imageUrl: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const trimmed = content.trim();
  if (!trimmed && !imageUrl) throw new Error("Post can't be empty");

  const { error } = await supabase
    .from("posts")
    .insert({ author_id: user.id, content: trimmed || null, image_url: imageUrl });

  if (error) throw new Error(error.message);
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
  revalidatePath(`/feed/${postId}`);
}
