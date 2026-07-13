/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";
import { chatWithFallback, extractJson } from "./client";
import { AppData, type Person, type Post } from "./data";

export type CopilotResult = {
  text: string;
  people: Person[];
  posts: Post[];
};

// ── Step 1: PLAN. Turn the question into ONE structured query spec. ──────
const PLANNER = `You convert a user's question to SST Connect's Copilot into a single JSON query plan. SST Connect is a social + dating app for students of Scaler School of Technology (SST). Students have: batch (1-4; 4 = newest 2026 intake), branch, bio, interest tags, and an intent ("friends", "dating", or "either"). There are also public posts with a category ("hot", "tech", "culture", "general").

Output ONLY a JSON object (no prose, no fences) with this shape:
{
  "intent": "stats" | "count_people" | "list_people" | "list_posts" | "person" | "my_stats" | "chat",
  "people": { "batch": <1-4|null>, "interests": [<keywords>]|null, "text": <string|null> },
  "posts": { "text": <string|null>, "author": <name|null>, "since_days": <int|null> },
  "name": <person name if the question is about one specific person, else null>,
  "limit": <int|null>
}

Match people by their interests, bio, program, and batch (via the "interests" and free "text" fields) — there is no dating/friends flag. For "find me someone who <does X / is into X>", put X into interests or text.

Pick the intent:
- "stats": totals / "how many people" (no specific filter) / breakdowns / most popular interests.
- "count_people": "how many people who <filter>" (a count WITH filters).
- "list_people": find/show/who are the people matching something (returns people to display).
- "list_posts": posts / feed / "what's happening" / trends / what someone posted.
- "person": a question about ONE named person ("tell me about Ravi", "is Ananya into music").
- "my_stats": about the user THEMSELVES ("how many friends do I have", "how's my profile").
- "chat": greetings/help/anything needing no data.

Fill only the relevant filter fields; use null for the rest. Keep interest/text keywords short and normalized.`;

// ── Step 2: EXECUTE against Postgres (exact, scalable). ──────────────────
type Plan = {
  intent: string;
  people?: { batch?: number | null; interests?: string[] | null; text?: string | null };
  posts?: { category?: string | null; text?: string | null; author?: string | null; since_days?: number | null };
  name?: string | null;
  limit?: number | null;
};

function personRow(r: any): Person {
  return {
    id: r.id,
    name: r.name,
    avatar_url: r.avatar_url ?? null,
    batch: r.batch,
    branch: r.branch,
    bio: r.bio,
    intent: r.intent,
    interests: r.interests ?? [],
  };
}

function postRow(r: any): Post {
  return {
    id: r.id,
    author_id: r.author_id,
    author_name: r.author_name,
    author_avatar: r.author_avatar,
    content: r.content,
    image_url: r.image_url,
    category: r.category,
    likes: Number(r.likes ?? 0),
    comments: Number(r.comments ?? 0),
    created_at: r.created_at,
  };
}

async function execute(
  supabase: SupabaseClient,
  data: AppData,
  plan: Plan
): Promise<{ result: any; people: Person[]; posts: Post[] }> {
  const pf = plan.people ?? {};
  const limit = Math.min(Math.max(plan.limit ?? 15, 1), 30);

  switch (plan.intent) {
    case "stats": {
      const { data: stats } = await supabase.rpc("ai_stats");
      return { result: stats ?? {}, people: [], posts: [] };
    }

    case "count_people": {
      const { data: count } = await supabase.rpc("ai_count_people", {
        p_batch: pf.batch ?? null,
        p_intent: null,
        p_interests: pf.interests?.length ? pf.interests : null,
        p_text: pf.text ?? null,
      });
      return { result: { count: Number(count ?? 0) }, people: [], posts: [] };
    }

    case "list_people": {
      const { data: rows } = await supabase.rpc("ai_search_people", {
        p_batch: pf.batch ?? null,
        p_intent: null,
        p_interests: pf.interests?.length ? pf.interests : null,
        p_text: pf.text ?? null,
        p_limit: limit,
      });
      const people: Person[] = (rows ?? []).map(personRow);
      return {
        result: { count: people.length, people: people.map((p) => ({ id: p.id, name: p.name, batch: p.batch, branch: p.branch, intent: p.intent, interests: p.interests, bio: p.bio })) },
        people,
        posts: [],
      };
    }

    case "list_posts": {
      const po = plan.posts ?? {};
      const { data: rows } = await supabase.rpc("ai_search_posts", {
        p_category: po.category ?? null,
        p_text: po.text ?? null,
        p_author: po.author ?? null,
        p_since_days: po.since_days ?? null,
        p_limit: limit,
      });
      const posts: Post[] = (rows ?? []).map(postRow);
      return {
        result: { count: posts.length, posts: posts.map((p) => ({ id: p.id, author: p.author_name, category: p.category, likes: p.likes, comments: p.comments, content: p.content })) },
        people: [],
        posts,
      };
    }

    case "person": {
      const { data: rows } = await supabase.rpc("ai_search_people", {
        p_batch: null,
        p_intent: null,
        p_interests: null,
        p_text: plan.name ?? pf.text ?? null,
        p_limit: 3,
      });
      const people: Person[] = (rows ?? []).map(personRow);
      const target = people[0];
      let posts: Post[] = [];
      if (target) {
        const { data: postRows } = await supabase.rpc("ai_search_posts", {
          p_category: null,
          p_text: null,
          p_author: target.name,
          p_since_days: null,
          p_limit: 5,
        });
        posts = (postRows ?? []).map(postRow) as Post[];
      }
      return {
        result: target
          ? {
              found: true,
              person: { id: target.id, name: target.name, batch: target.batch, branch: target.branch, intent: target.intent, interests: target.interests, bio: target.bio },
              recent_posts: posts.map((p) => ({ id: p.id, category: p.category, content: p.content })),
            }
          : { found: false },
        people: target ? [target] : [],
        posts,
      };
    }

    case "my_stats": {
      const [activity, connections, me] = await Promise.all([
        data.myActivity(),
        data.myConnections(),
        data.me(),
      ]);
      return {
        result: {
          ...activity,
          ...connections,
          my_batch: me?.batch ?? null,
          my_intent: me?.intent ?? null,
          my_interests: me?.interests ?? [],
          my_bio: me?.bio ?? null,
        },
        people: [],
        posts: [],
      };
    }

    default:
      return { result: { note: "no data lookup needed" }, people: [], posts: [] };
  }
}

