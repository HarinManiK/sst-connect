import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runCopilot } from "@/lib/ai/copilot";

type Msg = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  const body = await request.json();
  const history: Msg[] = Array.isArray(body.history) ? body.history : [];

  const cleaned = history
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

  if (cleaned.length === 0 || cleaned[cleaned.length - 1].role !== "user") {
    return NextResponse.json({ error: "a user message is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  try {
    const result = await runCopilot(supabase, user.id, cleaned);
    return NextResponse.json(result);
  } catch (e) {
    // Surfaces the real cause in the Vercel function logs for this project.
    console.error("[copilot] failed:", e);
    const status = (e as { status?: number })?.status;
    const rateLimited = status === 429;
    return NextResponse.json(
      {
        error: rateLimited
          ? "Copilot's hit its rate limit for the moment — wait a few seconds and try again."
          : "Copilot ran into a problem. Try again in a moment.",
      },
      { status: rateLimited ? 429 : 503 }
    );
  }
}
