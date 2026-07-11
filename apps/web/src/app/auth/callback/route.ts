import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase redirects here after Google sign-in and after a confirmed
// email-change link (the "link your Scaler email" flow). Exchanges the
// auth code for a session, then forwards to `next` (default: the feed).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const rawNext = searchParams.get("next");
  // only allow same-app paths -- never redirect off-site
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/feed";

  return NextResponse.redirect(`${origin}${next}`);
}
