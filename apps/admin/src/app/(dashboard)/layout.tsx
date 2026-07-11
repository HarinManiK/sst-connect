import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin-email";
import { logout } from "@/app/actions/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Anyone else who ends up here -- expired session, guessed a URL, whatever
  // -- gets a plain 404, not a "you're not allowed" page that confirms this
  // is an access-gated admin system.
  if (!user || !isAdminEmail(user.email)) {
    notFound();
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-slate-200 bg-white p-4">
        <p className="mb-6 font-semibold text-brand-700">SST Connect Admin</p>
        <nav className="flex flex-col gap-1 text-sm">
          <Link href="/users" className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100">
            Users
          </Link>
          <Link href="/reports" className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100">
            Reports
          </Link>
        </nav>
        <form action={logout} className="mt-8">
          <button className="text-sm text-red-600">Log out</button>
        </form>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
