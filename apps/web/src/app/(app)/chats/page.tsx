import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppBar } from "@/components/AppBar";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { ChatIcon } from "@/components/Icons";

type ProfileStub = { id: string; display_name: string; avatar_url: string | null };
type Msg = { sender_id: string; receiver_id: string; content: string; created_at: string };

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString();
}

export default async function ChatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: friendships } = await supabase
    .from("friendships")
    .select(
      "id, requester:profiles!friendships_requester_id_fkey(id, display_name, avatar_url), addressee:profiles!friendships_addressee_id_fkey(id, display_name, avatar_url)"
    )
    .eq("status", "accepted")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .returns<{ id: string; requester: ProfileStub; addressee: ProfileStub }[]>();

  // Most recent messages the user is part of; we keep the newest per friend.
  const { data: recentMsgs } = await supabase
    .from("messages")
    .select("sender_id, receiver_id, content, created_at")
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<Msg[]>();

  const lastByFriend = new Map<string, Msg>();
  for (const m of recentMsgs ?? []) {
    const other = m.sender_id === user.id ? m.receiver_id : m.sender_id;
    if (!lastByFriend.has(other)) lastByFriend.set(other, m);
  }

  const conversations = (friendships ?? [])
    .map((f) => {
      const friend = f.requester.id === user.id ? f.addressee : f.requester;
      return { friendshipId: f.id, friend, last: lastByFriend.get(friend.id) ?? null };
    })
    .sort((a, b) => {
      if (!a.last) return 1;
      if (!b.last) return -1;
      return b.last.created_at.localeCompare(a.last.created_at);
    });

  return (
    <div>
      <AppBar title="Chats" />

      {conversations.length === 0 ? (
        <EmptyState
          icon={<ChatIcon />}
          title="No conversations yet"
          subtitle="Add friends and accept requests to start chatting."
          actionLabel="Find people"
          actionHref="/people"
        />
      ) : (
        <div className="flex flex-col">
          {conversations.map((c) => (
            <Link
              key={c.friendshipId}
              href={`/chats/${c.friend.id}`}
              className="tap flex items-center gap-3 border-b border-border px-4 py-3"
            >
              <Avatar name={c.friend.display_name} src={c.friend.avatar_url} size={48} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-semibold text-slate-800">
                    {c.friend.display_name}
                  </p>
                  {c.last && (
                    <span className="shrink-0 text-xs text-slate-400">
                      {timeAgo(c.last.created_at)}
                    </span>
                  )}
                </div>
                <p className="truncate text-sm text-slate-400">
                  {c.last
                    ? `${c.last.sender_id === user.id ? "You: " : ""}${c.last.content}`
                    : "Say hi 👋"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
