"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

async function logAction(action: string, targetType: string, targetId: string, note?: string) {
  const supabase = createAdminClient();
  await supabase.from("admin_actions").insert({ action, target_type: targetType, target_id: targetId, note });
}

export async function dismissReport(reportId: string) {
  const supabase = createAdminClient();
  await supabase
    .from("reports")
    .update({ status: "dismissed", reviewed_at: new Date().toISOString() })
    .eq("id", reportId);
  await logAction("dismiss_report", "report", reportId);
  revalidatePath("/reports");
}

export async function removeReportedPost(reportId: string, postId: string) {
  const supabase = createAdminClient();
  await supabase.from("posts").update({ deleted_at: new Date().toISOString() }).eq("id", postId);
  await supabase
    .from("reports")
    .update({ status: "actioned", reviewed_at: new Date().toISOString() })
    .eq("id", reportId);
  await logAction("remove_post", "post", postId, `via report ${reportId}`);
  revalidatePath("/reports");
}

export async function banReportedUser(reportId: string, profileId: string) {
  const supabase = createAdminClient();
  await supabase
    .from("profiles")
    .update({ deleted_at: new Date().toISOString(), discoverable: false })
    .eq("id", profileId);
  await supabase
    .from("reports")
    .update({ status: "actioned", reviewed_at: new Date().toISOString() })
    .eq("id", reportId);
  await logAction("ban_user", "profile", profileId, `via report ${reportId}`);
  revalidatePath("/reports");
}
