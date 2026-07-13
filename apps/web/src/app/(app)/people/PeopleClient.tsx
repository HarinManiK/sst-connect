"use client";

import { useState } from "react";
import Link from "next/link";
import { AppBar } from "@/components/AppBar";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { PeopleIcon } from "@/components/Icons";
import { PersonAction, type FriendStatus } from "./PersonAction";

export type PersonLite = {
  id: string;
  name: string;
  avatar: string | null;
  batch: number | null;
  branch: string | null;
  status: FriendStatus;
  friendshipId: string | null;
};

export type IncomingReq = {
  friendshipId: string;
  person: { id: string; name: string; avatar: string | null; batch: number | null; branch: string | null };
};

function meta(batch: number | null, branch: string | null) {
  return [batch ? `Batch ${batch}` : null, branch].filter(Boolean).join(" · ") || "SST";
}

export function PeopleClient({
  people,
  incoming,
}: {
  people: PersonLite[];
  incoming: IncomingReq[];
}) {
  const [tab, setTab] = useState<"find" | "requests">("find");
  const [q, setQ] = useState("");

  const filtered = q.trim()
    ? people.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()))
    : people;

  return (
    <div>
      <AppBar title="People" />

      <div className="sticky top-[57px] z-10 flex gap-2 border-b border-border bg-background/85 px-4 py-2.5 backdrop-blur-lg">
        {(["find", "requests"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`tap rounded-full px-4 py-1.5 text-sm font-medium capitalize ${
              tab === t ? "bg-brand-600 text-white shadow-sm" : "border border-border bg-surface text-slate-600"
            }`}
          >
            {t === "requests" && incoming.length > 0 ? `Requests (${incoming.length})` : t}
          </button>
        ))}
      </div>

      {tab === "find" ? (
        <div>
          <div className="px-4 pt-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search people by name…"
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={<PeopleIcon />} title="No one found" subtitle="Try a different name." />
          ) : (
            <ul className="mt-2">
              {filtered.map((p) => (
                <li key={p.id} className="flex items-center gap-3 border-b border-border px-4 py-3">
                  <Link href={`/people/${p.id}`} className="tap flex min-w-0 flex-1 items-center gap-3">
                    <Avatar name={p.name} src={p.avatar} size={46} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-400">{meta(p.batch, p.branch)}</p>
                    </div>
                  </Link>
                  <PersonAction personId={p.id} status={p.status} friendshipId={p.friendshipId} />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : incoming.length === 0 ? (
        <EmptyState
          icon={<PeopleIcon />}
          title="No requests"
          subtitle="When someone adds you, it'll show up here."
        />
      ) : (
        <ul className="mt-1">
          {incoming.map((r) => (
            <li key={r.friendshipId} className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Link href={`/people/${r.person.id}`} className="tap flex min-w-0 flex-1 items-center gap-3">
                <Avatar name={r.person.name} src={r.person.avatar} size={46} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-800">{r.person.name}</p>
                  <p className="text-xs text-slate-400">{meta(r.person.batch, r.person.branch)}</p>
                </div>
              </Link>
              <PersonAction personId={r.person.id} status="incoming" friendshipId={r.friendshipId} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
