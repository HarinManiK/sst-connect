"use client";

import { PersonAction, type FriendStatus } from "../PersonAction";

// Thin wrapper so the person profile page can drop in the same relationship
// action logic used in the People list.
export function ProfileActions({
  personId,
  status,
  friendshipId,
}: {
  personId: string;
  status: FriendStatus;
  friendshipId: string | null;
}) {
  return <PersonAction personId={personId} status={status} friendshipId={friendshipId} />;
}
