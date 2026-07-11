import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { UsersTable } from "./UsersTable";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "unverified", label: "Unverified" },
  { value: "verified", label: "Verified" },
] as const;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status = "all", q = "" } = await searchParams;
  const supabase = createAdminClient();

  let query = supabase
    .from("profiles")
    .select("id, display_name, personal_email, college_email, batch, is_verified, created_at")
    .order("created_at", { ascending: false });

  if (status === "verified") query = query.eq("is_verified", true);
  if (status === "unverified") query = query.eq("is_verified", false);
  if (q) query = query.ilike("display_name", `%${q}%`);

  const { data: rows } = await query;

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800">Users</h1>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f.value}
              href={f.value === "all" ? "/users" : `/users?status=${f.value}`}
              className={`rounded-full px-3 py-1.5 text-sm ${
                status === f.value ? "bg-brand-600 text-white" : "bg-white border border-slate-200 text-slate-600"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        <form className="flex gap-2">
          <input type="hidden" name="status" value={status} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by name..."
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          />
          <button className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-white">Search</button>
        </form>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <UsersTable rows={rows ?? []} />
      </div>
    </div>
  );
}
