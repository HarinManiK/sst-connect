"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileFormState } from "@/app/actions/profile";
import { PROGRAMS, HOSTELS } from "@/lib/profile-options";
import { Button } from "@/components/Button";

type Profile = {
  display_name: string;
  bio: string | null;
  branch: string | null;
  hostel_block: string | null;
};

const inputClass =
  "mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(
    updateProfile,
    undefined
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className="text-sm font-medium text-slate-700">Name</label>
        <input name="displayName" defaultValue={profile.display_name} className={inputClass} />
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">Bio</label>
        <textarea
          name="bio"
          defaultValue={profile.bio ?? ""}
          rows={3}
          placeholder="Tell people a bit about yourself…"
          className={`${inputClass} resize-none`}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">Program</label>
        <select name="program" defaultValue={profile.branch ?? ""} className={inputClass}>
          <option value="" disabled>
            Select your program
          </option>
          {PROGRAMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">Hostel</label>
        <select name="hostel" defaultValue={profile.hostel_block ?? ""} className={inputClass}>
          <option value="" disabled>
            Select your hostel
          </option>
          {HOSTELS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
      </div>

      {state?.error && <p className="text-sm text-rose-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-600">{state.success}</p>}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
