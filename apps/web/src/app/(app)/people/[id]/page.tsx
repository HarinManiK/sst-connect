import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { BackIcon } from "@/components/Icons";
import { ProfileActions } from "./ProfileActions";
import type { FriendStatus } from "../PersonAction";

type PersonRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  batch: number | null;
  branch: string | null;
  hostel_block: string | null;
  bio: string | null;
  profile_interests: { interests: { name: string } | null }[];
};
type FriendRow = { id: string; status: string; requester_id: string; addressee_id: string };

export default async function PersonProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  if (id === user.id) redirect("/profile");

  const { data: person } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, batch, branch, hostel_block, bio, profile_interests(interests(name))")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle<PersonRow>();

  if (!person) notFound();

  const { data: f } = await supabase
    .from("friendships")
    .select("id, status, requester_id, addressee_id")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${user.id})`
    )
    .maybeSingle<FriendRow>();

  let status: FriendStatus = "none";
  let friendshipId: string | null = null;
  if (f) {
    friendshipId = f.id;
    if (f.status === "accepted") status = "friends";
    else if (f.status === "pending") status = f.requester_id === user.id ? "outgoing" : "incoming";
  }

  const interests = (person.profile_interests ?? [])
    .map((pi) => pi.interests?.name)
    .filter((n): n is string => Boolean(n));
  const meta = [person.batch ? `Batch ${person.batch}` : null, person.branch]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-surface/85 px-3 py-3 backdrop-blur-lg">
        <Link href="/people" className="tap flex h-9 w-9 items-center justify-center rounded-full text-slate-600">
          <BackIcon className="text-xl" />
        </Link>
        <h1 className="text-lg font-bold tracking-tight">Profile</h1>
      </header>

      <div className="flex flex-col items-center px-4 pt-6 text-center">
        <Avatar name={person.display_name} src={person.avatar_url} size={92} />
        <h2 className="mt-3 text-xl font-bold text-slate-900">{person.display_name}</h2>
        {meta && <p className="text-sm text-slate-400">{meta}</p>}
        {person.hostel_block && <p className="text-xs text-slate-400">{person.hostel_block}</p>}
        {person.bio && (
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-600">{person.bio}</p>
        )}

        <div className="mt-4">
          <ProfileActions personId={person.id} status={status} friendshipId={friendshipId} />
        </div>
      </div>

      {interests.length > 0 && (
        <div className="p-4">
          <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Interests
          </h3>
          <div className="flex flex-wrap gap-2">
            {interests.map((i) => (
              <span
                key={i}
                className="rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-600"
              >
                {i}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
