import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type ProfileStub = { id: string; display_name: string; avatar_url: string | null };

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

  const conversations = (friendships ?? []).map((f) => ({
    friendshipId: f.id,
    friend: f.requester.id === user.id ? f.addressee : f.requester,
  }));

  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold text-brand-700">Chats</h1>
      <div className="mt-3 flex flex-col divide-y divide-slate-100">
        {conversations.length === 0 && (
          <p className="text-sm text-slate-400">
            No conversations yet -- accept a friend request to start chatting.
          </p>
        )}
        {conversations.map((c) => (
          <Link
            key={c.friendshipId}
            href={`/chats/${c.friend.id}`}
            className="flex items-center gap-3 py-3"
          >
            <div className="h-10 w-10 shrink-0 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold">
              {c.friend.display_name.charAt(0).toUpperCase()}
            </div>
            <p className="font-medium text-slate-800">{c.friend.display_name}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
