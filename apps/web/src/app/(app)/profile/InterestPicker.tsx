"use client";

import { useState, useTransition } from "react";
import { setInterest } from "@/app/actions/profile";

// One tap toggles a single interest: local state flips instantly
// (optimistic) and the server syncs that one row. No more flaky deselect.
export function InterestPicker({
  allInterests,
  initialSelected,
}: {
  allInterests: { id: string; name: string }[];
  initialSelected: string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialSelected));
  const [, startTransition] = useTransition();

  function toggle(id: string) {
    const on = !selected.has(id);
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
    startTransition(() => {
      setInterest(id, on);
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {allInterests.map((interest) => {
        const active = selected.has(interest.id);
        return (
          <button
            key={interest.id}
            type="button"
            onClick={() => toggle(interest.id)}
            className={`tap rounded-full border px-3 py-1.5 text-sm font-medium ${
              active
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-border bg-surface text-slate-600"
            }`}
          >
            {interest.name}
          </button>
        );
      })}
    </div>
  );
}
