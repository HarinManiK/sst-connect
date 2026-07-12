import { createClient } from "@/lib/supabase/server";
import { AppBar } from "@/components/AppBar";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { PeopleIcon } from "@/components/Icons";
import { RequestActions } from "./RequestActions";

type ProfileStub = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  batch: number | null;
};

export default async function RequestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: incoming } = await supabase
    .from("friendships")
    .select("id, created_at, requester:profiles!friendships_requester_id_fkey(id, display_name, avatar_url, batch)")
    .eq("addressee_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .returns<{ id: string; created_at: string; requester: ProfileStub }[]>();

  const { data: outgoing } = await supabase
    .from("friendships")
    .select("id, created_at, addressee:profiles!friendships_addressee_id_fkey(id, display_name, avatar_url, batch)")
    .eq("requester_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .returns<{ id: string; created_at: string; addressee: ProfileStub }[]>();

  const nothing = (!incoming || incoming.length === 0) && (!outgoing || outgoing.length === 0);

  function Row({ p, actions }: { p: ProfileStub; actions: React.ReactNode }) {
    return (
      <div className="card flex items-center gap-3 p-3">
        <Avatar name={p.display_name} src={p.avatar_url} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-800">{p.display_name}</p>
          <p className="text-xs text-slate-400">{p.batch ? `Batch ${p.batch}` : "SST"}</p>
        </div>
        {actions}
      </div>
    );
  }

  return (
    <div>
      <AppBar title="Requests" />

      {nothing ? (
        <EmptyState
          icon={<PeopleIcon />}
          title="No requests yet"
          subtitle="When someone wants to connect, they'll show up here."
          actionLabel="Find people"
          actionHref="/discover"
        />
      ) : (
        <div className="flex flex-col gap-6 p-4">
          {incoming && incoming.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Incoming
              </h2>
              {incoming.map((req) => (
                <Row
                  key={req.id}
                  p={req.requester}
                  actions={<RequestActions friendshipId={req.id} mode="incoming" />}
                />
              ))}
            </section>
          )}

          {outgoing && outgoing.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Sent
              </h2>
              {outgoing.map((req) => (
                <Row
                  key={req.id}
                  p={req.addressee}
                  actions={<RequestActions friendshipId={req.id} mode="outgoing" />}
                />
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
