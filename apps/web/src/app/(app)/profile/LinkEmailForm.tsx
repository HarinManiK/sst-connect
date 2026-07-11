"use client";

import { useActionState } from "react";
import { linkCollegeEmail, type ProfileFormState } from "@/app/actions/profile";

export function LinkEmailForm() {
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(
    linkCollegeEmail,
    undefined
  );

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-xl bg-brand-50 p-3">
      <label className="text-sm font-medium text-brand-800">Link your Scaler email</label>
      <input
        name="collegeEmail"
        type="email"
        placeholder="firstname.25bcsXXXXX@sst.scaler.com"
        className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm"
      />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-700">{state.success}</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Sending..." : "Send confirmation link"}
      </button>
    </form>
  );
}
