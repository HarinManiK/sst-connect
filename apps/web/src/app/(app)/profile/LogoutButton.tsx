"use client";

import { logout } from "@/app/actions/auth";

export function LogoutButton() {
  return (
    <button
      onClick={() => logout()}
      className="text-sm font-medium text-red-600"
    >
      Log out
    </button>
  );
}
