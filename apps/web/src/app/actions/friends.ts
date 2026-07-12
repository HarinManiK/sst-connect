"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function currentUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

export async function sendFriendRequest(addresseeId: string) {
  const { supabase, userId } = await currentUserId();
  if (addresseeId === userId) throw new Error("Cannot friend yourself");

  const { error } = await supabase
    .from("friendships")
    .insert({ requester_id: userId, addressee_id: addresseeId, status: "pending" });

  if (error) throw new Error(error.message);
  revalidatePath("/copilot");
  revalidatePath("/requests");
}

export async function respondToFriendRequest(
  friendshipId: string,
  decision: "accepted" | "declined"
) {
  const { supabase } = await currentUserId();

  const { error } = await supabase
    .from("friendships")
    .update({ status: decision, responded_at: new Date().toISOString() })
    .eq("id", friendshipId);

  if (error) throw new Error(error.message);
  revalidatePath("/requests");
  revalidatePath("/chats");
}

export async function cancelFriendRequest(friendshipId: string) {
  const { supabase } = await currentUserId();

  const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);

  if (error) throw new Error(error.message);
  revalidatePath("/requests");
}
