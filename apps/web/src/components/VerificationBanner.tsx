import Link from "next/link";
import { VERIFICATION_DEADLINE } from "@/lib/constants";

export function VerificationBanner() {
  const daysLeft = Math.max(
    0,
    Math.ceil((VERIFICATION_DEADLINE.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  return (
    <Link
      href="/profile"
      className="tap flex items-center justify-center gap-2 bg-brand-600 px-4 py-2 text-center text-xs font-medium text-white"
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/80" />
      Link your Scaler email — {daysLeft} day{daysLeft === 1 ? "" : "s"} left
    </Link>
  );
}
