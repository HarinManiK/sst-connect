"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <form
        action={formAction}
        className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h1 className="text-lg font-semibold text-brand-700">SST Connect Admin</h1>
        <div className="mt-4">
          <label className="text-sm font-medium text-slate-700">Password</label>
          <input
            type="password"
            name="password"
            required
            autoFocus
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        {state?.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="mt-4 w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Checking..." : "Log in"}
        </button>
      </form>
    </div>
  );
}
