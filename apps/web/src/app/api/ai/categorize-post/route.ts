import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ai, AI_MODEL, extractJson } from "@/lib/ai/client";

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

  const completion = await ai.chat.completions.create({
    model: AI_MODEL,
    max_tokens: 100,
    temperature: 0,
    messages: [
      {
        role: "user",
        content: `Classify this college social-media post into exactly one category:
- "hot": urgent/high-engagement campus news (placements, announcements, deadlines)
- "tech": tech projects, hackathons, internships, coding
- "culture": events, fests, clubs, sports, social activities
- "general": anything else (default/fallback)

Post: """${post.content}"""

Respond with ONLY a JSON object, no other text, in exactly this shape:
{"category": "hot" | "tech" | "culture" | "general", "confidence": 0.0 to 1.0}`,
      },
    ],
  });

  const parsed = extractJson<{ category: string; confidence: number }>(
    completion.choices[0]?.message?.content ?? ""
  );

  const category = CATEGORIES.includes(parsed?.category as (typeof CATEGORIES)[number])
    ? (parsed!.category as (typeof CATEGORIES)[number])
    : "general";

  await supabase
    .from("posts")
    .update({ category, category_confidence: parsed?.confidence ?? null })
    .eq("id", postId);

  return NextResponse.json({ category });
}
