"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  sendFriendRequest,
  respondToFriendRequest,
  cancelFriendRequest,
} from "@/app/actions/friends";
import { Button } from "@/components/Button";
import { CheckIcon } from "@/components/Icons";

export type FriendStatus = "none" | "outgoing" | "incoming" | "friends";

export function PersonAction({
  personId,
  status,
  friendshipId,
}: {
  personId: string;
  status: FriendStatus;
  friendshipId: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [localStatus, setLocalStatus] = useState<FriendStatus>(status);

  if (localStatus === "friends") {
    return (
      <Link href={`/chats/${personId}`}>
        <Button variant="secondary" size="sm">
          Message
        </Button>
      </Link>
    );
  }

  if (localStatus === "outgoing") {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            if (friendshipId) await cancelFriendRequest(friendshipId);
            setLocalStatus("none");
          })
        }
      >
        Requested
      </Button>
    );
  }

  if (localStatus === "incoming") {
    return (
      <div className="flex gap-1.5">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              if (friendshipId) await respondToFriendRequest(friendshipId, "accepted");
              setLocalStatus("friends");
            })
          }
        >
          Accept
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              if (friendshipId) await respondToFriendRequest(friendshipId, "declined");
              setLocalStatus("none");
            })
          }
        >
          Decline
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await sendFriendRequest(personId);
          setLocalStatus("outgoing");
        })
      }
    >
      {pending ? "…" : "Add"}
    </Button>
  );
}

export function SentBadge() {
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
      <CheckIcon className="text-sm" /> Sent
    </span>
  );
}
