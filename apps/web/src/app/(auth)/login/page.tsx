"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GoogleIcon, SparkleIcon } from "@/components/Icons";

export default function LoginPage() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  async function handleGoogleSignIn() {
    setError(null);
    setPending(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setError(error.message);
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-brand-600 to-brand-800 text-white">
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/15 backdrop-blur">
          <SparkleIcon className="text-4xl" />
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight">SST Connect</h1>
        <p className="mt-2 max-w-xs text-sm text-white/80">
          Meet your batch. Find people who get you — as friends or something more.
        </p>
      </div>

      <div className="rounded-t-3xl bg-surface px-6 pb-10 pt-8 text-slate-900">
        <button
          onClick={handleGoogleSignIn}
          disabled={pending}
          className="tap flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-white px-4 py-3.5 font-medium text-slate-700 shadow-sm disabled:opacity-60"
        >
          <GoogleIcon className="text-xl" />
          {pending ? "Redirecting..." : "Continue with Google"}
        </button>

        <p className="mt-4 text-center text-xs text-slate-400">
          Use your Scaler Google account. Don&apos;t have it yet? Any Google account works for
          now — link your Scaler email later.
        </p>

        {error && (
          <p className="mt-3 text-center text-sm text-rose-600" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
