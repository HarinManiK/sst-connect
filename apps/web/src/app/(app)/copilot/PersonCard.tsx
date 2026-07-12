"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { sendFriendRequest } from "@/app/actions/friends";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { CheckIcon } from "@/components/Icons";

export type PersonCardData = {
  id: string;
  name: string;
  avatar_url: string | null;
  batch: number | null;
  branch: string | null;
  bio: string | null;
  interests: string[];
};

export function PersonCard({ person }: { person: PersonCardData }) {
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="card p-3.5">
      <div className="flex items-center gap-3">
        <Avatar name={person.name} src={person.avatar_url} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-800">{person.name}</p>
          <p className="text-xs text-slate-400">
            {[person.batch ? `Batch ${person.batch}` : null, person.branch]
              .filter(Boolean)
              .join(" · ") || "SST"}
          </p>
        </div>
        <Button
          variant={sent ? "secondary" : "primary"}
          size="sm"
          disabled={sent || pending}
          onClick={() =>
            startTransition(async () => {
              await sendFriendRequest(person.id);
              setSent(true);
            })
          }
        >
          {sent ? (
            <>
              <CheckIcon className="text-sm" /> Sent
            </>
          ) : (
            "Add"
          )}
        </Button>
      </div>
      {person.bio && <p className="mt-2.5 text-sm leading-relaxed text-slate-600">{person.bio}</p>}
      {person.interests.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {person.interests.map((i) => (
            <span
              key={i}
              className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-600"
            >
              {i}
            </span>
          ))}
        </div>
      )}
      <Link
        href={`/chats/${person.id}`}
        className="mt-2 inline-block text-xs font-medium text-slate-400"
      >
        View in chats →
      </Link>
    </div>
  );
}
