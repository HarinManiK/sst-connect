"use server";

import { createClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/supabase/auth";

export async function addComment(
  postId: string,
  content: string
): Promise<{ ok: boolean; id?: string; created_at?: string; error?: string }> {
  const trimmed = content.trim();
  if (!trimmed) return { ok: false, error: "Empty comment." };

  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) return { ok: false, error: "Not authenticated." };

  // Lean write: one insert, no extra profile lookup and no revalidatePath
  // (the client already knows who it is and appends the comment optimistically).
  const { data: inserted, error } = await supabase
    .from("post_comments")
    .insert({ post_id: postId, author_id: userId, content: trimmed })
    .select("id, created_at")
    .single();
  if (error) return { ok: false, error: error.message };

  return { ok: true, id: inserted.id, created_at: inserted.created_at };
}
