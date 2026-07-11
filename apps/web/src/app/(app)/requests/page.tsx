import { createClient } from "@/lib/supabase/server";
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

  return (
    <div className="p-4 flex flex-col gap-6">
      <section>
        <h1 className="text-lg font-semibold text-brand-700">Friend requests</h1>
        <div className="mt-3 flex flex-col gap-2">
          {(!incoming || incoming.length === 0) && (
            <p className="text-sm text-slate-400">No pending requests.</p>
          )}
          {incoming?.map((req) => (
            <div
              key={req.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
            >
              <div>
                <p className="font-medium text-slate-800">{req.requester.display_name}</p>
                {req.requester.batch && (
                  <p className="text-xs text-slate-400">Batch {req.requester.batch}</p>
                )}
              </div>
              <RequestActions friendshipId={req.id} mode="incoming" />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-500">Sent</h2>
        <div className="mt-3 flex flex-col gap-2">
          {(!outgoing || outgoing.length === 0) && (
            <p className="text-sm text-slate-400">No outgoing requests.</p>
          )}
          {outgoing?.map((req) => (
            <div
              key={req.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
            >
              <div>
                <p className="font-medium text-slate-800">{req.addressee.display_name}</p>
                {req.addressee.batch && (
                  <p className="text-xs text-slate-400">Batch {req.addressee.batch}</p>
                )}
              </div>
              <RequestActions friendshipId={req.id} mode="outgoing" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
