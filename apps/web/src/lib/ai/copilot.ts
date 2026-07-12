/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";
import { chatWithFallback } from "./client";
import { AppData, type Person, type Post } from "./data";

export type CopilotResult = {
  text: string;
  people: Person[];
  posts: Post[];
};

const SYSTEM = `You are Copilot, the built-in AI of "SST Connect" — a social + dating app used ONLY by students of Scaler School of Technology (SST). You are a warm, sharp campus insider.

You are given a COMPLETE, live snapshot of the app's public data below (every student and the recent posts). Answer the user's question using ONLY that snapshot — accurately, specifically, and in a friendly, natural voice.

Ground rules:
- The "TOTALS" line is authoritative for any counting/"how many" question — read the number straight from it.
- The student tagged "(THIS IS YOU)" is the person you're talking to. Refer to them as "you". If they're the only student, tell them warmly that they're the first one here.
- NEVER invent people, posts, numbers, or details that aren't in the snapshot. If the snapshot doesn't contain the answer, say so plainly.
- Batches run 1 (oldest) to 4 (newest, 2026 intake).
- You can reason freely over the data: compare people, judge compatibility from shared interests/batch/intent, spot trends from posts, summarize the feed, coach the user on their profile, etc.
- Keep answers short and human. Plain text only — never output JSON or code.

Showing cards (optional, for convenience): if it helps the user to see specific students or posts as tappable cards, add at the VERY END, each on its own line:
@@people: id1, id2
@@posts: id3, id4
Use only ids that appear in the snapshot. Omit the lines when not relevant. Never mention ids or these lines anywhere in your prose.`;

function truncate(s: string | null, n: number) {
  if (!s) return "";
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
}

function relTime(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// Builds the full data snapshot string + short-id lookup maps. Short ids
// (p1, q1...) are easy for the model to copy back accurately for cards.
function buildSnapshot(
  people: Person[],
  posts: Post[],
  meId: string,
  activity: { post_count: number; likes_received: number; comments_received: number; discoverable: boolean },
  connections: { friends: number; pending_incoming: number; pending_outgoing: number }
) {
  const pid = new Map<string, Person>();
  const qid = new Map<string, Post>();
  const idOf = new Map<string, string>();
  people.forEach((p, i) => {
    pid.set(`p${i + 1}`, p);
    idOf.set(p.id, `p${i + 1}`);
  });
  posts.forEach((p, i) => qid.set(`q${i + 1}`, p));

  const byBatch: Record<string, number> = {};
  const byIntent: Record<string, number> = {};
  const interestCounts: Record<string, number> = {};
  for (const p of people) {
    byBatch[p.batch ? `batch ${p.batch}` : "batch unknown"] =
      (byBatch[p.batch ? `batch ${p.batch}` : "batch unknown"] ?? 0) + 1;
    byIntent[p.intent] = (byIntent[p.intent] ?? 0) + 1;
    for (const i of p.interests) interestCounts[i] = (interestCounts[i] ?? 0) + 1;
  }
  const topInterests = Object.entries(interestCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([n, c]) => `${n} (${c})`);

  const lines: string[] = [];
  lines.push("=== SST CONNECT — LIVE PUBLIC DATA SNAPSHOT ===");
  lines.push("");
  lines.push(
    `TOTALS: ${people.length} student${people.length === 1 ? "" : "s"} total | ` +
      `by batch: ${JSON.stringify(byBatch)} | by intent: ${JSON.stringify(byIntent)}`
  );
  lines.push(
    `Most common interests: ${topInterests.length ? topInterests.join(", ") : "none yet"}`
  );
  lines.push("");

  lines.push(`STUDENTS (${people.length}):`);
  if (people.length === 0) lines.push("  (none)");
  for (const [sid, p] of pid) {
    const you = p.id === meId ? " (THIS IS YOU)" : "";
    lines.push(
      `  [${sid}]${you} ${p.name} | ${p.batch ? `batch ${p.batch}` : "batch —"}` +
        `${p.branch ? `, ${p.branch}` : ""} | wants: ${p.intent} | ` +
        `interests: ${p.interests.length ? p.interests.join(", ") : "—"} | ` +
        `bio: ${truncate(p.bio, 160) || "—"}`
    );
  }
  lines.push("");

  lines.push(`RECENT POSTS (${posts.length}, newest first):`);
  if (posts.length === 0) lines.push("  (none)");
  for (const [sid, p] of qid) {
    const author = idOf.get(p.author_id);
    lines.push(
      `  [${sid}] by ${p.author_name}${author ? ` (${author})` : ""} | ${p.category} | ` +
        `👍${p.likes} 💬${p.comments} | ${relTime(p.created_at)} | "${truncate(p.content, 240) || "(image)"}"`
    );
  }
  lines.push("");

  lines.push(
    `YOUR OWN STATS: ${activity.post_count} posts, ${activity.likes_received} likes received, ` +
      `${connections.friends} friends, ${connections.pending_incoming} incoming + ` +
      `${connections.pending_outgoing} outgoing pending requests, ` +
      `discoverable: ${activity.discoverable ? "yes" : "no"}.`
  );

  return { snapshot: lines.join("\n"), pid, qid };
}

function parseCards(raw: string, pid: Map<string, Person>, qid: Map<string, Post>) {
  const people: Person[] = [];
  const posts: Post[] = [];

  let text = raw.replace(/@@people:\s*([^\n]+)/gi, (_m, ids: string) => {
    for (const id of ids.split(",")) {
      const p = pid.get(id.trim());
      if (p && !people.includes(p)) people.push(p);
    }
    return "";
  });
  text = text.replace(/@@posts:\s*([^\n]+)/gi, (_m, ids: string) => {
    for (const id of ids.split(",")) {
      const p = qid.get(id.trim());
      if (p && !posts.includes(p)) posts.push(p);
    }
    return "";
  });

  return { text: text.trim(), people, posts };
}

export async function runCopilot(
  supabase: SupabaseClient,
  meId: string,
  history: { role: "user" | "assistant"; content: string }[]
): Promise<CopilotResult> {
  const data = new AppData(supabase, meId);
  const [people, posts, activity, connections] = await Promise.all([
    data.people(),
    data.posts(),
    data.myActivity(),
    data.myConnections(),
  ]);

  const { snapshot, pid, qid } = buildSnapshot(people, posts, meId, activity, connections);

  const messages = [
    { role: "system" as const, content: `${SYSTEM}\n\n${snapshot}` },
    ...history.slice(-6),
  ];

  const completion = await chatWithFallback({
    messages: messages as any,
    max_tokens: 800,
    temperature: 0.2,
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  const { text, people: showPeople, posts: showPosts } = parseCards(raw, pid, qid);

  return {
    text: text || "Hmm, try asking that a different way?",
    people: showPeople,
    posts: showPosts,
  };
}
