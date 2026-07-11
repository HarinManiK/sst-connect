"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Always targets the one fixed admin address -- there's no email input
// anywhere in the UI, so there's nothing for a visitor to fill in or probe.
export async function requestAccess() {
  const supabase = await createClient();
  const email = process.env.ADMIN_EMAIL;
  if (!email) return;

  await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${process.env.ADMIN_SITE_URL}/auth/callback` },
  });
  // Errors (rate limits, misconfiguration) are intentionally swallowed --
  // the page never reveals whether anything happened.
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
