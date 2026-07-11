import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin-email";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return new NextResponse(null, { status: 404 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return new NextResponse(null, { status: 404 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Someone who found the entry path but signed in with the wrong Google
  // account: drop the session immediately and show them the same nothing
  // everyone else sees.
  if (!user || !isAdminEmail(user.email)) {
    await supabase.auth.signOut();
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.redirect(`${origin}/users`);
}
