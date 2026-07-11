"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

async function logAction(action: string, targetId: string, note?: string) {
  const supabase = createAdminClient();
  await supabase.from("admin_actions").insert({ action, target_type: "profile", target_id: targetId, note });
}

export async function verifyUserManually(userId: string) {
  const supabase = createAdminClient();
  await supabase.from("profiles").update({ is_verified: true }).eq("id", userId);
  await logAction("verify_account", userId, "Manually verified by admin");
  revalidatePath("/users");
}

export async function deleteUser(userId: string) {
  const supabase = createAdminClient();
  await supabase.from("profiles").update({ deleted_at: new Date().toISOString() }).eq("id", userId);
  await supabase.auth.admin.deleteUser(userId);
  await logAction("delete_account", userId, "Deleted by admin");
  revalidatePath("/users");
}

export async function bulkDeleteUnverified(userIds: string[]) {
  const supabase = createAdminClient();
  for (const userId of userIds) {
    await supabase.from("profiles").update({ deleted_at: new Date().toISOString() }).eq("id", userId);
    await supabase.auth.admin.deleteUser(userId);
    await logAction("delete_account", userId, "Bulk cleanup: unverified past deadline");
  }
  revalidatePath("/users");
}
