"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setAvatar(url: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/profile");
  return { ok: true };
}

// Reverts to the Google photo the account came in with (from auth metadata),
// or a blank initial if there wasn't one.
export async function resetAvatar(): Promise<{ ok: boolean; url: string | null; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, url: null, error: "Not authenticated." };

  const meta = user.user_metadata as { avatar_url?: string; picture?: string } | null;
  const google = meta?.avatar_url ?? meta?.picture ?? null;

  const { error } = await supabase.from("profiles").update({ avatar_url: google }).eq("id", user.id);
  if (error) return { ok: false, url: null, error: error.message };

  revalidatePath("/profile");
  return { ok: true, url: google };
}
