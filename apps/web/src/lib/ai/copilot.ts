/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";
import { chatWithFallback, extractJson } from "./client";

export type CopilotPerson = {
  id: string;
  name: string;
  avatar_url: string | null;
  batch: number | null;
  branch: string | null;
  bio: string | null;
  interests: string[];
};
export type CopilotPost = {
  id: string;
  author_name: string;
  author_avatar: string | null;
  content: string | null;
  image_url: string | null;
  category: string;
  likes: number;
  comments: number;
  created_at: string;
};
export type CopilotResult = { text: string; people: CopilotPerson[]; posts: CopilotPost[] };

function sqlWriterSystem(meId: string, meName: string) {
  return `You are the query engine for "SST Connect", a social + dating app for students of Scaler School of Technology (SST). Turn the user's question into ONE read-only Postgres SELECT over the schema below. It will be executed and you'll phrase the answer in a later step.

Schema (public):
- profiles(id uuid, display_name text, avatar_url text, batch int [1-4; 4 = newest 2026 intake; may be null], branch text ["CS & AI" or "AI & Business"; this is the "program"], hostel_block text ["Uniworld 1 (Neeladri)" or "Uniworld 2 (Velankini)"], bio text, discoverable boolean, deleted_at timestamptz, created_at timestamptz)
- interests(id uuid, name text)
- profile_interests(profile_id uuid, interest_id uuid)
- posts(id uuid, author_id uuid -> profiles.id, content text, image_url text, category text, deleted_at timestamptz, created_at timestamptz)
- post_likes(post_id uuid, profile_id uuid, created_at timestamptz)
- post_comments(id uuid, post_id uuid, author_id uuid -> profiles.id, content text, created_at timestamptz)
- friendships(id uuid, requester_id uuid, addressee_id uuid, status text ["pending","accepted","declined"], created_at timestamptz)
(Private direct messages exist but are OFF-LIMITS — never reference them.)

The current user: id = '${meId}', name = '${meName}'.

Rules:
- Always exclude deleted rows (profiles.deleted_at is null, posts.deleted_at is null).
- When finding/listing PEOPLE, also require profiles.discoverable = true and exclude the current user (profiles.id <> '${meId}') unless the question is explicitly about themselves.
- Use ILIKE '%term%' for fuzzy name/interest/text matching.
- Add a LIMIT (<= 20) to list queries. Use count()/aggregates for "how many".
- Never write anything but a single SELECT.

Keep the entire SQL on ONE line with no line breaks inside it, so the JSON stays valid.

Respond with ONLY a JSON object (no markdown fences):
{
  "sql": "<one SELECT statement, or null if the question is just a greeting/help>",
  "show": "people" | "posts" | null,
  "answer": "<a direct reply, ONLY when sql is null>"
}

If show = "people": the SELECT must return columns exactly named: id, display_name, avatar_url, batch, branch, bio, and interests (use array_agg of interest names, or NULL). GROUP BY the profile columns.
If show = "posts": return columns named: id, author_name, author_avatar, content, image_url, category, created_at, likes (count of post_likes), comments (count of post_comments).`;
}

const PHRASER = `You are Copilot, the warm, sharp AI of SST Connect (a social + dating app for Scaler School of Technology students). You are given the user's question and RESULT — the real rows returned from the database for that question.

- Answer using ONLY the RESULT. Every bit of it is public within the app, so share it freely, INCLUDING names. You must NEVER refuse to share names or details, and never say "I can't share that" — that's wrong here.
- If RESULT is empty, say so honestly (nothing matches yet / early days).
- The numbers/rows are authoritative; never invent or change them.
- If people/post cards will be shown alongside, keep your text short and don't re-list them.
- Plain text only. Never mention SQL, databases, "deleted"/"discoverable" flags, or any dating/relationship "intent" (no such setting exists). Only answer what was asked.`;

function toPeople(rows: any[], meId: string): CopilotPerson[] {
  return rows
    .filter((r) => r && typeof r.id === "string" && r.id !== meId && (r.display_name || r.name))
    .map((r) => ({
      id: r.id,
      name: r.display_name ?? r.name,
      avatar_url: r.avatar_url ?? null,
      batch: r.batch ?? null,
      branch: r.branch ?? null,
      bio: r.bio ?? null,
      interests: Array.isArray(r.interests) ? r.interests.filter(Boolean) : [],
    }));
}

function toPosts(rows: any[]): CopilotPost[] {
  return rows
    .filter((r) => r && typeof r.id === "string")
    .map((r) => ({
      id: r.id,
      author_name: r.author_name ?? "Unknown",
      author_avatar: r.author_avatar ?? null,
      content: r.content ?? null,
      image_url: r.image_url ?? null,
      category: r.category ?? "general",
      likes: Number(r.likes ?? 0),
      comments: Number(r.comments ?? 0),
      created_at: r.created_at ?? new Date().toISOString(),
    }));
}

type Plan = { sql?: string | null; show?: "people" | "posts" | null; answer?: string | null };

export async function runCopilot(
  supabase: SupabaseClient,
  meId: string,
  history: { role: "user" | "assistant"; content: string }[]
): Promise<CopilotResult> {
  const question = history[history.length - 1]?.content ?? "";
  const priorContext = history
    .slice(-5, -1)
    .map((m) => `${m.role === "user" ? "User" : "Copilot"}: ${m.content}`)
    .join("\n");

  const { data: meRow } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", meId)
    .maybeSingle();
  const meName = meRow?.display_name ?? "there";

  const askForPlan = async (extra = "") => {
    const completion = await chatWithFallback({
      messages: [
        { role: "system", content: sqlWriterSystem(meId, meName) },
        {
          role: "user",
          content: `${priorContext ? `Conversation so far:\n${priorContext}\n\n` : ""}Question: ${question}${extra}`,
        },
      ] as any,
      max_tokens: 500,
      temperature: 0,
    });
    return extractJson<Plan>(completion.choices[0]?.message?.content ?? "") ?? {};
  };

  let plan = await askForPlan();

  // Greeting / help — no query needed.
  if (!plan.sql && plan.answer) {
    return { text: String(plan.answer).trim(), people: [], posts: [] };
  }

  // Run the query, with one self-correction attempt if the SQL errors.
  let rows: any[] = [];
  let sql = plan.sql ?? null;
  for (let attempt = 0; attempt < 2 && sql; attempt++) {
    const { data, error } = await supabase.rpc("ai_sql", { q: sql });
    if (!error) {
      rows = Array.isArray(data) ? data : [];
      break;
    }
    if (attempt === 0) {
      plan = await askForPlan(
        `\n\n(Your previous SQL failed: ${error.message}. Return corrected JSON.)`
      );
      sql = plan.sql ?? null;
    }
  }

  const show = plan.show ?? null;
  const people = show === "people" ? toPeople(rows, meId) : [];
  const posts = show === "posts" ? toPosts(rows) : [];

  const phrase = await chatWithFallback({
    messages: [
      { role: "system", content: PHRASER },
      {
        role: "user",
        content: `${priorContext ? `Conversation so far:\n${priorContext}\n\n` : ""}Question: ${question}\n\nRESULT (${rows.length} rows):\n${JSON.stringify(rows).slice(0, 6000)}`,
      },
    ] as any,
    max_tokens: 600,
    temperature: 0.3,
  });

  const text = (phrase.choices[0]?.message?.content ?? "").trim();
  return { text: text || "Hmm, try asking that a different way?", people, posts };
}
