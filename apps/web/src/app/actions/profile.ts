"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type ProfileFormState = { error?: string; success?: string } | undefined;

export async function updateProfile(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const displayName = String(formData.get("displayName") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const branch = String(formData.get("branch") ?? "").trim();
  const hostelBlock = String(formData.get("hostelBlock") ?? "").trim();
  const intent = String(formData.get("intent") ?? "either");
  const batchRaw = String(formData.get("batch") ?? "").trim();

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName || undefined,
      bio: bio || null,
      branch: branch || null,
      hostel_block: hostelBlock || null,
      intent,
      // self-reported batch only applies while no college email has set it;
      // the parse_college_email trigger always takes precedence once linked.
      ...(batchRaw ? { batch: Number(batchRaw) } : {}),
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { success: "Profile updated." };
}

export async function linkCollegeEmail(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const email = String(formData.get("collegeEmail") ?? "").trim().toLowerCase();

  if (!/^[a-z]+\.\d{2}bcs\d+@sst\.scaler\.com$/.test(email)) {
    return { error: "That doesn't look like a valid @sst.scaler.com address." };
  }

  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: `${origin}/auth/callback?next=/profile` }
  );

  if (error) return { error: error.message };

  return { success: "Check your Scaler inbox for a confirmation link." };
}

export async function setInterests(interestIds: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await supabase.from("profile_interests").delete().eq("profile_id", user.id);

  if (interestIds.length > 0) {
    await supabase
      .from("profile_interests")
      .insert(interestIds.map((interest_id) => ({ profile_id: user.id, interest_id })));
  }

  revalidatePath("/profile");
}
