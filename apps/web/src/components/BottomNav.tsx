"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, SparkleIcon, ChatIcon, PeopleIcon, UserIcon } from "@/components/Icons";

const TABS = [
  { href: "/feed", label: "Feed", Icon: HomeIcon },
  { href: "/copilot", label: "Copilot", Icon: SparkleIcon },
  { href: "/chats", label: "Chats", Icon: ChatIcon },
  { href: "/requests", label: "Requests", Icon: PeopleIcon },
  { href: "/profile", label: "Profile", Icon: UserIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/90 backdrop-blur-lg safe-bottom">
      <ul className="mx-auto flex max-w-md">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`tap flex flex-col items-center gap-1 py-2 ${
                  active ? "text-brand-600" : "text-slate-400"
                }`}
              >
                <Icon filled={active} className="text-[22px]" />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
