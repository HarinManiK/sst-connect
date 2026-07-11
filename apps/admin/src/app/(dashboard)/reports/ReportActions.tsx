"use client";

import { useTransition } from "react";
import { banReportedUser, dismissReport, removeReportedPost } from "@/app/actions/reports";

export function ReportActions({
  reportId,
  targetType,
  targetId,
  reportedProfileId,
}: {
  reportId: string;
  targetType: string;
  targetId: string;
  reportedProfileId: string | null;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      <button
        disabled={pending}
        onClick={() => startTransition(() => dismissReport(reportId))}
        className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-600"
      >
        Dismiss
      </button>
      {targetType === "post" && (
        <button
          disabled={pending}
          onClick={() => startTransition(() => removeReportedPost(reportId, targetId))}
          className="rounded-md bg-amber-600 px-3 py-1 text-sm text-white"
        >
          Remove post
        </button>
      )}
      {reportedProfileId && (
        <button
          disabled={pending}
          onClick={() => {
            if (confirm("Ban this user? Their account will be deactivated.")) {
              startTransition(() => banReportedUser(reportId, reportedProfileId));
            }
          }}
          className="rounded-md bg-red-600 px-3 py-1 text-sm text-white"
        >
          Ban user
        </button>
      )}
    </div>
  );
}