// ── Step 3: PHRASE. Turn the real result into a natural answer. ──────────
function phraserSystem(meName: string, meId: string) {
  return `You are Copilot, the warm, sharp AI of SST Connect (a social + dating app for Scaler School of Technology students). You are talking to ${meName}.

You are given the user's question and DATA — the real, exact result of a database query for that question. Answer using ONLY this DATA. The numbers are authoritative; never change or invent them. If DATA is empty or says found:false, say so honestly (e.g. nobody matches yet, or it's early days). Keep it short, specific, and friendly. Plain text only.

The current user's id is "${meId}" — if they appear in results, refer to them as "you", and never recommend them to themselves.

To show tappable cards for specific people or posts in the DATA, end your reply with these lines (only if useful), using the real ids from DATA:
@@people: id1, id2
@@posts: id3
Never mention ids or these lines in your prose.`;
}

function parseCards(raw: string, people: Person[], posts: Post[]) {
  const pMap = new Map(people.map((p) => [p.id, p]));
  const qMap = new Map(posts.map((p) => [p.id, p]));
  const outP: Person[] = [];
  const outQ: Post[] = [];

  let text = raw.replace(/@@people:\s*([^\n]+)/gi, (_m, ids: string) => {
    for (const id of ids.split(",")) {
      const p = pMap.get(id.trim());
      if (p && !outP.includes(p)) outP.push(p);
    }
    return "";
  });
  text = text.replace(/@@posts:\s*([^\n]+)/gi, (_m, ids: string) => {
    for (const id of ids.split(",")) {
      const p = qMap.get(id.trim());
      if (p && !outQ.includes(p)) outQ.push(p);
    }
    return "";
  });

  return { text: text.trim(), people: outP, posts: outQ };
}

export async function runCopilot(
  supabase: SupabaseClient,
  meId: string,
  history: { role: "user" | "assistant"; content: string }[]
): Promise<CopilotResult> {
  const data = new AppData(supabase, meId);
  const question = history[history.length - 1]?.content ?? "";
  const priorContext = history
    .slice(-5, -1)
    .map((m) => `${m.role === "user" ? "User" : "Copilot"}: ${m.content}`)
    .join("\n");

  // Step 1 — plan
  const planCompletion = await chatWithFallback({
    messages: [
      { role: "system", content: PLANNER },
      {
        role: "user",
        content: `${priorContext ? `Conversation so far:\n${priorContext}\n\n` : ""}Question: ${question}`,
      },
    ] as any,
    max_tokens: 300,
    temperature: 0,
  });
  const plan = extractJson<Plan>(planCompletion.choices[0]?.message?.content ?? "") ?? {
    intent: "chat",
  };

  // Step 2 — execute against Postgres
  const { result, people, posts } = await execute(supabase, data, plan);

  // Step 3 — phrase the real result
  const me = await data.me();
  const phraseCompletion = await chatWithFallback({
    messages: [
      { role: "system", content: phraserSystem(me?.name ?? "there", meId) },
      {
        role: "user",
        content: `${priorContext ? `Conversation so far:\n${priorContext}\n\n` : ""}Question: ${question}\n\nDATA:\n${JSON.stringify(result)}`,
      },
    ] as any,
    max_tokens: 600,
    temperature: 0.3,
  });

  const raw = phraseCompletion.choices[0]?.message?.content ?? "";
  const parsed = parseCards(raw, people, posts);

  return {
    text: parsed.text || "Hmm, try asking that a different way?",
    people: parsed.people,
    posts: parsed.posts,
  };
}
