"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileFormState } from "@/app/actions/profile";

type Profile = {
  display_name: string;
  bio: string | null;
  branch: string | null;
  hostel_block: string | null;
  intent: string;
  batch: number | null;
  is_verified: boolean;
};

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(
    updateProfile,
    undefined
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div>
        <label className="text-sm font-medium text-slate-700">Name</label>
        <input
          name="displayName"
          defaultValue={profile.display_name}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">Bio</label>
        <textarea
          name="bio"
          defaultValue={profile.bio ?? ""}
          rows={2}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-slate-700">Branch</label>
          <input
            name="branch"
            defaultValue={profile.branch ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Hostel block</label>
          <input
            name="hostelBlock"
            defaultValue={profile.hostel_block ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {!profile.is_verified && (
        <div>
          <label className="text-sm font-medium text-slate-700">Batch (self-reported)</label>
          <input
            name="batch"
            type="number"
            min={1}
            defaultValue={profile.batch ?? ""}
            placeholder="e.g. 4"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-slate-400">
            Overwritten automatically once you link your Scaler email.
          </p>
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-slate-700">Looking for</label>
        <select
          name="intent"
          defaultValue={profile.intent}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="friends">Friends</option>
          <option value="dating">Dating</option>
          <option value="either">Either</option>
        </select>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
