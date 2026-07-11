import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// The admin's front door. Visiting /<ADMIN_ENTRY_SECRET> kicks off Google
// sign-in; any other path lands here (static routes like /users win first)
// and 404s, so probing the app reveals nothing.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ entry: string }> }
) {
  const { entry } = await params;
  const secret = process.env.ADMIN_ENTRY_SECRET;

  if (!secret || entry !== secret) {
    return new NextResponse(null, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });

  if (error || !data.url) {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.redirect(data.url);
}
