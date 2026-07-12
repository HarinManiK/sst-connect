"use client";

import { useState, useTransition } from "react";
import { sendFriendRequest } from "@/app/actions/friends";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { CheckIcon } from "@/components/Icons";

export function ProfileResultCard({
  id,
  displayName,
  avatarUrl,
  batch,
  branch,
  bio,
  interests,
}: {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  batch: number | null;
  branch: string | null;
  bio: string | null;
  interests: string[];
}) {
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="card p-3.5">
      <div className="flex items-center gap-3">
        <Avatar name={displayName} src={avatarUrl} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-800">{displayName}</p>
          <p className="text-xs text-slate-400">
            {[batch ? `Batch ${batch}` : null, branch].filter(Boolean).join(" · ") || "SST"}
          </p>
        </div>
        <Button
          variant={sent ? "secondary" : "primary"}
          size="sm"
          disabled={sent || pending}
          onClick={() =>
            startTransition(async () => {
              await sendFriendRequest(id);
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
      {bio && <p className="mt-2.5 text-sm leading-relaxed text-slate-600">{bio}</p>}
      {interests.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {interests.map((i) => (
            <span
              key={i}
              className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-600"
            >
              {i}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
