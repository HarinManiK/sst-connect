import type { SupabaseClient } from "@supabase/supabase-js";

// Returns the current user's id WITHOUT a network round-trip when possible:
// getClaims() verifies the JWT locally. Falls back to getUser() if that's
// unavailable. Security still rests on RLS, so a spoofed id can't do
// anything -- this is just for identifying the caller cheaply. The proxy
// (middleware) still runs getUser() to keep the session refreshed.
export async function getUserId(supabase: SupabaseClient): Promise<string | undefined> {
  try {
    const { data } = await supabase.auth.getClaims();
    const sub = (data as { claims?: { sub?: string } } | null)?.claims?.sub;
    if (typeof sub === "string" && sub) return sub;
  } catch {
    // fall through
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id;
}
