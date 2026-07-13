import { createClient } from "@/lib/supabase/server";
import { PeopleClient, type PersonLite, type IncomingReq } from "./PeopleClient";
import type { FriendStatus } from "./PersonAction";

type EveryoneRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  batch: number | null;
  branch: string | null;
};
type FriendRow = { id: string; status: string; requester_id: string; addressee_id: string };
type IncomingRow = {
  id: string;
  requester: { id: string; display_name: string; avatar_url: string | null; batch: number | null; branch: string | null } | null;
};

export default async function PeoplePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [everyoneRes, friendshipsRes, incomingRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url, batch, branch")
      .eq("discoverable", true)
      .is("deleted_at", null)
      .neq("id", user.id)
      .order("display_name", { ascending: true })
      .returns<EveryoneRow[]>(),
    supabase
      .from("friendships")
      .select("id, status, requester_id, addressee_id")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .returns<FriendRow[]>(),
    supabase
      .from("friendships")
      .select("id, requester:profiles!friendships_requester_id_fkey(id, display_name, avatar_url, batch, branch)")
      .eq("addressee_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .returns<IncomingRow[]>(),
  ]);

  const rel = new Map<string, { status: FriendStatus; friendshipId: string }>();
  for (const f of friendshipsRes.data ?? []) {
    const other = f.requester_id === user.id ? f.addressee_id : f.requester_id;
    let status: FriendStatus;
    if (f.status === "accepted") status = "friends";
    else if (f.status === "pending") status = f.requester_id === user.id ? "outgoing" : "incoming";
    else continue;
    rel.set(other, { status, friendshipId: f.id });
  }

  const people: PersonLite[] = (everyoneRes.data ?? []).map((p) => ({
    id: p.id,
    name: p.display_name,
    avatar: p.avatar_url,
    batch: p.batch,
    branch: p.branch,
    status: rel.get(p.id)?.status ?? "none",
    friendshipId: rel.get(p.id)?.friendshipId ?? null,
  }));

  const incoming: IncomingReq[] = (incomingRes.data ?? [])
    .filter((r) => r.requester)
    .map((r) => ({
      friendshipId: r.id,
      person: {
        id: r.requester!.id,
        name: r.requester!.display_name,
        avatar: r.requester!.avatar_url,
        batch: r.requester!.batch,
        branch: r.requester!.branch,
      },
    }));

  return <PeopleClient people={people} incoming={incoming} />;
}
