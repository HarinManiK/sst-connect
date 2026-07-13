import { createClient } from "@/lib/supabase/server";
import { AppBar } from "@/components/AppBar";
import { CheckIcon } from "@/components/Icons";
import { AvatarEditor } from "./AvatarEditor";
import { ProfileForm } from "./ProfileForm";
import { LinkEmailForm } from "./LinkEmailForm";
import { InterestPicker } from "./InterestPicker";
import { LogoutButton } from "./LogoutButton";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "display_name, avatar_url, bio, branch, hostel_block, intent, batch, is_verified, college_email, personal_email"
    )
    .eq("id", user.id)
    .single();

  const { data: allInterests } = await supabase.from("interests").select("id, name").order("name");
  const { data: myInterests } = await supabase
    .from("profile_interests")
    .select("interest_id")
    .eq("profile_id", user.id);

  if (!profile) return null;

  const meta = [profile.batch ? `Batch ${profile.batch}` : null, profile.branch]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      <AppBar title="Profile" right={<LogoutButton />} />

      <div className="flex flex-col items-center px-4 pt-6 text-center">
        <AvatarEditor name={profile.display_name} initialUrl={profile.avatar_url} />
        <h1 className="mt-3 text-xl font-bold text-slate-900">{profile.display_name}</h1>
        <p className="text-sm text-slate-400">{meta || "SST Connect"}</p>

        {profile.is_verified ? (
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600">
            <CheckIcon className="text-sm" /> Verified
          </span>
        ) : (
          <span className="mt-2 inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-600">
            Not verified
          </span>
        )}

        {profile.bio && (
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-600">{profile.bio}</p>
        )}
      </div>

      <div className="flex flex-col gap-5 p-4">
        {!profile.is_verified && <LinkEmailForm />}

        <section>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Interests
          </h2>
          <div className="card p-3">
            <InterestPicker
              allInterests={allInterests ?? []}
              initialSelected={(myInterests ?? []).map((i) => i.interest_id)}
            />
          </div>
        </section>

        <section>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Edit profile
          </h2>
          <div className="card p-4">
            <ProfileForm profile={profile} />
          </div>
        </section>
      </div>
    </div>
  );
}
