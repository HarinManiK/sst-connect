"use client";

import { useState, useTransition } from "react";
import { setInterests } from "@/app/actions/profile";

export function InterestPicker({
  allInterests,
  initialSelected,
}: {
  allInterests: { id: string; name: string }[];
  initialSelected: string[];
}) {
  const [selected, setSelected] = useState(new Set(initialSelected));
  const [pending, startTransition] = useTransition();

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
    startTransition(() => setInterests(Array.from(next)));
  }

  return (
    <div className="flex flex-wrap gap-2">
      {allInterests.map((interest) => {
        const active = selected.has(interest.id);
        return (
          <button
            key={interest.id}
            type="button"
            disabled={pending}
            onClick={() => toggle(interest.id)}
            className={`rounded-full border px-3 py-1 text-sm transition ${
              active
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-slate-300 text-slate-600 hover:border-brand-300"
            }`}
          >
            {interest.name}
          </button>
        );
      })}
    </div>
  );
}
