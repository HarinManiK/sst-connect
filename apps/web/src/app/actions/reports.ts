"use server";

import { createClient } from "@/lib/supabase/server";

export async function reportContent(
  targetType: "post" | "profile" | "message" | "comment",
  targetId: string,
  reason: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("reports")
    .insert({ reporter_id: user.id, target_type: targetType, target_id: targetId, reason });

  if (error) throw new Error(error.message);
}
