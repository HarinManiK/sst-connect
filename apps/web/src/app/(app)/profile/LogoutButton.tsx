"use client";

import { logout } from "@/app/actions/auth";

export function LogoutButton() {
  return (
    <button
      onClick={() => logout()}
      className="tap rounded-lg px-2 py-1 text-sm font-medium text-rose-600"
    >
      Log out
    </button>
  );
}
