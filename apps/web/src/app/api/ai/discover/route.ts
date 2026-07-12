import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runDiscoveryAgent } from "@/lib/ai/agent";

export async function POST(request: Request) {
  const { query } = await request.json();
  if (!query || typeof query !== "string") {
    return NextResponse.json({ error: "query required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  try {
    const { text, profiles } = await runDiscoveryAgent(supabase, user.id, query);
    return NextResponse.json({ text, results: profiles });
  } catch {
    return NextResponse.json(
      { error: "AI is busy right now, try again in a moment." },
      { status: 503 }
    );
  }
}
