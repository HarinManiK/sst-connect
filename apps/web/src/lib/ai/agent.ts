/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";
import { chatWithFallback, extractJson } from "./client";

// A student as the Discover assistant sees them -- exactly the info any user
// could gather by browsing profiles manually.
export type AgentProfile = {
  id: string;
  name: string;
  avatar_url: string | null;
  batch: number | null;
  branch: string | null;
  bio: string | null;
  intent: string;
  interests: string[];
};

export type AgentResult = { text: string; profiles: AgentProfile[] };

const SYSTEM = `You are the Discover assistant inside "SST Connect", a social + dating app used ONLY by students of Scaler School of Technology (SST). Your purpose: help a student find people and answer questions about who's on the app, so they never have to scroll through everyone by hand.

What you know about the app:
- Every student has a profile: name, batch (1-4; batch 4 is the newest 2026 intake, batch 1 the oldest), branch, a short bio, interest tags, and an intent of "friends", "dating", or "either".
- You can see every discoverable student -- the same people the user could find by browsing manually. You are their shortcut.
- You must base EVERY fact on tool results. Never invent people, numbers, or details. If a tool returns nothing, say so honestly.

You operate in a loop. On each step reply with ONE JSON object and NOTHING else (no prose, no code fences). Pick exactly one:

Look up data (you may do this several times):
  {"tool":"query_students","args":{"batch":4,"intent":"dating","interests":["music","coding"],"text":"night owl","limit":12}}
    - every arg is optional; omit what wasn't asked for
    - "text" loosely matches names, bios, and interests
  {"tool":"count_students","args":{ ...same optional filters... }}
  {"tool":"app_stats","args":{}}   -> total students, count per batch, most common interests

Reply to the user:
  {"tool":"answer","text":"...","profile_ids":["id1","id2"]}
    - "text": short, warm, direct. Answer the actual question.
    - "profile_ids": students to show as tappable cards (from tool results). Empty for pure info answers (like counts).
    - When recommending people, put their ids here and DON'T also list their names in text -- the cards show that.

Examples of the range you handle: "how many people are on here?", "who's in batch 4?", "find someone into anime and badminton", "any batch 3 girls looking to date?", "what are the most popular interests?", "someone chill I can study with". Use the tools to really answer.`;

async function loadAll(supabase: SupabaseClient, meId: string): Promise<AgentProfile[]> {
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, display_name, avatar_url, batch, branch, bio, intent, profile_interests(interests(name))"
    )
    .eq("discoverable", true)
    .is("deleted_at", null)
    .neq("id", meId)
    .limit(2000);

  return (data ?? []).map((p: any) => ({
    id: p.id,
    name: p.display_name,
    avatar_url: p.avatar_url,
    batch: p.batch,
    branch: p.branch,
    bio: p.bio,
    intent: p.intent,
    interests: (p.profile_interests ?? [])
      .map((pi: any) => pi.interests?.name)
      .filter(Boolean),
  }));
}

type Filters = {
  batch?: number;
  intent?: string;
  interests?: string[];
  text?: string;
  limit?: number;
};

function applyFilters(all: AgentProfile[], args: Filters): AgentProfile[] {
  let out = all;

  if (typeof args.batch === "number") out = out.filter((p) => p.batch === args.batch);

  if (args.intent && args.intent !== "either") {
    // someone open to "either" is a valid match for a specific intent
    out = out.filter((p) => p.intent === args.intent || p.intent === "either");
  }

  if (args.interests?.length) {
    const kws = args.interests.map((k) => k.toLowerCase());
    out = out.filter((p) => {
      const names = p.interests.map((i) => i.toLowerCase());
      return kws.some((kw) => names.some((n) => n.includes(kw) || kw.includes(n)));
    });
  }

  if (args.text) {
    const t = args.text.toLowerCase();
    out = out.filter((p) =>
      `${p.name} ${p.bio ?? ""} ${p.interests.join(" ")}`.toLowerCase().includes(t)
    );
  }

  return out;
}

function runTool(all: AgentProfile[], tool: string, args: Filters) {
  if (tool === "app_stats") {
    const byBatch: Record<string, number> = {};
    const interestCounts: Record<string, number> = {};
    for (const p of all) {
      const b = p.batch ? `batch ${p.batch}` : "unknown batch";
      byBatch[b] = (byBatch[b] ?? 0) + 1;
      for (const i of p.interests) interestCounts[i] = (interestCounts[i] ?? 0) + 1;
    }
    const top_interests = Object.entries(interestCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));
    return { result: { total_students: all.length, by_batch: byBatch, top_interests }, matched: [] };
  }

  const matched = applyFilters(all, args);

  if (tool === "count_students") {
    return { result: { count: matched.length }, matched: [] };
  }

  // query_students
  const limit = Math.min(Math.max(args.limit ?? 12, 1), 30);
  const slice = matched.slice(0, limit);
  return {
    result: {
      total_matched: matched.length,
      returned: slice.length,
      students: slice.map((p) => ({
        id: p.id,
        name: p.name,
        batch: p.batch,
        branch: p.branch,
        bio: p.bio,
        intent: p.intent,
        interests: p.interests,
      })),
    },
    matched: slice,
  };
}

export async function runDiscoveryAgent(
  supabase: SupabaseClient,
  meId: string,
  userQuery: string
): Promise<AgentResult> {
  const all = await loadAll(supabase, meId);
  const seen = new Map<string, AgentProfile>();

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: userQuery },
  ];

  for (let step = 0; step < 5; step++) {
    const completion = await chatWithFallback({
      messages: messages as any,
      max_tokens: 700,
      temperature: 0.2,
    });
    const raw = completion.choices[0]?.message?.content ?? "";
    const parsed = extractJson<any>(raw);

    if (!parsed?.tool) {
      // Model broke protocol -- fall back to whatever text it produced.
      return { text: raw.trim() || "Sorry, I couldn't work that out. Try rephrasing?", profiles: [] };
    }

    if (parsed.tool === "answer") {
      const ids: string[] = Array.isArray(parsed.profile_ids) ? parsed.profile_ids : [];
      const profiles = ids.map((id) => seen.get(id)).filter(Boolean) as AgentProfile[];
      return { text: String(parsed.text ?? "").trim(), profiles };
    }

    const { result, matched } = runTool(all, parsed.tool, parsed.args ?? {});
    for (const p of matched) seen.set(p.id, p);

    messages.push({ role: "assistant", content: raw });
    messages.push({ role: "user", content: `TOOL_RESULT ${JSON.stringify(result)}` });
  }

  return { text: "That took a few too many steps — try asking a bit more simply?", profiles: [] };
}
