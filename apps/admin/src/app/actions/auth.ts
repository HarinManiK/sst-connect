"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // "/" 404s for anyone without an admin session, which is what a
  // just-logged-out admin now is. Re-entry is via the secret path.
  redirect("/");
}
