"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { PROGRAMS, HOSTELS } from "@/lib/profile-options";

export type ProfileFormState = { error?: string; success?: string } | undefined;

export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const displayName = String(formData.get("displayName") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const program = String(formData.get("program") ?? "").trim();
  const hostel = String(formData.get("hostel") ?? "").trim();

  if (!displayName) return { error: "Name can't be empty." };

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      bio: bio || null,
      branch: PROGRAMS.includes(program as (typeof PROGRAMS)[number]) ? program : null,
      hostel_block: HOSTELS.includes(hostel as (typeof HOSTELS)[number]) ? hostel : null,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { success: "Profile updated." };
}

export async function linkCollegeEmail(
  _prev: ProfileFormState,
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

// Single-row toggle -- reliable one-tap select/deselect, no full rewrite of
// the interest set (which caused the flaky deselect).
export async function setInterest(interestId: string, on: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  if (on) {
    await supabase
      .from("profile_interests")
      .upsert(
        { profile_id: user.id, interest_id: interestId },
        { onConflict: "profile_id,interest_id", ignoreDuplicates: true }
      );
  } else {
    await supabase
      .from("profile_interests")
      .delete()
      .eq("profile_id", user.id)
      .eq("interest_id", interestId);
  }

  revalidatePath("/profile");
}
