import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChatWindow } from "./ChatWindow";

export default async function ChatThreadPage({
  params,
}: {
  params: Promise<{ friendId: string }>;
}) {
  const { friendId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: friendship } = await supabase
    .from("friendships")
    .select("id")
    .eq("status", "accepted")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${user.id})`
    )
    .maybeSingle();

  if (!friendship) notFound();

  const { data: friend } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("id", friendId)
    .single();

  if (!friend) notFound();

  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, receiver_id, content, created_at")
    .or(
      `and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`
    )
    .order("created_at", { ascending: true })
    .limit(200);

  return (
    <ChatWindow
      currentUserId={user.id}
      friendId={friendId}
      friendName={friend.display_name}
      friendAvatar={friend.avatar_url}
      initialMessages={messages ?? []}
    />
  );
}
