import Link from "next/link";
import type { ReactNode } from "react";

// Friendly dead-end: an icon, a line, and (optionally) a next action.
export function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  actionHref,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-2xl text-brand-500">
        {icon}
      </div>
      <p className="mt-4 font-medium text-slate-700">{title}</p>
      {subtitle && <p className="mt-1 max-w-xs text-sm text-slate-400">{subtitle}</p>}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="tap mt-5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}
