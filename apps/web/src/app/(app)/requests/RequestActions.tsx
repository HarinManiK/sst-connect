"use client";

import { useTransition } from "react";
import { cancelFriendRequest, respondToFriendRequest } from "@/app/actions/friends";

export function RequestActions({
  friendshipId,
  mode,
}: {
  friendshipId: string;
  mode: "incoming" | "outgoing";
}) {
  const [pending, startTransition] = useTransition();

  if (mode === "outgoing") {
    return (
      <button
        disabled={pending}
        onClick={() => startTransition(() => cancelFriendRequest(friendshipId))}
        className="text-sm text-slate-400 hover:text-red-600 disabled:opacity-50"
      >
        Cancel
      </button>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        disabled={pending}
        onClick={() => startTransition(() => respondToFriendRequest(friendshipId, "accepted"))}
        className="rounded-md bg-brand-600 px-3 py-1 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
      >
        Accept
      </button>
      <button
        disabled={pending}
        onClick={() => startTransition(() => respondToFriendRequest(friendshipId, "declined"))}
        className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-500 hover:bg-slate-50 disabled:opacity-50"
      >
        Decline
      </button>
    </div>
  );
}
