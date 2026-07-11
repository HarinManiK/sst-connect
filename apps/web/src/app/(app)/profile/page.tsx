import { createClient } from "@/lib/supabase/server";
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
      "display_name, bio, branch, hostel_block, intent, batch, is_verified, college_email, personal_email"
    )
    .eq("id", user.id)
    .single();

  const { data: allInterests } = await supabase.from("interests").select("id, name").order("name");

  const { data: myInterests } = await supabase
    .from("profile_interests")
    .select("interest_id")
    .eq("profile_id", user.id);

  if (!profile) return null;

  return (
    <div className="p-4 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-brand-700">Your profile</h1>
        <LogoutButton />
      </div>

      {profile.is_verified ? (
        <p className="text-sm text-slate-500">
          Verified via <span className="font-medium text-slate-700">{profile.college_email}</span>
          {profile.batch && ` -- Batch ${profile.batch}`}
        </p>
      ) : (
        <LinkEmailForm />
      )}

      <ProfileForm profile={profile} />

      <div>
        <h2 className="text-sm font-semibold text-slate-500 mb-2">Interests</h2>
        <InterestPicker
          allInterests={allInterests ?? []}
          initialSelected={(myInterests ?? []).map((i) => i.interest_id)}
        />
      </div>
    </div>
  );
}
