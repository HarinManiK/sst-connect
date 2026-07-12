/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";
import { chatWithFallback, extractJson } from "./client";
import { AppData, type Person, type Post } from "./data";

export type ActionProposal =
  | { type: "create_post"; content: string }
  | { type: "send_request"; person_id: string; person_name: string }
  | {
      type: "update_profile";
      bio?: string;
      intent?: string;
      add_interests?: string[];
      summary: string;
    };

export type CopilotResult = {
  text: string;
  people: Person[];
  posts: Post[];
  action: ActionProposal | null;
};

const SYSTEM = `You are Copilot, the built-in AI of "SST Connect" — a social + dating app used ONLY by students of Scaler School of Technology (SST). You are a warm, sharp campus insider who can answer almost anything about the app and help the user get things done. Speak naturally and concisely.

WHAT YOU CAN SEE (public data only):
- Every discoverable student's profile: name, batch (1-4; batch 4 = newest 2026 intake, batch 1 = oldest), branch, bio, interest tags, and intent ("friends", "dating", or "either").
- Every public post: author, text, category (hot/tech/culture/general), like & comment counts, time.
- Aggregate stats, and the current user's OWN public activity and connection counts.
You CANNOT see private direct messages or hidden profiles. Never claim to. Base every fact on tool results — never invent people, posts, or numbers. Data is always live: if something was deleted, it simply won't appear.

HOW YOU WORK — respond with ONE JSON object per step, nothing else (no prose, no code fences).

To fetch data (repeat as needed):
  {"tool":"get_stats"}                                        // totals, per-batch, per-intent, top interests (counts everyone incl. the user)
  {"tool":"count_people","args":{"batch":4,"intent":"dating","interests":["music"],"text":"..."}}   // all filters optional
  {"tool":"search_people","args":{ ...same filters..., "limit":12 }}   // returns other students to connect with
  {"tool":"get_person","args":{"name":"Ananya"}}              // one person's profile + their recent posts (name or id)
  {"tool":"search_posts","args":{"text":"hackathon","category":"tech","author":"Ravi","since_days":7,"limit":15}}  // all optional
  {"tool":"summarize_feed","args":{"category":"hot","since_days":3,"limit":25}}   // recent posts for you to summarize
  {"tool":"trending","args":{"since_days":7}}                 // top posts by engagement + busiest categories
  {"tool":"compatibility","args":{"name":"Ananya"}}          // how well the user matches a person (shared interests/batch/intent)
  {"tool":"my_activity"}                                      // the user's own posts, likes/comments received, discoverable, friend/pending counts

To reply to the user:
  {"tool":"answer","text":"...","show_people":["id",...],"show_posts":["id",...],"action":null}
    - "text": answer the real question, warm and brief.
    - "show_people"/"show_posts": ids from tool results to display as tappable cards (empty arrays if none). When showing cards, don't also list them in text.
    - "action": null, OR a change the user asked you to make — shown to them as a CONFIRM button, never done automatically:
        {"type":"create_post","content":"the exact post text"}
        {"type":"send_request","person_id":"id","person_name":"Name"}
        {"type":"update_profile","summary":"what will change","bio":"new bio (optional)","intent":"friends|dating|either (optional)","add_interests":["Music"] (optional)}

RULES:
- Use tools to really answer — e.g. "how many people are on here?" → get_stats or count_people; "what's happening?" → summarize_feed/trending.
- Only propose an action when the user clearly asks you to do/change/post/add something. Draft the content, put it in "action", and let them confirm. Do NOT propose actions for pure questions.
- If a request is genuinely ambiguous, ask a short clarifying question (as a plain answer, action null).
- Keep it human. No corporate tone.`;

type Filters = {
  batch?: number;
  intent?: string;
  interests?: string[];
  text?: string;
  limit?: number;
};

