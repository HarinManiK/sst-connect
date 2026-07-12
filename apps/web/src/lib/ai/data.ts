/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";

// ── Public shapes the Copilot reasons over ──────────────────────────────
export type Person = {
  id: string;
  name: string;
  avatar_url: string | null;
  batch: number | null;
  branch: string | null;
  bio: string | null;
  intent: string;
  interests: string[];
};

export type Post = {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  content: string | null;
  image_url: string | null;
  category: string;
  likes: number;
  comments: number;
  created_at: string;
};

function mapPerson(p: any): Person {
  return {
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
  };
}

function mapPost(p: any): Post {
  return {
    id: p.id,
    author_id: p.author_id,
    author_name: p.author?.display_name ?? "Unknown",
    author_avatar: p.author?.avatar_url ?? null,
    content: p.content,
    image_url: p.image_url,
    category: p.category,
    likes: p.post_likes?.[0]?.count ?? 0,
    comments: p.post_comments?.[0]?.count ?? 0,
    created_at: p.created_at,
  };
}

// Per-request view of the app's public data. Everything is fetched live and
// cached only for the lifetime of a single Copilot request, so a post or
// bio deleted/edited a moment ago is simply gone/updated on the next
// question -- the AI keeps no durable memory of anyone's content.
export class AppData {
  private peopleCache: Person[] | null = null;
  private postsCache: Post[] | null = null;
  private meCache: Person | null | undefined = undefined;

  constructor(
    private supabase: SupabaseClient,
    public meId: string
  ) {}

  async people(): Promise<Person[]> {
    if (this.peopleCache) return this.peopleCache;
    const { data } = await this.supabase
      .from("profiles")
      .select(
        "id, display_name, avatar_url, batch, branch, bio, intent, profile_interests(interests(name))"
      )
      .eq("discoverable", true)
      .is("deleted_at", null)
      .limit(3000);
    this.peopleCache = (data ?? []).map(mapPerson);
    return this.peopleCache;
  }

  // People to recommend TO the user (everyone visible except themselves).
  async others(): Promise<Person[]> {
    return (await this.people()).filter((p) => p.id !== this.meId);
  }

  async posts(): Promise<Post[]> {
    if (this.postsCache) return this.postsCache;
    const { data } = await this.supabase
      .from("posts")
      .select(
        "id, author_id, content, image_url, category, created_at, author:profiles!posts_author_id_fkey(display_name, avatar_url), post_likes(count), post_comments(count)"
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(500);
    this.postsCache = (data ?? []).map(mapPost);
    return this.postsCache;
  }

  // The current user's own profile -- fetched even if they're non-discoverable
  // (needed for compatibility + profile coaching).
  async me(): Promise<Person | null> {
    if (this.meCache !== undefined) return this.meCache;
    const { data } = await this.supabase
      .from("profiles")
      .select(
        "id, display_name, avatar_url, batch, branch, bio, intent, discoverable, profile_interests(interests(name))"
      )
      .eq("id", this.meId)
      .maybeSingle();
    this.meCache = data ? mapPerson(data) : null;
    return this.meCache;
  }

  async myDiscoverable(): Promise<boolean> {
    const { data } = await this.supabase
      .from("profiles")
      .select("discoverable")
      .eq("id", this.meId)
      .maybeSingle();
    return Boolean(data?.discoverable);
  }

  // The user's own public activity (their posts + engagement received).
  async myActivity() {
    const all = await this.posts();
    const mine = all.filter((p) => p.author_id === this.meId);
    return {
      post_count: mine.length,
      likes_received: mine.reduce((s, p) => s + p.likes, 0),
      comments_received: mine.reduce((s, p) => s + p.comments, 0),
      discoverable: await this.myDiscoverable(),
    };
  }

  // The user's own connections (their own friendship rows only -- RLS
  // already restricts this to relationships they're part of).
  async myConnections() {
    const { data } = await this.supabase
      .from("friendships")
      .select("status, requester_id, addressee_id")
      .or(`requester_id.eq.${this.meId},addressee_id.eq.${this.meId}`);

    let friends = 0;
    let incoming = 0;
    let outgoing = 0;
    for (const f of data ?? []) {
      if (f.status === "accepted") friends++;
      else if (f.status === "pending") {
        if (f.addressee_id === this.meId) incoming++;
        else outgoing++;
      }
    }
    return { friends, pending_incoming: incoming, pending_outgoing: outgoing };
  }
}
