import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

const CATEGORIES = ["hot", "tech", "culture", "general"] as const;

export async function POST(request: Request) {
  const { postId } = await request.json();
  if (!postId) {
    return NextResponse.json({ error: "postId required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: post } = await supabase
    .from("posts")
    .select("id, content")
    .eq("id", postId)
    .single();

  if (!post) {
    return NextResponse.json({ error: "post not found" }, { status: 404 });
  }

  // Nothing to classify (image-only post) -- leave it in "general".
  if (!post.content || !post.content.trim()) {
    return NextResponse.json({ category: "general" });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 100,
    tools: [
      {
        name: "categorize",
        description: "Classify a campus social post into one feed category.",
        input_schema: {
          type: "object",
          properties: {
            category: { type: "string", enum: CATEGORIES },
            confidence: { type: "number", description: "0 to 1" },
          },
          required: ["category", "confidence"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "categorize" },
    messages: [
      {
        role: "user",
        content: `Classify this college social-media post into exactly one category:
- "hot": urgent/high-engagement campus news (placements, announcements, deadlines)
- "tech": tech projects, hackathons, internships, coding
- "culture": events, fests, clubs, sports, social activities
- "general": anything else (default/fallback)

Post: """${post.content}"""`,
      },
    ],
  });

  const toolUse = message.content.find((c) => c.type === "tool_use");
  const input = toolUse?.type === "tool_use" ? (toolUse.input as { category: string; confidence: number }) : null;
  const category = CATEGORIES.includes(input?.category as (typeof CATEGORIES)[number])
    ? input!.category
    : "general";

  await supabase
    .from("posts")
    .update({ category, category_confidence: input?.confidence ?? null })
    .eq("id", postId);

  return NextResponse.json({ category });
}
