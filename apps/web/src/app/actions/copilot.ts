"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { categorizePost } from "@/lib/ai/categorize";

// These run ONLY when the user taps "Confirm" on a Copilot-proposed action.
// Each acts strictly as the signed-in user, so RLS guarantees they can't
// touch anyone else's data.

export type CopilotActionResult = { ok: boolean; error?: string };

export async function confirmCreatePost(content: string): Promise<CopilotActionResult> {
  const trimmed = content.trim();
  if (!trimmed) return { ok: false, error: "Empty post." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { data: post, error } = await supabase
    .from("posts")
    .insert({ author_id: user.id, content: trimmed })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  after(() => categorizePost(post.id));
  revalidatePath("/feed");
  return { ok: true };
}

export async function confirmSendRequest(personId: string): Promise<CopilotActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };
  if (personId === user.id) return { ok: false, error: "Can't add yourself." };

  const { error } = await supabase
    .from("friendships")
    .insert({ requester_id: user.id, addressee_id: personId, status: "pending" });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/requests");
  return { ok: true };
}

export async function confirmUpdateProfile(fields: {
  bio?: string;
  intent?: string;
  add_interests?: string[];
}): Promise<CopilotActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const patch: Record<string, unknown> = {};
  if (typeof fields.bio === "string") patch.bio = fields.bio.trim();
  if (fields.intent && ["friends", "dating", "either"].includes(fields.intent)) {
    patch.intent = fields.intent;
  }
  if (Object.keys(patch).length) {
    const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
    if (error) return { ok: false, error: error.message };
  }

  if (fields.add_interests?.length) {
    const { data: interests } = await supabase.from("interests").select("id, name");
    const wanted = fields.add_interests.map((s) => s.toLowerCase());
    const ids = (interests ?? [])
      .filter((i) =>
        wanted.some((w) => i.name.toLowerCase() === w || i.name.toLowerCase().includes(w))
      )
      .map((i) => i.id);
    if (ids.length) {
      await supabase
        .from("profile_interests")
        .upsert(
          ids.map((interest_id) => ({ profile_id: user.id, interest_id })),
          { onConflict: "profile_id,interest_id", ignoreDuplicates: true }
        );
    }
  }

  revalidatePath("/profile");
  return { ok: true };
}
