"use client";

import { useState, useTransition } from "react";
import {
  confirmCreatePost,
  confirmSendRequest,
  confirmUpdateProfile,
  type CopilotActionResult,
} from "@/app/actions/copilot";
import { Button } from "@/components/Button";
import { CheckIcon } from "@/components/Icons";

export type Action =
  | { type: "create_post"; content: string }
  | { type: "send_request"; person_id: string; person_name: string }
  | { type: "update_profile"; bio?: string; intent?: string; add_interests?: string[]; summary: string };

function describe(action: Action) {
  switch (action.type) {
    case "create_post":
      return { title: "Post this to the feed?", body: action.content };
    case "send_request":
      return { title: "Send a friend request?", body: `To ${action.person_name}` };
    case "update_profile": {
      const bits: string[] = [];
      if (action.bio !== undefined) bits.push(`Bio → "${action.bio}"`);
      if (action.intent) bits.push(`Looking for → ${action.intent}`);
      if (action.add_interests?.length) bits.push(`Add interests → ${action.add_interests.join(", ")}`);
      return { title: action.summary || "Update your profile?", body: bits.join("\n") };
    }
  }
}

async function run(action: Action): Promise<CopilotActionResult> {
  switch (action.type) {
    case "create_post":
      return confirmCreatePost(action.content);
    case "send_request":
      return confirmSendRequest(action.person_id);
    case "update_profile":
      return confirmUpdateProfile({
        bio: action.bio,
        intent: action.intent,
        add_interests: action.add_interests,
      });
  }
}

export function ActionCard({ action }: { action: Action }) {
  const [state, setState] = useState<"idle" | "done" | "cancelled">("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { title, body } = describe(action);

  if (state === "cancelled") {
    return <p className="text-xs text-slate-400">Cancelled.</p>;
  }

  return (
    <div className="card border-brand-200 p-3.5">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {body && (
        <p className="mt-1.5 whitespace-pre-wrap rounded-lg bg-brand-50/60 p-2.5 text-sm text-slate-600">
          {body}
        </p>
      )}

      {state === "done" ? (
        <p className="mt-2.5 flex items-center gap-1.5 text-sm font-medium text-emerald-600">
          <CheckIcon className="text-base" /> Done
        </p>
      ) : (
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const res = await run(action);
                if (res.ok) setState("done");
                else setError(res.error ?? "Something went wrong.");
              })
            }
          >
            {pending ? "Working..." : "Confirm"}
          </Button>
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => setState("cancelled")}>
            Cancel
          </Button>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