function filterPeople(people: Person[], args: Filters): Person[] {
  let out = people;
  if (typeof args.batch === "number") out = out.filter((p) => p.batch === args.batch);
  if (args.intent && args.intent !== "either") {
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

function recentWithin(posts: Post[], days?: number): Post[] {
  if (!days) return posts;
  const cutoff = Date.now() - days * 86400_000;
  return posts.filter((p) => new Date(p.created_at).getTime() >= cutoff);
}

function personSummary(p: Person) {
  return {
    id: p.id,
    name: p.name,
    batch: p.batch,
    branch: p.branch,
    bio: p.bio,
    intent: p.intent,
    interests: p.interests,
  };
}

function postSummary(p: Post) {
  return {
    id: p.id,
    author: p.author_name,
    content: p.content,
    category: p.category,
    likes: p.likes,
    comments: p.comments,
    created_at: p.created_at,
  };
}

async function runTool(
  data: AppData,
  tool: string,
  args: Filters & { name?: string; id?: string; author?: string; category?: string; since_days?: number },
  seenPeople: Map<string, Person>,
  seenPosts: Map<string, Post>
): Promise<any> {
  switch (tool) {
    case "get_stats": {
      const all = await data.people();
      const byBatch: Record<string, number> = {};
      const byIntent: Record<string, number> = {};
      const interestCounts: Record<string, number> = {};
      for (const p of all) {
        byBatch[p.batch ? `batch ${p.batch}` : "unknown batch"] =
          (byBatch[p.batch ? `batch ${p.batch}` : "unknown batch"] ?? 0) + 1;
        byIntent[p.intent] = (byIntent[p.intent] ?? 0) + 1;
        for (const i of p.interests) interestCounts[i] = (interestCounts[i] ?? 0) + 1;
      }
      const top_interests = Object.entries(interestCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));
      return { total_people: all.length, by_batch: byBatch, by_intent: byIntent, top_interests };
    }

    case "count_people": {
      const all = await data.people();
      return { count: filterPeople(all, args).length };
    }

    case "search_people": {
      const others = await data.others();
      const matched = filterPeople(others, args);
      const limit = Math.min(Math.max(args.limit ?? 12, 1), 30);
      const slice = matched.slice(0, limit);
      slice.forEach((p) => seenPeople.set(p.id, p));
      return { total_matched: matched.length, people: slice.map(personSummary) };
    }

    case "get_person": {
      const all = await data.people();
      const person = args.id
        ? all.find((p) => p.id === args.id)
        : all.find((p) => p.name.toLowerCase() === (args.name ?? "").toLowerCase()) ??
          all.find((p) => p.name.toLowerCase().includes((args.name ?? "").toLowerCase()));
      if (!person) return { found: false };
      seenPeople.set(person.id, person);
      const posts = (await data.posts()).filter((p) => p.author_id === person.id).slice(0, 10);
      posts.forEach((p) => seenPosts.set(p.id, p));
      return { found: true, person: personSummary(person), recent_posts: posts.map(postSummary) };
    }

    case "search_posts": {
      let posts = recentWithin(await data.posts(), args.since_days);
      if (args.category) posts = posts.filter((p) => p.category === args.category);
      if (args.author) {
        const a = args.author.toLowerCase();
        posts = posts.filter((p) => p.author_name.toLowerCase().includes(a));
      }
      if (args.text) {
        const t = args.text.toLowerCase();
        posts = posts.filter((p) => (p.content ?? "").toLowerCase().includes(t));
      }
      const limit = Math.min(Math.max(args.limit ?? 15, 1), 40);
      const slice = posts.slice(0, limit);
      slice.forEach((p) => seenPosts.set(p.id, p));
      return { total_matched: posts.length, posts: slice.map(postSummary) };
    }

    case "summarize_feed": {
      let posts = recentWithin(await data.posts(), args.since_days ?? 7);
      if (args.category) posts = posts.filter((p) => p.category === args.category);
      const slice = posts.slice(0, Math.min(args.limit ?? 25, 40));
      slice.forEach((p) => seenPosts.set(p.id, p));
      return { count: posts.length, posts: slice.map(postSummary) };
    }

    case "trending": {
      const posts = recentWithin(await data.posts(), args.since_days ?? 7);
      const top = [...posts].sort((a, b) => b.likes + b.comments - (a.likes + a.comments)).slice(0, 10);
      top.forEach((p) => seenPosts.set(p.id, p));
      const catCounts: Record<string, number> = {};
      for (const p of posts) catCounts[p.category] = (catCounts[p.category] ?? 0) + 1;
      return {
        window_posts: posts.length,
        busiest_categories: Object.entries(catCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([category, count]) => ({ category, count })),
        top_posts: top.map(postSummary),
      };
    }

    case "compatibility": {
      const me = await data.me();
      const all = await data.people();
      const person = args.id
        ? all.find((p) => p.id === args.id)
        : all.find((p) => p.name.toLowerCase() === (args.name ?? "").toLowerCase()) ??
          all.find((p) => p.name.toLowerCase().includes((args.name ?? "").toLowerCase()));
      if (!me || !person) return { found: false };
      seenPeople.set(person.id, person);
      const mine = new Set(me.interests.map((i) => i.toLowerCase()));
      const shared = person.interests.filter((i) => mine.has(i.toLowerCase()));
      return {
        found: true,
        person: personSummary(person),
        same_batch: me.batch != null && me.batch === person.batch,
        shared_interests: shared,
        shared_count: shared.length,
        intent_aligned:
          me.intent === "either" || person.intent === "either" || me.intent === person.intent,
      };
    }

    case "my_activity": {
      const [activity, connections, me] = await Promise.all([
        data.myActivity(),
        data.myConnections(),
        data.me(),
      ]);
      return {
        ...activity,
        ...connections,
        my_batch: me?.batch ?? null,
        my_intent: me?.intent ?? null,
        my_interests: me?.interests ?? [],
        my_bio: me?.bio ?? null,
      };
    }

    default:
      return { error: `unknown tool "${tool}"` };
  }
}

function sanitizeAction(a: any, seenPeople: Map<string, Person>): ActionProposal | null {
  if (!a || typeof a !== "object") return null;
  if (a.type === "create_post" && typeof a.content === "string" && a.content.trim()) {
    return { type: "create_post", content: a.content.trim() };
  }
  if (a.type === "send_request" && typeof a.person_id === "string" && seenPeople.has(a.person_id)) {
    return {
      type: "send_request",
      person_id: a.person_id,
      person_name: seenPeople.get(a.person_id)!.name,
    };
  }
  if (a.type === "update_profile") {
    const out: ActionProposal = { type: "update_profile", summary: String(a.summary ?? "Update your profile") };
    if (typeof a.bio === "string") out.bio = a.bio;
    if (["friends", "dating", "either"].includes(a.intent)) out.intent = a.intent;
    if (Array.isArray(a.add_interests)) out.add_interests = a.add_interests.map(String);
    if (out.bio === undefined && out.intent === undefined && !out.add_interests?.length) return null;
    return out;
  }
  return null;
}

export async function runCopilot(
  supabase: SupabaseClient,
  meId: string,
  history: { role: "user" | "assistant"; content: string }[]
): Promise<CopilotResult> {
  const data = new AppData(supabase, meId);
  const seenPeople = new Map<string, Person>();
  const seenPosts = new Map<string, Post>();

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: SYSTEM },
    ...history.slice(-8),
  ];

  for (let step = 0; step < 6; step++) {
    const completion = await chatWithFallback({
      messages: messages as any,
      max_tokens: 900,
      temperature: 0.3,
    });
    const raw = completion.choices[0]?.message?.content ?? "";
    const parsed = extractJson<any>(raw);

    if (!parsed?.tool) {
      return { text: raw.trim() || "Sorry, try asking that a different way?", people: [], posts: [], action: null };
    }

    if (parsed.tool === "answer") {
      const people = (Array.isArray(parsed.show_people) ? parsed.show_people : [])
        .map((id: string) => seenPeople.get(id))
        .filter(Boolean) as Person[];
      const posts = (Array.isArray(parsed.show_posts) ? parsed.show_posts : [])
        .map((id: string) => seenPosts.get(id))
        .filter(Boolean) as Post[];
      return {
        text: String(parsed.text ?? "").trim(),
        people,
        posts,
        action: sanitizeAction(parsed.action, seenPeople),
      };
    }

    const result = await runTool(data, parsed.tool, parsed.args ?? {}, seenPeople, seenPosts);
    messages.push({ role: "assistant", content: raw });
    messages.push({ role: "user", content: `TOOL_RESULT ${JSON.stringify(result)}` });
  }

  return { text: "That got complicated — try asking a bit more simply?", people: [], posts: [], action: null };
}
