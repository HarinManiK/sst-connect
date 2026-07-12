import type { ReactNode } from "react";

// Sticky top bar for each tab. `title` can be the wordmark or a plain page
// title; `right` is an optional action slot.
export function AppBar({ title, right }: { title: ReactNode; right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-surface/85 px-4 py-3 backdrop-blur-lg">
      <div className="text-lg font-bold tracking-tight text-slate-900">{title}</div>
      {right}
    </header>
  );
}

export function Wordmark() {
  return (
    <span>
      SST <span className="text-brand-600">Connect</span>
    </span>
  );
}
