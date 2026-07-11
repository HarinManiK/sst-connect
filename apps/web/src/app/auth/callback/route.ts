import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase redirects here after a user confirms an email-change link (e.g.
// linking their Scaler email from the profile page). Exchanges the auth
// code for a session, which is what actually applies the new email --
// the `sync_profile_from_auth_user` trigger then parses batch/year from it.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/profile`);
}
