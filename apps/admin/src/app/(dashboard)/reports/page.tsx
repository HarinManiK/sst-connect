import { createAdminClient } from "@/lib/supabase/admin";
import { ReportActions } from "./ReportActions";

export default async function ReportsPage() {
  const supabase = createAdminClient();

  const { data: reports } = await supabase
    .from("reports")
    .select("id, target_type, target_id, reason, status, created_at, reporter:profiles!reports_reporter_id_fkey(display_name)")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  const rows = await Promise.all(
    (reports ?? []).map(async (r) => {
      let preview = "";
      let profileId: string | null = null;

      if (r.target_type === "post") {
        const { data: post } = await supabase
          .from("posts")
          .select("content, author_id")
          .eq("id", r.target_id)
          .single();
        preview = post?.content ?? "(no text / image post)";
        profileId = post?.author_id ?? null;
      } else if (r.target_type === "profile") {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", r.target_id)
          .single();
        preview = profile?.display_name ?? "";
        profileId = r.target_id;
      }

      return { ...r, preview, profileId };
    })
  );

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800">Reports</h1>

      <div className="mt-4 flex flex-col gap-3">
        {rows.length === 0 && <p className="text-sm text-slate-400">No open reports.</p>}
        {rows.map((r) => (
          <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>
                {r.target_type} · reported by{" "}
                {(r as unknown as { reporter?: { display_name: string }[] }).reporter?.[0]?.display_name ?? "unknown"}
              </span>
              <span>{new Date(r.created_at).toLocaleString()}</span>
            </div>
            <p className="mt-1 text-sm font-medium text-slate-800">Reason: {r.reason}</p>
            <p className="mt-1 rounded-lg bg-slate-50 p-2 text-sm text-slate-600">{r.preview}</p>
            <div className="mt-3">
              <ReportActions
                reportId={r.id}
                targetType={r.target_type}
                targetId={r.target_id}
                reportedProfileId={r.profileId}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
