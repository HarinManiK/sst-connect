"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup } from "@/app/actions/auth";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, undefined);

  return (
    <div className="flex flex-1 flex-col justify-center px-6 py-12 max-w-sm mx-auto w-full">
      <h1 className="text-2xl font-semibold text-brand-700">Join SST Connect</h1>
      <p className="mt-1 text-sm text-slate-500">
        Have your Scaler mail? Use it below and everything (batch, year) fills
        in automatically. Don&apos;t have it yet? Any email works for now.
      </p>

      <form action={formAction} className="mt-8 flex flex-col gap-4">
        <div>
          <label htmlFor="displayName" className="text-sm font-medium text-slate-700">
            Name
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
        <div>
          <label htmlFor="email" className="text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@sst.scaler.com or personal email"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
        <div>
          <label htmlFor="password" className="text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>

        {state?.error && (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-600">
          Log in
        </Link>
      </p>
    </div>
  );
}
