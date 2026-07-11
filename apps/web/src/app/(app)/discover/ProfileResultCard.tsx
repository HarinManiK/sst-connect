"use client";

import { useState, useTransition } from "react";
import { sendFriendRequest } from "@/app/actions/friends";

export function ProfileResultCard({
  id,
  displayName,
  batch,
  branch,
  bio,
  interests,
}: {
  id: string;
  displayName: string;
  batch: number | null;
  branch: string | null;
  bio: string | null;
  interests: string[];
}) {
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-800">{displayName}</p>
          <p className="text-xs text-slate-400">
            {[batch ? `Batch ${batch}` : null, branch].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>
      {bio && <p className="mt-2 text-sm text-slate-600">{bio}</p>}
      {interests.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {interests.map((i) => (
            <span key={i} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              {i}
            </span>
          ))}
        </div>
      )}
      <button
        disabled={sent || pending}
        onClick={() => startTransition(async () => {
          await sendFriendRequest(id);
          setSent(true);
        })}
        className="mt-2 rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
      >
        {sent ? "Request sent" : "Add friend"}
      </button>
    </div>
  );
}
