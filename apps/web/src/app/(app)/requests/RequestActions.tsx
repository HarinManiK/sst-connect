"use client";

import { useTransition } from "react";
import { cancelFriendRequest, respondToFriendRequest } from "@/app/actions/friends";
import { Button } from "@/components/Button";

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
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(() => cancelFriendRequest(friendshipId))}
      >
        Cancel
      </Button>
    );
  }

  return (
    <div className="flex gap-1.5">
      <Button
        size="sm"
        disabled={pending}
        onClick={() => startTransition(() => respondToFriendRequest(friendshipId, "accepted"))}
      >
        Accept
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(() => respondToFriendRequest(friendshipId, "declined"))}
      >
        Decline
      </Button>
    </div>
  );
}
