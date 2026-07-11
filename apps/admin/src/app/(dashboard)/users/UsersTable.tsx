"use client";

import { useState, useTransition } from "react";
import { bulkDeleteUnverified, deleteUser, verifyUserManually } from "@/app/actions/users";

type Row = {
  id: string;
  display_name: string;
  personal_email: string | null;
  college_email: string | null;
  batch: number | null;
  is_verified: boolean;
  created_at: string;
};

export function UsersTable({ rows }: { rows: Row[] }) {
  const [selected, setSelected] = useState(new Set<string>());
  const [pending, startTransition] = useTransition();

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  return (
    <div>
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-lg bg-brand-50 px-3 py-2 text-sm">
          <span>{selected.size} selected</span>
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                if (confirm(`Delete ${selected.size} account(s)? This cannot be undone.`)) {
                  await bulkDeleteUnverified(Array.from(selected));
                  setSelected(new Set());
                }
              })
            }
            className="rounded-md bg-red-600 px-3 py-1 text-white disabled:opacity-50"
          >
            Delete selected
          </button>
        </div>
      )}

      <table className="w-full text-left text-sm">
        <thead className="text-slate-500">
          <tr className="border-b border-slate-200">
            <th className="w-8 py-2"></th>
            <th className="py-2">Name</th>
            <th className="py-2">Email</th>
            <th className="py-2">Batch</th>
            <th className="py-2">Status</th>
            <th className="py-2">Joined</th>
            <th className="py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-100">
              <td className="py-2">
                <input
                  type="checkbox"
                  checked={selected.has(row.id)}
                  onChange={() => toggle(row.id)}
                />
              </td>
              <td className="py-2 font-medium text-slate-800">{row.display_name}</td>
              <td className="py-2 text-slate-500">{row.college_email ?? row.personal_email}</td>
              <td className="py-2">{row.batch ?? "-"}</td>
              <td className="py-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    row.is_verified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {row.is_verified ? "Verified" : "Unverified"}
                </span>
              </td>
              <td className="py-2 text-slate-500">
                {new Date(row.created_at).toLocaleDateString()}
              </td>
              <td className="py-2">
                <div className="flex gap-2">
                  {!row.is_verified && (
                    <button
                      disabled={pending}
                      onClick={() => startTransition(() => verifyUserManually(row.id))}
                      className="text-brand-600 hover:underline"
                    >
                      Verify
                    </button>
                  )}
                  <button
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        if (confirm(`Delete ${row.display_name}'s account?`)) {
                          await deleteUser(row.id);
                        }
                      })
                    }
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
