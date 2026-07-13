"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const TABS = ["/feed", "/copilot", "/chats", "/people", "/profile"];

// Warms the RSC payload for every tab right after the first screen loads,
// so switching between Feed/Copilot/Chats/People/Profile is instant instead
// of waiting on a fresh server round-trip each time.
export function Prefetcher() {
  const router = useRouter();
  useEffect(() => {
    for (const path of TABS) router.prefetch(path);
  }, [router]);
  return null;
}
