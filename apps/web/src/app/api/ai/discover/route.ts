import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ai, AI_MODEL, extractJson } from "@/lib/ai/client";

type ParsedFilters = {
  batch: number | null;
  intent: "friends" | "dating" | "either" | null;
  interest_keywords: string[];
  free_text_keywords: string[];
};

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

  const completion = await ai.chat.completions.create({
    model: AI_MODEL,
    max_tokens: 300,
    temperature: 0,
    messages: [
      {
        role: "user",
        content: `Extract structured search filters from this "find people like X" request from a college student.

Request: """${query}"""

Respond with ONLY a JSON object, no other text, in exactly this shape:
{
  "batch": integer 1-4 if a batch/year is mentioned, else null,
  "intent": "friends" | "dating" | "either" | null (only if explicitly implied),
  "interest_keywords": array of normalized interest/hobby/skill keywords mentioned (e.g. "competitive programming", "badminton"),
  "free_text_keywords": array of other descriptive words worth loosely matching against a bio (e.g. "night owl", "indie music")
}`,
      },
    ],
  });

  const filters = extractJson<ParsedFilters>(completion.choices[0]?.message?.content ?? "") ?? {
    batch: null,
    intent: null,
    interest_keywords: [],
    free_text_keywords: [],
  };

  let profileQuery = supabase
    .from("profiles")
    .select(
      "id, display_name, batch, branch, bio, avatar_url, intent, profile_interests(interests(name))"
    )
    .eq("discoverable", true)
    .is("deleted_at", null)
    .neq("id", user.id)
    .limit(100);

  if (filters.batch) profileQuery = profileQuery.eq("batch", filters.batch);
  if (filters.intent) profileQuery = profileQuery.in("intent", [filters.intent, "either"]);

  const { data: candidates } = await profileQuery;

  type Candidate = {
    id: string;
    display_name: string;
    batch: number | null;
    branch: string | null;
    bio: string | null;
    avatar_url: string | null;
    intent: string;
    profile_interests: { interests: { name: string } | null }[];
  };

  const scored = ((candidates as unknown as Candidate[]) ?? []).map((c) => {
    const interestNames = c.profile_interests
      .map((pi) => pi.interests?.name?.toLowerCase())
      .filter(Boolean) as string[];

    const interestMatches = filters.interest_keywords.filter((kw) =>
      interestNames.some((name) => name.includes(kw.toLowerCase()) || kw.toLowerCase().includes(name))
    ).length;

    const bioText = (c.bio ?? "").toLowerCase();
    const freeTextMatches = filters.free_text_keywords.filter((kw) =>
      bioText.includes(kw.toLowerCase())
    ).length;

    return { ...c, score: interestMatches * 2 + freeTextMatches };
  });

  const ranked = scored
    .filter((c) => filters.interest_keywords.length + filters.free_text_keywords.length === 0 || c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  return NextResponse.json({ filters, results: ranked });
}
