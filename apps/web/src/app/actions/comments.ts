"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type NewComment = {
  id: string;
  author_name: string;
  author_avatar: string | null;
  content: string;
  created_at: string;
};

export async function addComment(
  postId: string,
  content: string
): Promise<{ ok: boolean; comment?: NewComment; error?: string }> {
  const trimmed = content.trim();
  if (!trimmed) return { ok: false, error: "Empty comment." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { data: inserted, error } = await supabase
    .from("post_comments")
    .insert({ post_id: postId, author_id: user.id, content: trimmed })
    .select("id, created_at")
    .single();
  if (error) return { ok: false, error: error.message };

  const { data: me } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single();

  revalidatePath(`/feed/${postId}`);
  revalidatePath("/feed");

  return {
    ok: true,
    comment: {
      id: inserted.id,
      author_name: me?.display_name ?? "You",
      author_avatar: me?.avatar_url ?? null,
      content: trimmed,
      created_at: inserted.created_at,
    },
  };
}
